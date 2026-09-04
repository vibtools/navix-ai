import { GoogleGenAI } from '@google/genai';

export async function generateChatResponse(request, onChunk) {
  const { message, chatHistory = [], domContext = '', includeScreenshot, model, geminiApiKey, geminiModel, openAiApiKey, openAiModel, hfApiKey, hfModel, ollamaUrl, ollamaModel } = request;

  if (model === 'gemini') {
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');
    const ai = new GoogleGenAI({ apiKey });
    const formattedContents = chatHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
    
    // Add current user message and optional screenshot placeholder (handled by extension typically, but supported here just in case base64 was passed)
    const currentParts = [{ text: message }];
    formattedContents.push({ role: 'user', parts: currentParts });
    
    let systemInstruction = "You are an AI Browser Copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}\n----------------------------`;
    
    const responseStream = await ai.models.generateContentStream({
      model: geminiModel || 'gemini-2.5-flash',
      contents: formattedContents,
      config: { systemInstruction }
    });
    
    let fullText = "";
    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        if (onChunk) onChunk(chunk.text);
      }
    }
    return fullText;
  }
  
  if (model === 'openai') {
    if (!openAiApiKey) throw new Error('OpenAI API Key missing.');
    let systemInstruction = "You are an AI Browser Copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.text });
    });
    messages.push({ role: 'user', content: message });
    
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAiApiKey}` },
      body: JSON.stringify({ model: openAiModel || 'gpt-4o', messages, stream: true })
    });
    
    if (!res.ok) throw new Error("OpenAI API request failed");
    
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
    let systemInstruction = "You are an AI Browser Copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.text });
    });
    messages.push({ role: 'user', content: message });
    
    const activeHfModel = hfModel || 'mistralai/Mistral-Nemo-Instruct-2407';
    const res = await fetch(`https://api-inference.huggingface.co/models/${activeHfModel}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfApiKey}` },
      body: JSON.stringify({ model: activeHfModel, messages, max_tokens: 500 })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.choices[0].message.content;
  }
  
  if (model === 'ollama') {
    if (!ollamaUrl) throw new Error('Ollama URL missing.');
    let systemInstruction = "You are an AI Browser Copilot.";
    if (domContext) systemInstruction += `\n\n--- CURRENT PAGE CONTEXT ---\n${domContext}`;
    const messages = [{ role: 'system', content: systemInstruction }];
    chatHistory.forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.text });
    });
    messages.push({ role: 'user', content: message });
    
    const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', messages })
    }).catch(async () => {
        return await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/chat`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ model: ollamaModel || 'llama3', messages, stream: false })
        });
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.error);
    return data.message ? data.message.content : data.choices[0].message.content;
  }

  throw new Error("Invalid model selected");
}
