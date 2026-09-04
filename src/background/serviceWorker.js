import { GoogleGenAI } from '@google/genai';
import { isAbortError } from '../core/errorContract.js';
import { abortableDelay, createRequestLifecycle, throwIfAborted } from '../core/requestLifecycle.js';
import { CHAT_REQUEST, CLEAR_HISTORY, toGeminiHistory, toProviderMessages, validateChatRequest } from '../core/sessionProtocol.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Navix AI installed (Manifest V3)');
  // Enable side panel to open on extension icon click
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
});

// Configure tools for Gemini
const browserTools = [{
  functionDeclarations: [
    {
      name: "navigate",
      description: "Navigates the active browser tab to a specified URL.",
      parameters: {
        type: "OBJECT",
        properties: {
          url: { type: "STRING", description: "The full URL to navigate to (e.g., https://example.com)" }
        },
        required: ["url"]
      }
    },
    {
      name: "google_search",
      description: "Performs a Google search in the active tab.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING", description: "The search query" }
        },
        required: ["query"]
      }
    },
    {
      name: "read_page",
      description: "Reads the visible text content of the current web page.",
      parameters: {
        type: "OBJECT",
        properties: {},
        required: []
      }
    },
    {
      name: "click_element",
      description: "Clicks on an element on the current web page using a CSS selector.",
      parameters: {
        type: "OBJECT",
        properties: {
          selector: { type: "STRING", description: "The CSS selector of the element to click" }
        },
        required: ["selector"]
      }
    },
    {
      name: "type_text",
      description: "Types text into an input field on the current web page.",
      parameters: {
        type: "OBJECT",
        properties: {
          selector: { type: "STRING", description: "The CSS selector of the input field" },
          text: { type: "STRING", description: "The text to type" }
        },
        required: ["selector", "text"]
      }
    },
    {
      name: "press_enter",
      description: "Simulates pressing the Enter key on a specific input element. Useful for submitting search bars.",
      parameters: {
        type: "OBJECT",
        properties: {
          selector: { type: "STRING", description: "The CSS selector of the input element to press Enter on" }
        },
        required: ["selector"]
      }
    }
  ]
}];

async function executeTool(name, args, signal) {
  throwIfAborted(signal);
  return new Promise((resolve) => {
    let settled = false;
    let cleanupPendingAction = () => {};
    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanupPendingAction();
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => finish({ error: 'Action cancelled.' });
    signal?.addEventListener('abort', onAbort, { once: true });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (signal?.aborted) {
        finish({ error: 'Action cancelled.' });
        return;
      }
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        finish({ error: "No active tab found" });
        return;
      }

      function updateTabAndWait(tabId, updateProps, actionMsg) {
        chrome.tabs.update(tabId, updateProps, (tab) => {
          if (signal?.aborted) {
            finish({ error: 'Action cancelled.' });
            return;
          }
          if (chrome.runtime.lastError || !tab) {
            finish({ error: "Failed to load page" });
            return;
          }
          let completionDelay = null;
          const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              clearTimeout(fallback);
              completionDelay = setTimeout(() => finish({ success: true, message: `${actionMsg} successful` }), 1500); // Give content script time to inject
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          const fallback = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            finish({ success: true, message: `${actionMsg} timeout, but likely loaded` });
          }, 10000);
          cleanupPendingAction = () => {
            chrome.tabs.onUpdated.removeListener(listener);
            clearTimeout(fallback);
            if (completionDelay) clearTimeout(completionDelay);
          };
        });
      }

      if (name === "navigate") {
        updateTabAndWait(activeTab.id, { url: args.url }, `Navigated to ${args.url}`);
      } else if (name === "google_search") {
        const url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        updateTabAndWait(activeTab.id, { url }, `Searched Google for ${args.query}`);
      } else {
        // Send to content script for DOM manipulation (read, click, type)
        chrome.tabs.sendMessage(activeTab.id, { action: name, args }, (response) => {
          if (signal?.aborted) {
            finish({ error: 'Action cancelled.' });
            return;
          }
          if (chrome.runtime.lastError) {
             finish({ error: "Cannot communicate with page. It might be a protected page or refreshing." });
          } else {
             finish(response || { error: "No response from page" });
          }
        });
      }
    });
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    let activeRequest = null;
    port.onMessage.addListener(async (message) => {
      if (message.type === CHAT_REQUEST) {
        activeRequest?.abort();
        const lifecycle = createRequestLifecycle(port, message.requestId || null);
        activeRequest = lifecycle;
        try {
          const request = validateChatRequest(message);
          await handleAIRequestStream(request, lifecycle);
          lifecycle.complete();
        } catch (error) {
          if (!isAbortError(error)) {
            const errorMessage = error?.message || '';
            if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
              error.message = 'API Rate Limit Exceeded: You have reached your current quota limit for this model. Please wait a minute and try again, or switch to a different model in settings.';
            }
            lifecycle.fail(error);
          }
        } finally {
          if (activeRequest === lifecycle) activeRequest = null;
        }
      }
    });
  }
});

