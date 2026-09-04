import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Sparkles, User, Bot, X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Sidebar() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  
  // API Keys & Config
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  
  const [hfApiKey, setHfApiKey] = useState('');
  const [hfModel, setHfModel] = useState('mistralai/Mistral-Nemo-Instruct-2407');
  
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  
  const [testStatus, setTestStatus] = useState('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  
  const [settingsTab, setSettingsTab] = useState('gemini');
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (chrome && chrome.storage) {
      chrome.storage.local.get([
        'geminiApiKey', 'geminiModel', 
        'openAiApiKey', 'openAiModel',
        'hfApiKey', 'hfModel',
        'ollamaUrl', 'ollamaModel',
        'selectedModel',
        'chatHistory'
      ], (result) => {
        if (result.geminiApiKey) setGeminiApiKey(result.geminiApiKey);
        if (result.geminiModel) setGeminiModel(result.geminiModel);
        
        if (result.openAiApiKey) setOpenAiApiKey(result.openAiApiKey);
        if (result.openAiModel) setOpenAiModel(result.openAiModel);
        
        if (result.hfApiKey) setHfApiKey(result.hfApiKey);
        if (result.hfModel) setHfModel(result.hfModel);
        
        if (result.ollamaUrl) setOllamaUrl(result.ollamaUrl);
        if (result.ollamaModel) setOllamaModel(result.ollamaModel);
        
        if (result.selectedModel) setSelectedModel(result.selectedModel);

        if (result.chatHistory) setChat(result.chatHistory);
        setChatLoaded(true);
      });
    } else {
      setChatLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (chatLoaded && chrome && chrome.storage) {
      chrome.storage.local.set({ chatHistory: chat });
    }
  }, [chat, chatLoaded]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, loading]);

  const saveApiKey = () => {
    const dataToSave = { 
      geminiApiKey, geminiModel,
      openAiApiKey, openAiModel,
      hfApiKey, hfModel,
      ollamaUrl, ollamaModel,
      selectedModel
    };
    if (chrome && chrome.storage) {
      chrome.storage.local.set(dataToSave, () => {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus('idle');
          setShowSettings(false);
          setTestStatus('idle');
          setTestMessage('');
        }, 1500);
      });
    } else {
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowSettings(false);
        setTestStatus('idle');
        setTestMessage('');
      }, 1500);
    }
  };

  async function handleTestConnection() {
    setTestStatus('loading');
    setTestMessage('Testing connection...');
    try {
      if (settingsTab === 'gemini') {
        if (!geminiApiKey) throw new Error("API Key required");
        const modelToTest = geminiModel || 'gemini-2.5-flash';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Invalid API Key or Model");
        }
      } else if (settingsTab === 'openai') {
        if (!openAiApiKey) throw new Error("API Key required");
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${openAiApiKey}` }
        });
        if (!res.ok) throw new Error("Invalid API Key");
      } else if (settingsTab === 'huggingface') {
        if (!hfApiKey) throw new Error("Token required");
        const res = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { 'Authorization': `Bearer ${hfApiKey}` }
        });
        if (!res.ok) throw new Error("Invalid Token");
      } else if (settingsTab === 'ollama') {
        if (!ollamaUrl) throw new Error("URL required");
        const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/version`);
        if (!res.ok) throw new Error("Could not connect to Ollama");
      }
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection failed');
    }
  }

  async function sendMessage() {
    if (!message.trim() || loading) return;
    
    // Validation based on selected model
    if (selectedModel === 'gemini' && !geminiApiKey) { alert("Please set your Gemini API Key in settings."); setShowSettings(true); return; }
    if (selectedModel === 'openai' && !openAiApiKey) { alert("Please set your OpenAI API Key in settings."); setShowSettings(true); return; }
    if (selectedModel === 'huggingface' && !hfApiKey) { alert("Please set your Hugging Face API Key in settings."); setShowSettings(true); return; }
    if (selectedModel === 'ollama' && !ollamaUrl) { alert("Please set your Ollama URL in settings."); setShowSettings(true); return; }

    const userMessage = message.trim();

    setChat((items) => [
      ...items,
      { role: 'user', text: userMessage }
    ]);

    setMessage('');
    setLoading(true);

    let domContext = '';

    if (includeContext && chrome && chrome.tabs) {
      try {
        // Try to fetch context from the active tab if running as a Chrome Extension
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
          const contextResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(activeTab.id, { action: "get_page_context" }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn("Could not fetch page context. Ensure content script is injected.", chrome.runtime.lastError);
                resolve(null);
              } else {
                resolve(response);
              }
            });
          });
          
          if (contextResponse && contextResponse.text) {
            domContext = `URL: ${contextResponse.url}\nTitle: ${contextResponse.title}\n\nContent:\n${contextResponse.text}`;
          }
        }
      } catch (err) {
        console.warn("Error querying active tab. Continuing without context.", err);
      }
    }

    const payloadObj = {
      message: userMessage,
      chatHistory: chat,
      domContext,
      includeScreenshot,
      model: selectedModel,
      geminiApiKey,
      geminiModel,
      openAiApiKey,
      openAiModel,
      hfApiKey,
      hfModel,
      ollamaUrl,
      ollamaModel
    };

    setChat((items) => [...items, { role: 'assistant', text: '' }]);

    if (chrome && chrome.runtime && chrome.runtime.id && chrome.runtime.connect) {
      try {
        const port = chrome.runtime.connect({ name: 'chat_stream' });
        
        port.onMessage.addListener((msg) => {
          if (msg.error) {
            setChat(prev => {
              const next = [...prev];
              next[next.length - 1].text = msg.error;
              return next;
            });
            setLoading(false);
          } else if (msg.chunk) {
            setChat(prev => {
              const next = [...prev];
              next[next.length - 1].text += msg.chunk;
              return next;
            });
          } else if (msg.done) {
            setLoading(false);
            port.disconnect();
          }
        });

        port.postMessage({ type: 'AI_CHAT_REQUEST', ...payloadObj });
      } catch (err) {
        setChat(prev => {
          const next = [...prev];
          next[next.length - 1].text = "Extension connection failed.";
          return next;
        });
        setLoading(false);
      }
    } else {
      // Fallback to our Web API Service Layer when not in Chrome Extension mode
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadObj)
        });
        
        if (!res.ok) throw new Error("API request failed");
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          
          setChat(prev => {
            const next = [...prev];
            next[next.length - 1].text += chunkStr;
            return next;
          });
        }
      } catch (error) {
        setChat(prev => {
          const next = [...prev];
          next[next.length - 1].text = "Error connecting to Web API service layer.";
          return next;
        });
      } finally {
        setLoading(false);
      }
    }
  }

  if (showSettings) {
    return (
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[400px] shadow-2xl border-l border-slate-200 z-50">
        <aside className="h-full w-full bg-slate-50 flex flex-col font-sans text-slate-800 overflow-y-auto">
          <header className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <h2 className="text-base font-semibold">Settings</h2>
            </div>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </header>
          
          <div className="p-5 flex-1 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-sm font-semibold text-slate-800 mb-1">Configure Providers</label>
              <p className="text-xs text-slate-500 mb-4">Set up API keys and models for your preferred AI providers.</p>
              
              <div className="flex gap-2 mb-4 border-b border-slate-200 overflow-x-auto pb-2 custom-scrollbar">
                 {['gemini', 'openai', 'huggingface', 'ollama'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => setSettingsTab(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                        settingsTab === p 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : p === 'huggingface' ? 'Hugging Face' : 'Ollama'}
                    </button>
                 ))}
              </div>

              <div className="space-y-4 pt-2">
                {settingsTab === 'gemini' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
                      <input 
                        type="password" 
                        value={geminiApiKey} 
                        onChange={(e) => setGeminiApiKey(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="AIzaSy..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model ID</label>
                      <input 
                        type="text" 
                        value={geminiModel} 
                        onChange={(e) => setGeminiModel(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="e.g., gemini-2.5-flash"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Recommended: gemini-2.5-flash</p>
                    </div>
                  </div>
                )}
                {settingsTab === 'openai' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">OpenAI API Key</label>
                      <input 
                        type="password" 
                        value={openAiApiKey} 
                        onChange={(e) => setOpenAiApiKey(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="sk-..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model ID</label>
                      <input 
                        type="text" 
                        value={openAiModel} 
                        onChange={(e) => setOpenAiModel(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="e.g., gpt-4o, gpt-3.5-turbo"
                      />
                    </div>
                  </div>
                )}
                {settingsTab === 'huggingface' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hugging Face Token</label>
                      <input 
                        type="password" 
                        value={hfApiKey} 
                        onChange={(e) => setHfApiKey(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="hf_..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model ID</label>
                      <input 
                        type="text" 
                        value={hfModel} 
                        onChange={(e) => setHfModel(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="e.g., mistralai/Mistral-Nemo-Instruct-2407"
                      />
                    </div>
                  </div>
                )}
                {settingsTab === 'ollama' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Ollama URL (Local)</label>
                      <input 
                        type="text" 
                        value={ollamaUrl} 
                        onChange={(e) => setOllamaUrl(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="http://localhost:11434"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Model ID</label>
                      <input 
                        type="text" 
                        value={ollamaModel} 
                        onChange={(e) => setOllamaModel(e.target.value)} 
                        className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        placeholder="e.g., llama3, mistral"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {testMessage && (
                <div className={`p-3 rounded-lg text-sm border flex items-start gap-2 ${
                  testStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  testStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {testStatus === 'loading' && <div className="w-4 h-4 mt-0.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                  <span className="flex-1">{testMessage}</span>
                </div>
              )}
              
              <button 
                onClick={handleTestConnection}
                disabled={testStatus === 'loading'}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                Test Connection
              </button>

              <button 
                onClick={saveApiKey} 
                disabled={saveStatus === 'success'}
                className={`w-full font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm ${
                  saveStatus === 'success' 
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {saveStatus === 'success' ? 'Saved Successfully!' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 h-screen w-full sm:w-[400px] shadow-2xl border-l border-slate-200 z-50">
      <aside className="h-full w-full bg-white flex flex-col font-sans text-slate-800">
        {/* Header */}
      <header className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center">
          <img src="/logo/branding/AI-Browser-Copilot-sidebar-logo.png" alt="Copilot" className="h-7 w-auto object-contain" />
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                if (chrome && chrome.storage) chrome.storage.local.set({ selectedModel: e.target.value });
              }}
              className="appearance-none bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-semibold uppercase tracking-wider py-1.5 pl-2.5 pr-6 rounded-md cursor-pointer hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
              title="Switch AI Model"
            >
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="huggingface">HuggingFace</option>
              <option value="ollama">Ollama</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors">
              <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200"></div>

          <button 
            onClick={() => setChat([])} 
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>

          <button 
            onClick={() => setShowSettings(true)} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50"
      >
        {chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4 space-y-3">
            <div className="p-2">
              <img src="/logo/branding/AI-Browser-Copilot-light-icon.png" alt="AI Browser Copilot" className="w-14 h-14 object-contain opacity-75 grayscale contrast-125" />
            </div>
            <p className="text-sm">I can read pages, click elements, and research. What would you like to do?</p>
          </div>
        )}
        
        {chat.map((item, index) => (
          <div key={index} className={`flex gap-3 text-sm leading-relaxed ${item.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              item.role === 'user' 
                ? 'bg-slate-200 text-slate-600' 
                : 'bg-transparent overflow-hidden'
            }`}>
              {item.role === 'user' ? <User className="w-4 h-4" /> : <img src="/logo/branding/AI-Browser-Copilot-light-icon.png" className="w-full h-full object-cover" alt="AI" />}
            </div>
            
            {/* Message Bubble */}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
              item.role === 'user'
                ? 'bg-slate-900 text-slate-50 rounded-tr-sm shadow-sm whitespace-pre-wrap'
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
            }`}>
              {item.role === 'user' ? (
                item.text
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown>{item.text}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 text-sm">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-transparent overflow-hidden flex items-center justify-center">
              <img src="/logo/branding/AI-Browser-Copilot-light-icon.png" className="w-full h-full object-cover" alt="AI" />
            </div>
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="relative flex items-center">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me to browse or audit..."
            className="w-full bg-slate-100/50 border border-slate-200 pl-4 pr-12 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-inner shadow-slate-100/50"
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || !message.trim()}
            className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                DOM Context
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={includeScreenshot}
                onChange={(e) => setIncludeScreenshot(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700 transition-colors">
                Screenshot
              </span>
            </label>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">AI Browser Agent</span>
        </div>
      </div>
      </aside>
    </div>
  );
}
