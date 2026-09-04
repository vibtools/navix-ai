import { GoogleGenAI } from '@google/genai';

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Browser Copilot installed (Manifest V3)');
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

async function executeTool(name, args) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        resolve({ error: "No active tab found" });
        return;
      }

      function updateTabAndWait(tabId, updateProps, actionMsg) {
        chrome.tabs.update(tabId, updateProps, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            resolve({ error: "Failed to load page" });
            return;
          }
          const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              clearTimeout(fallback);
              setTimeout(() => resolve({ success: true, message: `${actionMsg} successful` }), 1500); // Give content script time to inject
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          const fallback = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve({ success: true, message: `${actionMsg} timeout, but likely loaded` });
          }, 10000);
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
          if (chrome.runtime.lastError) {
             resolve({ error: "Cannot communicate with page. It might be a protected page or refreshing." });
          } else {
             resolve(response || { error: "No response from page" });
          }
        });
      }
    });
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat_stream') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'AI_CHAT_REQUEST') {
        try {
          await handleAIRequestStream(message, port);
        } catch (error) {
          let errorMsg = error.message || 'AI request failed';
          if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
             errorMsg = "API Rate Limit Exceeded: You have reached your current quota limit for this model. Please wait a minute and try again, or switch to a different model in settings.";
          }
          port.postMessage({ error: errorMsg });
          port.postMessage({ done: true });
        }
      }
    });
  }
});

// Conversation History state
let chatHistory = [];

async function executeWithRetry(apiCall, port, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
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
      
      if (port) {
          port.postMessage({ status: `Rate limit hit. Retrying in ${Math.round(delay/1000)}s...` });
      }
      console.warn(`API Rate limit. Retrying in ${delay}ms...`, error);
      
      await new Promise(r => setTimeout(r, delay));
      retries++;
    }
  }
}