async function executeWithRetry(apiCall, lifecycle, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    throwIfAborted(lifecycle.signal);
    try {
      return await apiCall();
    } catch (error) {
      if (isAbortError(error) || lifecycle.signal.aborted) throw error;
      const errorMsg = error.message || '';
      const isRateLimit = error.status === 429 || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota') || error.status === 503 || errorMsg.includes('503') || error.status === 500 || errorMsg.includes('500') || errorMsg.includes('fetch');
      
      if (!isRateLimit || retries >= maxRetries - 1) {
        throw error;
      }
      
      let delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
      
      const retryMatch = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
      if (retryMatch) {
         delay = parseFloat(retryMatch[1]) * 1000 + 500; // Add 500ms buffer
      }
      
      lifecycle.post({ status: `Rate limit hit. Retrying in ${Math.round(delay/1000)}s...` });
      console.warn(`API Rate limit. Retrying in ${delay}ms...`, error);
      
      await abortableDelay(delay, lifecycle.signal);
      retries++;
    }
  }
}

async function fetchWithRetry(url, options, lifecycle, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    throwIfAborted(lifecycle.signal);
    try {
      const res = await fetch(url, { ...options, signal: lifecycle.signal });
      
      if (res.status === 429 || res.status === 503 || res.status === 500) {
        if (retries >= maxRetries - 1) {
          return res; 
        }
        
        let delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
        const retryAfter = res.headers.get('Retry-After');
        if (retryAfter) {
           const parsed = parseInt(retryAfter, 10);
           if (!isNaN(parsed)) delay = parsed * 1000 + 500;
        }
        
        lifecycle.post({ status: `Server busy (HTTP ${res.status}). Retrying in ${Math.round(delay/1000)}s...` });
        console.warn(`Fetch HTTP ${res.status}. Retrying in ${delay}ms...`);
        
        await abortableDelay(delay, lifecycle.signal);
        retries++;
        continue;
      }
      
      return res;
    } catch (err) {
      if (isAbortError(err) || lifecycle.signal.aborted) throw err;
      if (retries >= maxRetries - 1) throw err;
      const delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
      lifecycle.post({ status: `Network error. Retrying in ${Math.round(delay/1000)}s...` });
      console.warn(`Network error: ${err.message}. Retrying in ${delay}ms...`);
      await abortableDelay(delay, lifecycle.signal);
      retries++;
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === CLEAR_HISTORY) {
    sendResponse({ success: true, sessionId: message.sessionId || null });
    return false;
  }

  if (message.type === CHAT_REQUEST) {
    // Keep standard message listener working for old requests just in case, but we redirect logic 
    // to a pseudo-port so we don't duplicate code
    let responseText = '';
    let responseError = null;
    const pseudoPort = {
       postMessage: (msg) => {
          if (msg.chunk) responseText += msg.chunk;
          if (msg.error) responseError = msg.error;
          if (msg.done) {
            sendResponse(responseError
              ? { error: responseError }
              : { response: responseText || 'Action completed.' });
          }
       }
    };
    const lifecycle = createRequestLifecycle(pseudoPort, message.requestId || null);
    try {
      const request = validateChatRequest(message);
      handleAIRequestStream(request, lifecycle)
        .then(() => lifecycle.complete())
        .catch((error) => lifecycle.fail(error));
    } catch (error) {
      lifecycle.fail(error);
    }
    return true; 
  }
});

