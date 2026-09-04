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

      if (name === "navigate") {
        chrome.tabs.update(activeTab.id, { url: args.url }, () => {
          resolve({ success: true, message: `Navigating to ${args.url}` });
        });
      } else if (name === "google_search") {
        const url = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        chrome.tabs.update(activeTab.id, { url }, () => {
          resolve({ success: true, message: `Searching Google for ${args.query}` });
        });
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
          port.postMessage({ error: error.message || 'AI request failed' });
          port.postMessage({ done: true });
        }
      }
    });
  }
});

// Conversation History state
let chatHistory = [];

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
  const { message: userMessage, domContext, includeScreenshot, model, geminiApiKey, geminiModel, openAiApiKey, openAiModel, hfApiKey, hfModel, ollamaUrl, ollamaModel } = request;
  
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

  if (model === 'gemini') {
    if (!geminiApiKey) throw new Error("Gemini API Key is missing. Please set it in settings.");
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    const userParts = [{ text: userMessage }];
    if (screenshotDataUrl) {
       const base64 = screenshotDataUrl.split(',')[1];
       userParts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
    }
    chatHistory.push({ role: "user", parts: userParts });

    let systemInstruction = "You are an autonomous browser agent. You can read pages, click elements, navigate, and perform searches to fulfill the user's requests.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}\n----------------------------\nUse this context to answer questions about the current page.`;

    let isDone = false;
    let finalAiText = "";
    
    while(!isDone) {
      const responseStream = await ai.models.generateContentStream({
        model: geminiModel || "gemini-2.5-flash",
        contents: chatHistory,
        config: { tools: browserTools, systemInstruction }
      });
      
      let hasToolCalls = false;
      let currentToolCalls = [];
      
      for await (const chunk of responseStream) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasToolCalls = true;
          currentToolCalls.push(...chunk.functionCalls);
        } else if (chunk.text) {
          finalAiText += chunk.text;
          port.postMessage({ chunk: chunk.text });
        }
      }
      
      if (hasToolCalls) {
        chatHistory.push({
           role: "model",
           parts: currentToolCalls.map(call => ({ functionCall: call }))
        });
        
        const functionResponses = [];
        for (const call of currentToolCalls) {
          const result = await executeTool(call.name, call.args);
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
    
    if (!finalAiText) {
       finalAiText = "Action completed.";
       port.postMessage({ chunk: finalAiText });
    }
    chatHistory.push({ role: "model", parts: [{ text: finalAiText }] });
    port.postMessage({ done: true });
  } 
  
  else if (model === 'openai') {
    if (!openAiApiKey) throw new Error("OpenAI API Key is missing.");
    let systemInstruction = "You are an autonomous browser agent. Help the user with their queries.";
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

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
      body: JSON.stringify({ model: openAiModel || 'gpt-4o', messages, stream: true })
    });
    
    if (!res.ok) {
       const err = await res.json();
       throw new Error(err.error?.message || "OpenAI error");
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
    let systemInstruction = "You are a helpful AI assistant.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
      else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
    });
    messages.push({ role: 'user', content: userMessage });

    const activeHfModel = hfModel || 'mistralai/Mistral-Nemo-Instruct-2407';
    const res = await fetch(`https://api-inference.huggingface.co/models/${activeHfModel}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey}` },
      body: JSON.stringify({ model: activeHfModel, messages, max_tokens: 500 })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const text = data.choices[0].message.content;
    
    chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    chatHistory.push({ role: "model", parts: [{ text }] });
    port.postMessage({ chunk: text });
    port.postMessage({ done: true });
  }
  
  else if (model === 'ollama') {
    if (!ollamaUrl) throw new Error("Ollama URL is missing.");
    let systemInstruction = "You are a helpful AI assistant.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      if (msg.role === 'user') messages.push({ role: 'user', content: msg.parts[0].text });
      else if (msg.role === 'model') messages.push({ role: 'assistant', content: msg.parts[0].text });
    });
    messages.push({ role: 'user', content: userMessage });

    // Use /api/chat endpoint which is OpenAI compatible format for Ollama
    const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', messages })
    }).catch(async (e) => {
        // Fallback to native ollama api if OpenAI wrapper isn't working
        const nativeRes = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel || 'llama3', messages, stream: false })
        });
        return nativeRes;
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.error);
    
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