async function fetchWithRetry(url, options, port, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const res = await fetch(url, options);
      
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
        
        if (port) {
            port.postMessage({ status: `Server busy (HTTP ${res.status}). Retrying in ${Math.round(delay/1000)}s...` });
        }
        console.warn(`Fetch HTTP ${res.status}. Retrying in ${delay}ms...`);
        
        await new Promise(r => setTimeout(r, delay));
        retries++;
        continue;
      }
      
      return res;
    } catch (err) {
      if (retries >= maxRetries - 1) throw err;
      let delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
      if (port) port.postMessage({ status: `Network error. Retrying in ${Math.round(delay/1000)}s...` });
      console.warn(`Network error: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      retries++;
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_CHAT_REQUEST') {
    // Keep standard message listener working for old requests just in case, but we redirect logic 
    // to a pseudo-port so we don't duplicate code
    const pseudoPort = {
       postMessage: (msg) => {
          if (msg.done) sendResponse({ response: "Action completed." });
          if (msg.error) sendResponse({ error: msg.error });
       }
    };
    handleAIRequestStream(message, pseudoPort).catch(err => sendResponse({error: err.message}));
    return true; 
  }
});

async function handleAIRequestStream(request, port) {
  const { message: userMessage, domContext, includeScreenshot, thinkMode, model, geminiApiKey, geminiModel, openAiApiKey, openAiModel, hfApiKey, hfModel, ollamaUrl, ollamaModel } = request;
  
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

  let isAborted = false;
  if (port && port.onDisconnect) {
      port.onDisconnect.addListener(() => {
          isAborted = true;
      });
  }

  if (model === 'gemini') {
    if (!geminiApiKey) throw new Error("Gemini API Key is missing. Please set it in settings.");
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    const userParts = [{ text: userMessage }];
    if (screenshotDataUrl) {
       const base64 = screenshotDataUrl.split(',')[1];
       userParts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
    }
    chatHistory.push({ role: "user", parts: userParts });

    let systemInstruction = "You are an autonomous browser agent. You can read pages, click elements, navigate, and perform searches to fulfill the user's requests. IMPORTANT: When interacting with the page (click_element, type_text), prefer using the `data-ai-id` attribute found in the page context. For example, if you see `<button data-ai-id=\"5\">`, use `5` or `[data-ai-id=\"5\"]` as the selector.";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}\n----------------------------\nUse this context to answer questions about the current page.`;

    let isDone = false;
    let finalAiText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 15;
    
    while(!isDone && !isAborted && iterations < MAX_ITERATIONS) {
      iterations++;
      const abortController = new AbortController();
      if (isAborted) break;

      const responseStream = await executeWithRetry(() => ai.models.generateContentStream({
        model: geminiModel || "gemini-2.5-flash",
        contents: chatHistory,
        config: { tools: browserTools, systemInstruction }
      }), port, 4);
      
      let hasToolCalls = false;
      let currentToolCalls = [];
      let modelParts = [];
      
      for await (const chunk of responseStream) {
        if (isAborted) break;
        if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content && chunk.candidates[0].content.parts) {
            modelParts.push(...chunk.candidates[0].content.parts);
        }

        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasToolCalls = true;
          currentToolCalls.push(...chunk.functionCalls);
        }
        
        if (chunk.text) {
          finalAiText += chunk.text;
          port.postMessage({ chunk: chunk.text });
        }
      }
      
      if (isAborted) break;

      if (hasToolCalls) {
        // Update UI with status
        const actionNames = currentToolCalls.map(c => c.name).join(', ');
        port.postMessage({ status: `Executing: ${actionNames}...` });

        chatHistory.push({
           role: "model",
           parts: modelParts.length > 0 ? modelParts : currentToolCalls.map(call => ({ functionCall: call }))
        });
        
        const functionResponses = [];
        for (const call of currentToolCalls) {
          if (isAborted) break;
          const result = await executeTool(call.name, call.args);
          functionResponses.push({ name: call.name, response: result });
        }
        
        if (isAborted) break;

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
      port.postMessage({ chunk: "\n\n*[Stopped automatically to prevent infinite loops]*" });
      port.postMessage({ done: true });
      return;
    }

    if (isAborted) {
        if (!finalAiText) finalAiText = "Generation stopped by user.";
        else finalAiText += "\n\n*[Stopped]*";
        // Can't post back because port is dead, just save history
        chatHistory.push({ role: "model", parts: [{ text: finalAiText }] });
        return;
    }

    if (!finalAiText) {
       finalAiText = "Action completed.";
       port.postMessage({ chunk: finalAiText });
    }
    chatHistory.push({ role: "model", parts: [{ text: finalAiText }] });
    port.postMessage({ done: true });
  } 
  
  else if (model === 'openai') {
    if (!openAiApiKey) throw new Error("OpenAI API Key is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page (click_element, type_text), prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text || JSON.stringify(msg.parts) });
      else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text || "Action completed." });
    });
    
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
      body: JSON.stringify({ model: openAiModel || 'gpt-4o', messages, stream: true })
    }, port, 4);
    
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
                  port.postMessage({ chunk: text });
               }
            } catch(e) {}
         }
      }
    }
    
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    chatHistory.push({ role: "model", parts: [{ text: fullText }] });
    port.postMessage({ done: true });
  }
  
  else if (model === 'huggingface') {
    if (!hfApiKey) throw new Error("Hugging Face API Key is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page, prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
      else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
    });
    messages.push({ role: 'user', content: userMessage });

    const activeHfModel = hfModel || 'mistralai/Mistral-Nemo-Instruct-2407';
    const res = await fetchWithRetry(`https://api-inference.huggingface.co/models/${activeHfModel}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey}` },
      body: JSON.stringify({ model: activeHfModel, messages, max_tokens: 500 })
    }, port, 4);
    
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
    
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    chatHistory.push({ role: "model", parts: [{ text }] });
    port.postMessage({ chunk: text });
    port.postMessage({ done: true });
  }
  
  else if (model === 'ollama') {
    if (!ollamaUrl) throw new Error("Ollama URL is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries. IMPORTANT: When interacting with the page, prefer using the `data-ai-id` attribute found in the page context as the selector (e.g. `5` or `[data-ai-id=\"5\"]`).";
    if (thinkMode) systemInstruction += "\n\nTHINKING MODE ENABLED: Before providing your final answer or taking any action, you MUST output a detailed, step-by-step reasoning process. Wrap your reasoning using markdown blockquotes (e.g. starting lines with >). Ensure you analyze the user's request and the page context thoroughly before acting.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
      else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
    });
    messages.push({ role: 'user', content: userMessage });

    // Use /api/chat endpoint which is OpenAI compatible format for Ollama
    const res = await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', messages })
    }, port, 4).catch(async (e) => {
        // Fallback to native ollama api if OpenAI wrapper isn't working
        const nativeRes = await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel || 'llama3', messages, stream: false })
        }, port, 4);
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
    
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    chatHistory.push({ role: "model", parts: [{ text }] });
    port.postMessage({ chunk: text });
    port.postMessage({ done: true });
  }

  else {
    throw new Error("Invalid model selected");
  }
}