async function handleAIRequestStream(request, lifecycle) {
  const { message: userMessage, domContext, includeScreenshot, thinkMode, model, geminiApiKey, geminiModel, openAiApiKey, openAiModel, hfApiKey, hfModel, ollamaUrl, ollamaModel } = request;
  const { signal } = lifecycle;
  const post = (message) => lifecycle.post(message);
  throwIfAborted(signal);
  
  let screenshotDataUrl = null;
  if (includeScreenshot) {
    try {
      screenshotDataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
          if (chrome.runtime.lastError) resolve(null);
          else resolve(dataUrl);
        });
      });
    } catch (e) {
      console.warn("Screenshot failed", e);
    }
  }
  throwIfAborted(signal);

  if (model === 'gemini') {
    if (!geminiApiKey) throw new Error("Gemini API Key is missing. Please set it in settings.");
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.trim() });
    
    const userParts = [{ text: userMessage }];
    if (screenshotDataUrl) {
       const base64 = screenshotDataUrl.split(',')[1];
       userParts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
    }
    const chatHistory = toGeminiHistory(request.chatHistory);
    chatHistory.push({ role: "user", parts: userParts });

    let systemInstruction = "You are an autonomous browser agent. You can read pages, click elements, navigate, and perform searches to fulfill the user's requests. IMPORTANT: When interacting with the page (click_element, type_text), prefer using the `data-ai-id` attribute found in the page context. For example, if you see `<button data-ai-id=\"5\">`, use `5` or `[data-ai-id=\"5\"]` as the selector.";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}\n----------------------------\nUse this context to answer questions about the current page.`;

    let isDone = false;
    let finalAiText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 15;
    
    while(!isDone && iterations < MAX_ITERATIONS) {
      iterations++;
      throwIfAborted(signal);

      const responseStream = await executeWithRetry(() => ai.models.generateContentStream({
        model: geminiModel || "gemini-2.5-flash",
        contents: chatHistory,
        config: { tools: browserTools, systemInstruction, abortSignal: signal }
      }), lifecycle, 4);
      
      let hasToolCalls = false;
      let currentToolCalls = [];
      let modelParts = [];
      
      for await (const chunk of responseStream) {
        throwIfAborted(signal);
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
            modelParts.push(...chunk.candidates[0].content.parts);
        }

        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasToolCalls = true;
          currentToolCalls.push(...chunk.functionCalls);
        }
        
        if (chunk.text) {
          finalAiText += chunk.text;
          post({ chunk: chunk.text });
        }
      }

      if (hasToolCalls) {
        // Update UI with status
        const actionNames = currentToolCalls.map(c => c.name).join(', ');
        post({ status: `Executing: ${actionNames}...` });

        chatHistory.push({
           role: "model",
           parts: modelParts.length > 0 ? modelParts : currentToolCalls.map(call => ({ functionCall: call }))
        });
        
        const functionResponses = [];
        for (const call of currentToolCalls) {
          throwIfAborted(signal);
          const result = await executeTool(call.name, call.args, signal);
          functionResponses.push({ name: call.name, response: result });
        }

        chatHistory.push({
          role: "user",
          parts: functionResponses.map(r => ({ functionResponse: { name: r.name, response: r.response } }))
        });
      } else {
        isDone = true;
      }
    }
    
    if (iterations >= MAX_ITERATIONS) {
      finalAiText += "\n\n*[Stopped automatically after reaching maximum action steps to prevent infinite loop. Please provide more specific instructions if needed.]*";
      chatHistory.push({ role: "model", parts: [{ text: finalAiText }] });
      post({ chunk: "\n\n*[Stopped automatically to prevent infinite loops]*" });
      return;
    }

    if (!finalAiText) {
       finalAiText = "Action completed.";
       post({ chunk: finalAiText });
    }
    chatHistory.push({ role: "model", parts: [{ text: finalAiText }] });
  } 
  
  else if (model === 'openai') {
    if (!openAiApiKey) throw new Error("OpenAI API Key is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page (click_element, type_text), prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(request.chatHistory)];
    
    let contentForUser = userMessage;
    if (screenshotDataUrl) {
       contentForUser = [
          { type: "text", text: userMessage },
          { type: "image_url", image_url: { url: screenshotDataUrl } }
       ];
    }
    messages.push({ role: 'user', content: contentForUser });

    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey.trim()}` },
      body: JSON.stringify({ model: openAiModel || 'gpt-4o', messages, stream: true })
    }, lifecycle, 4);
    
    if (!res.ok) {
       const text = await res.text();
       let errMsg = `OpenAI Error (HTTP ${res.status})`;
       try {
           const err = JSON.parse(text);
           errMsg = err.error?.message || JSON.stringify(err.error) || errMsg;
       } catch(e) {
           errMsg += `: ${text.slice(0, 100)}`;
       }
       throw new Error(errMsg);
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    
    while (true) {
      throwIfAborted(signal);
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
         if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
               const data = JSON.parse(line.slice(6));
               const text = data.choices[0].delta?.content || "";
               if (text) {
                  fullText += text;
                  post({ chunk: text });
               }
            } catch(e) {}
         }
      }
    }
    
  }
  
  else if (model === 'huggingface') {
    if (!hfApiKey) throw new Error("Hugging Face API Key is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page, prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(request.chatHistory)];
    messages.push({ role: 'user', content: userMessage });

    const activeHfModel = hfModel || 'mistralai/Mistral-Nemo-Instruct-2407';
    const res = await fetchWithRetry(`https://api-inference.huggingface.co/models/${activeHfModel}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey.trim()}` },
      body: JSON.stringify({ model: activeHfModel, messages, max_tokens: 500 })
    }, lifecycle, 4);
    
    const textResp = await res.text();
    let data;
    try {
        data = JSON.parse(textResp);
    } catch(e) {
        throw new Error(`Hugging Face Error (HTTP ${res.status}): ${textResp.slice(0, 100)}`);
    }
    
    if (!res.ok || data.error) {
       let errMsg = data.error;
       if (typeof errMsg === 'object') errMsg = errMsg.message || JSON.stringify(errMsg);
       throw new Error(errMsg || `Hugging Face Error (HTTP ${res.status})`);
    }
    
    const text = data.choices[0].message.content;
    
    post({ chunk: text });
  }
  
  else if (model === 'ollama') {
    if (!ollamaUrl) throw new Error("Ollama URL is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page, prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(request.chatHistory)];
    messages.push({ role: 'user', content: userMessage });

    // Use /api/chat endpoint which is OpenAI compatible format for Ollama
    const res = await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', messages })
    }, lifecycle, 4).catch(async (error) => {
        if (isAbortError(error) || signal.aborted) throw error;
        // Fallback to native ollama api if OpenAI wrapper isn't working
        const nativeRes = await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel || 'llama3', messages, stream: false })
        }, lifecycle, 4);
        return nativeRes;
    });
    
    const textResp = await res.text();
    let data;
    try {
        data = JSON.parse(textResp);
    } catch(e) {
        throw new Error(`Ollama Error (HTTP ${res.status || 'unknown'}): ${textResp.slice(0, 100)}`);
    }

    if (!res.ok || data.error) {
       let errMsg = data.error;
       if (typeof errMsg === 'object') errMsg = errMsg.message || JSON.stringify(errMsg);
       throw new Error(errMsg || `Ollama Error (HTTP ${res.status})`);
    }
    
    const text = data.message ? data.message.content : data.choices[0].message.content;
    
    post({ chunk: text });
  }

  else {
    throw new Error("Invalid model selected");
  }
}
