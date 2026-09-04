import { GoogleGenAI } from '@google/genai';
import { isAbortError } from '../core/errorContract.js';
import { abortableDelay, throwIfAborted } from '../core/requestLifecycle.js';
import { toGeminiHistory, toProviderMessages, validateChatRequest } from '../core/sessionProtocol.js';

async function fetchWithRetry(url, options, signal, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    throwIfAborted(signal);
    try {
      const res = await fetch(url, { ...options, signal });
      if (res.status === 429 || res.status === 503 || res.status === 500) {
        if (retries >= maxRetries - 1) return res;
        let delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
        const retryAfter = res.headers.get('Retry-After');
        if (retryAfter) {
           const parsed = parseInt(retryAfter, 10);
           if (!isNaN(parsed)) delay = parsed * 1000 + 500;
        }
        console.warn(`Fetch HTTP ${res.status}. Retrying in ${delay}ms...`);
        await abortableDelay(delay, signal);
        retries++;
        continue;
      }
      return res;
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) throw e;
      if (retries >= maxRetries - 1) throw e;
      const delay = Math.pow(2, retries) * 2000 + Math.random() * 1000;
      console.warn(`Network error: ${e.message}. Retrying in ${delay}ms...`);
      await abortableDelay(delay, signal);
      retries++;
    }
  }
}

export async function generateChatResponse(rawRequest, onChunk, signal) {
  const request = validateChatRequest(rawRequest);
  const { message, chatHistory = [], domContext = '', model, geminiApiKey, geminiModel, openAiApiKey, openAiModel, hfApiKey, hfModel, ollamaUrl, ollamaModel } = request;
  throwIfAborted(signal);

  if (model === 'gemini') {
    const apiKey = (geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
    const ai = new GoogleGenAI({ apiKey });
    const formattedContents = toGeminiHistory(chatHistory);
    
    // Add current user message and optional screenshot placeholder (handled by extension typically, but supported here just in case base64 was passed)
    const currentParts = [{ text: message }];
    formattedContents.push({ role: 'user', parts: currentParts });
    
    let systemInstruction = "You are Navix AI, an AI browser copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}\n----------------------------`;
    
    const responseStream = await ai.models.generateContentStream({
      model: geminiModel || 'gemini-2.5-flash',
      contents: formattedContents,
      config: { systemInstruction, abortSignal: signal }
    });
    
    let fullText = "";
    for await (const chunk of responseStream) {
      throwIfAborted(signal);
      if (chunk.text) {
        fullText += chunk.text;
        if (onChunk) onChunk(chunk.text);
      }
    }
    return fullText;
  }
  
  if (model === 'openai') {
    if (!openAiApiKey) throw new Error('OpenAI API Key missing.');
    let systemInstruction = "You are Navix AI, an AI browser copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(chatHistory)];
    messages.push({ role: 'user', content: message });
    
    const res = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey.trim()}` },
      body: JSON.stringify({ model: openAiModel || 'gpt-4o', messages, stream: true })
    }, signal, 4);
    
    if (!res.ok) throw new Error("OpenAI API request failed");
    
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
              if (onChunk) onChunk(text);
            }
          } catch(e) {}
        }
      }
    }
    return fullText;
  }
  
  if (model === 'huggingface') {
    if (!hfApiKey) throw new Error('Hugging Face API Key missing.');
    let systemInstruction = "You are Navix AI, an AI browser copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(chatHistory)];
    messages.push({ role: 'user', content: message });
    
    const activeHfModel = hfModel || 'mistralai/Mistral-Nemo-Instruct-2407';
    const res = await fetchWithRetry(`https://api-inference.huggingface.co/models/${activeHfModel}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey.trim()}` },
      body: JSON.stringify({ model: activeHfModel, messages, max_tokens: 500 })
    }, signal, 4);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.choices[0].message.content;
  }
  
  if (model === 'ollama') {
    if (!ollamaUrl) throw new Error('Ollama URL missing.');
    let systemInstruction = "You are Navix AI, an AI browser copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }, ...toProviderMessages(chatHistory)];
    messages.push({ role: 'user', content: message });
    
    const res = await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', messages })
    }, signal, 3).catch(async (error) => {
        if (isAbortError(error) || signal?.aborted) throw error;
        return await fetchWithRetry(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel || 'llama3', messages, stream: false })
        }, signal, 3);
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.error);
    return data.message ? data.message.content : data.choices[0].message.content;
  }

  throw new Error("Invalid model selected");
}
