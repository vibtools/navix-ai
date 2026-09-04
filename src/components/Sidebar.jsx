import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Sparkles, User, Bot, X, Trash2, Square, BrainCircuit, Mic, Paperclip, Scissors, BookOpen, Settings2, Clock, Plus, Menu, RefreshCw, ChevronDown, Check, Zap, Server, Box, Loader2, Pencil, Save, Download, Puzzle, MessageSquare, Search, MoreVertical, FileText, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function SearchableSelect({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch(value); 
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
             setIsOpen(true);
             setSearch('');
          }}
          placeholder={placeholder}
          className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white shadow-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
           <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
           </svg>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto no-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div
                key={opt}
                className={`px-3 py-2 text-[13px] cursor-pointer ${value === opt ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))
          ) : (
            <div 
              className="px-3 py-2 text-[13px] hover:bg-slate-100 cursor-pointer text-blue-600 font-medium flex items-center justify-between"
              onClick={() => {
                if (search.trim()) {
                  onChange(search.trim());
                  setIsOpen(false);
                }
              }}
            >
              <span className="truncate pr-2">Use custom: "{search}"</span>
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Storage Helper: Supports chrome.storage and IndexedDB fallback ---
const dbPromise = new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    resolve(null);
    return;
  }
  const request = indexedDB.open('AICopilotDB', 1);
  request.onupgradeneeded = (e) => {
    e.target.result.createObjectStore('settings');
  };
  request.onsuccess = (e) => resolve(e.target.result);
  request.onerror = (e) => reject(e.target.error);
});

const AppStorage = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise(res => chrome.storage.local.get(keys, res));
    }
    const db = await dbPromise;
    if (!db) {
      const result = {};
      keys.forEach(k => {
        try { const val = localStorage.getItem(`copilot_${k}`); if (val !== null) result[k] = JSON.parse(val); } catch(e){}
      });
      return result;
    }
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const result = {};
    await Promise.all(keys.map(k => new Promise(res => {
      const req = store.get(k);
      req.onsuccess = () => { if(req.result !== undefined) result[k] = req.result; res(); };
      req.onerror = () => res();
    })));
    return result;
  },
  async set(data) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(data);
      return;
    }
    const db = await dbPromise;
    if (!db) {
      Object.entries(data).forEach(([k, v]) => {
        try { localStorage.setItem(`copilot_${k}`, JSON.stringify(v)); } catch(e){}
      });
      window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: data }));
      return;
    }
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    await Promise.all(Object.entries(data).map(([k, v]) => new Promise(res => {
      const req = store.put(v, k);
      req.onsuccess = () => res();
      req.onerror = () => res();
    })));
    window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: data }));
  },
  listen(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          const parsed = {};
          for (let [k, v] of Object.entries(changes)) parsed[k] = v.newValue;
          callback(parsed);
        }
      });
    }
    window.addEventListener('app-storage-changed', (e) => callback(e.detail));
  }
};
// ----------------------------------------------------------------------

export default function Sidebar() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [thinkMode, setThinkMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTab, setHistoryTab] = useState('all'); // all, starred
  
  // Saved state (The actual "Truth" for UI sync)
  const [savedSettings, setSavedSettings] = useState({
    geminiApiKey: '', geminiModel: 'gemini-2.5-flash',
    openAiApiKey: '', openAiModel: 'gpt-4o',
    hfApiKey: '', hfModel: 'mistralai/Mistral-Nemo-Instruct-2407',
    ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama3',
    selectedModel: 'gemini',
    systemPrompt: 'You are a helpful and intelligent AI assistant. Provide clear, accurate, and concise responses.', 
    customInstruction: 'Always format your responses using Markdown. Use code blocks for code snippets and lists for structured information.',
    defaultModel: 'gemini', autoModelSwitch: false,
    dataAnalysis: false, searchEnabled: false, searchEngine: 'google'
  });
  
  // API Keys & Config (Draft state for inputs)
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  
  const [hfApiKey, setHfApiKey] = useState('');
  const [hfModel, setHfModel] = useState('mistralai/Mistral-Nemo-Instruct-2407');
  
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3');
  
  // Additional General Config Drafts
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful and intelligent AI assistant. Provide clear, accurate, and concise responses.');
  const [customInstruction, setCustomInstruction] = useState('Always format your responses using Markdown. Use code blocks for code snippets and lists for structured information.');
  const [defaultModel, setDefaultModel] = useState('gemini');
  const [autoModelSwitch, setAutoModelSwitch] = useState(false);
  const [dataAnalysis, setDataAnalysis] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchEngine, setSearchEngine] = useState('google');
  
  const [pluginNameGenerator, setPluginNameGenerator] = useState(false);
  const [pluginAddressGenerator, setPluginAddressGenerator] = useState(false);
  const [pluginCsvGenerator, setPluginCsvGenerator] = useState(false);
  const [pluginEmailGrouper, setPluginEmailGrouper] = useState(false);
  
  const [testStatus, setTestStatus] = useState('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  
  const [settingsPageTab, setSettingsPageTab] = useState('model'); // main tab
  const [settingsTab, setSettingsTab] = useState('gemini'); // model sub-tab
  const [actionLoading, setActionLoading] = useState({ provider: null, action: null });

  const handleProviderAction = async (provider, actionType, actionFn) => {
    setActionLoading({ provider, action: actionType });
    try {
      await actionFn();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading({ provider: null, action: null });
    }
  };
  
  const [geminiModelList, setGeminiModelList] = useState([
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ]);
  const [isSyncingGemini, setIsSyncingGemini] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef(null);
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const scrollRef = useRef(null);
  const portRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    AppStorage.get([
      'geminiApiKey', 'geminiModel', 'cachedGeminiModels',
      'openAiApiKey', 'openAiModel',
      'hfApiKey', 'hfModel',
      'ollamaUrl', 'ollamaModel',
      'selectedModel',
      'chatHistory', 'chatSessions', 'currentSessionId',
      'systemPrompt', 'customInstruction',
      'defaultModel', 'autoModelSwitch',
      'dataAnalysis', 'searchEnabled', 'searchEngine',
      'pluginNameGenerator', 'pluginAddressGenerator', 'pluginCsvGenerator', 'pluginEmailGrouper'
    ]).then(result => {
      if (result.geminiApiKey) setGeminiApiKey(result.geminiApiKey);
      if (result.geminiModel) setGeminiModel(result.geminiModel);
      if (result.cachedGeminiModels) setGeminiModelList(result.cachedGeminiModels);
      
      if (result.openAiApiKey) setOpenAiApiKey(result.openAiApiKey);
      if (result.openAiModel) setOpenAiModel(result.openAiModel);
      
      if (result.hfApiKey) setHfApiKey(result.hfApiKey);
      if (result.hfModel) setHfModel(result.hfModel);
      
      if (result.ollamaUrl) setOllamaUrl(result.ollamaUrl);
      if (result.ollamaModel) setOllamaModel(result.ollamaModel);
      
      if (result.selectedModel) setSelectedModel(result.selectedModel);
      
      if (result.chatSessions) {
        setChatSessions(result.chatSessions);
      } else if (result.chatHistory && result.chatHistory.length > 0) {
        // Migrate legacy chatHistory to a session
        const initialSessionId = Date.now().toString();
        const firstMessage = result.chatHistory[0].text || 'New Chat';
        const initialSession = {
           id: initialSessionId,
           title: firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : ''),
           updatedAt: Date.now(),
           messages: result.chatHistory
        };
        setChatSessions([initialSession]);
        setCurrentSessionId(initialSessionId);
        AppStorage.set({ chatSessions: [initialSession], currentSessionId: initialSessionId });
      }

      if (result.currentSessionId) setCurrentSessionId(result.currentSessionId);
      
      if (result.systemPrompt !== undefined) {
        setSystemPrompt(result.systemPrompt);
      } else {
        AppStorage.set({ systemPrompt: 'You are a helpful and intelligent AI assistant. Provide clear, accurate, and concise responses.' });
      }
      
      if (result.customInstruction !== undefined) {
        setCustomInstruction(result.customInstruction);
      } else {
        AppStorage.set({ customInstruction: 'Always format your responses using Markdown. Use code blocks for code snippets and lists for structured information.' });
      }
      
      if (result.defaultModel !== undefined) setDefaultModel(result.defaultModel);
      if (result.autoModelSwitch !== undefined) setAutoModelSwitch(result.autoModelSwitch);
      if (result.dataAnalysis !== undefined) setDataAnalysis(result.dataAnalysis);
      if (result.searchEnabled !== undefined) setSearchEnabled(result.searchEnabled);
      if (result.searchEngine !== undefined) setSearchEngine(result.searchEngine);
      
      if (result.pluginNameGenerator !== undefined) setPluginNameGenerator(result.pluginNameGenerator);
      if (result.pluginAddressGenerator !== undefined) setPluginAddressGenerator(result.pluginAddressGenerator);
      if (result.pluginCsvGenerator !== undefined) setPluginCsvGenerator(result.pluginCsvGenerator);
      if (result.pluginEmailGrouper !== undefined) setPluginEmailGrouper(result.pluginEmailGrouper);
      
      // Init SavedSettings truth
      setSavedSettings({
        geminiApiKey: result.geminiApiKey || '',
        geminiModel: result.geminiModel || 'gemini-2.5-flash',
        openAiApiKey: result.openAiApiKey || '',
        openAiModel: result.openAiModel || 'gpt-4o',
        hfApiKey: result.hfApiKey || '',
        hfModel: result.hfModel || 'mistralai/Mistral-Nemo-Instruct-2407',
        ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
        ollamaModel: result.ollamaModel || 'llama3',
        selectedModel: result.selectedModel || 'gemini',
        systemPrompt: result.systemPrompt !== undefined ? result.systemPrompt : 'You are a helpful and intelligent AI assistant. Provide clear, accurate, and concise responses.',
        customInstruction: result.customInstruction !== undefined ? result.customInstruction : 'Always format your responses using Markdown. Use code blocks for code snippets and lists for structured information.',
        defaultModel: result.defaultModel || 'gemini',
        autoModelSwitch: result.autoModelSwitch || false,
        dataAnalysis: result.dataAnalysis || false,
        searchEnabled: result.searchEnabled || false,
        searchEngine: result.searchEngine || 'google',
        pluginNameGenerator: result.pluginNameGenerator || false,
        pluginAddressGenerator: result.pluginAddressGenerator || false,
        pluginCsvGenerator: result.pluginCsvGenerator || false,
        pluginEmailGrouper: result.pluginEmailGrouper || false
      });

      if (result.chatHistory) setChat(result.chatHistory);
      setChatLoaded(true);
    });
    
    // Listen for cross-tab or storage changes
    AppStorage.listen((changes) => {
      setSavedSettings(prev => ({ ...prev, ...changes }));
      // Also softly update inputs if changed from outside
      if (changes.geminiApiKey !== undefined) setGeminiApiKey(changes.geminiApiKey);
      if (changes.geminiModel !== undefined) setGeminiModel(changes.geminiModel);
      if (changes.openAiApiKey !== undefined) setOpenAiApiKey(changes.openAiApiKey);
      if (changes.openAiModel !== undefined) setOpenAiModel(changes.openAiModel);
      if (changes.hfApiKey !== undefined) setHfApiKey(changes.hfApiKey);
      if (changes.hfModel !== undefined) setHfModel(changes.hfModel);
      if (changes.ollamaUrl !== undefined) setOllamaUrl(changes.ollamaUrl);
      if (changes.ollamaModel !== undefined) setOllamaModel(changes.ollamaModel);
      if (changes.selectedModel !== undefined) setSelectedModel(changes.selectedModel);
      if (changes.systemPrompt !== undefined) setSystemPrompt(changes.systemPrompt);
      if (changes.customInstruction !== undefined) setCustomInstruction(changes.customInstruction);
      if (changes.defaultModel !== undefined) setDefaultModel(changes.defaultModel);
      if (changes.autoModelSwitch !== undefined) setAutoModelSwitch(changes.autoModelSwitch);
      if (changes.dataAnalysis !== undefined) setDataAnalysis(changes.dataAnalysis);
      if (changes.searchEnabled !== undefined) setSearchEnabled(changes.searchEnabled);
      if (changes.searchEngine !== undefined) setSearchEngine(changes.searchEngine);
      
      if (changes.pluginNameGenerator !== undefined) setPluginNameGenerator(changes.pluginNameGenerator);
      if (changes.pluginAddressGenerator !== undefined) setPluginAddressGenerator(changes.pluginAddressGenerator);
      if (changes.pluginCsvGenerator !== undefined) setPluginCsvGenerator(changes.pluginCsvGenerator);
      if (changes.pluginEmailGrouper !== undefined) setPluginEmailGrouper(changes.pluginEmailGrouper);
      
      if (changes.chatSessions !== undefined) setChatSessions(changes.chatSessions);
      if (changes.currentSessionId !== undefined) setCurrentSessionId(changes.currentSessionId);
      
      if (changes.chatHistory !== undefined) {
        // Simple heuristic to prevent looping back the save
        setChat(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(changes.chatHistory)) {
            return changes.chatHistory;
          }
          return prev;
        });
      }
    });
  }, []);

  useEffect(() => {
    if (chatLoaded) {
      AppStorage.set({ chatHistory: chat });
      
      if (chat.length > 0) {
        setChatSessions(prevSessions => {
          let sessionId = currentSessionId;
          let newSessions = [...prevSessions];
          
          if (!sessionId) {
            sessionId = Date.now().toString();
            setCurrentSessionId(sessionId);
            AppStorage.set({ currentSessionId: sessionId });
          }
          
          const sessionIndex = newSessions.findIndex(s => s.id === sessionId);
          const firstMessage = chat[0].text || 'New Chat';
          const title = firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : '');
          
          if (sessionIndex >= 0) {
            newSessions[sessionIndex] = {
              ...newSessions[sessionIndex],
              title,
              updatedAt: Date.now(),
              messages: chat
            };
          } else {
            newSessions.unshift({
              id: sessionId,
              title,
              updatedAt: Date.now(),
              messages: chat
            });
          }
          
          AppStorage.set({ chatSessions: newSessions });
          return newSessions;
        });
      }
    }
  }, [chat, chatLoaded]);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, loading]);

  const startNewChat = () => {
    setChat([]);
    setCurrentSessionId(null);
    AppStorage.set({ chatHistory: [], currentSessionId: null });
    setShowHistory(false);
  };

  const loadSession = (id) => {
    const session = chatSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setChat(session.messages || []);
      AppStorage.set({ currentSessionId: id, chatHistory: session.messages || [] });
      setShowHistory(false);
    }
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    const newSessions = chatSessions.filter(s => s.id !== id);
    setChatSessions(newSessions);
    AppStorage.set({ chatSessions: newSessions });
    
    if (currentSessionId === id) {
      setChat([]);
      setCurrentSessionId(null);
      AppStorage.set({ chatHistory: [], currentSessionId: null });
    }
  };

  const clearAllHistory = () => {
    setChatSessions([]);
    AppStorage.set({ chatSessions: [] });
    startNewChat();
  };

  const saveApiKey = async () => {
    const dataToSave = { 
      geminiApiKey, geminiModel,
      openAiApiKey, openAiModel,
      hfApiKey, hfModel,
      ollamaUrl, ollamaModel,
      selectedModel
    };
    await AppStorage.set(dataToSave);
    setSaveStatus('success');
    setTimeout(() => {
      setSaveStatus('idle');
      setShowSettings(false);
      setTestStatus('idle');
      setTestMessage('');
    }, 1500);
  };

  async function handleTestConnection(provider = settingsTab) {
    if (provider !== settingsTab) setSettingsTab(provider);
    setTestStatus('loading');
    setTestMessage('Testing connection...');
    try {
      if (provider === 'gemini') {
        const key = geminiApiKey || savedSettings.geminiApiKey;
        const modelToTest = geminiModel || savedSettings.geminiModel || 'gemini-2.5-flash';
        if (!key) throw new Error("API Key required");
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Invalid API Key or Model");
        }
      } else if (provider === 'openai') {
        const key = openAiApiKey || savedSettings.openAiApiKey;
        if (!key) throw new Error("API Key required");
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (!res.ok) throw new Error("Invalid API Key");
      } else if (provider === 'huggingface') {
        const key = hfApiKey || savedSettings.hfApiKey;
        if (!key) throw new Error("Token required");
        const res = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        if (!res.ok) throw new Error("Invalid Token");
      } else if (provider === 'ollama') {
        const url = ollamaUrl || savedSettings.ollamaUrl;
        if (!url) throw new Error("URL required");
        const res = await fetch(`${url.replace(/\/$/, '')}/api/version`);
        if (!res.ok) throw new Error("Could not connect to Ollama");
      }
      setTestStatus('success');
      setTestMessage('Connection successful!');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection failed');
    }
  }

  async function fetchGeminiModels() {
    if (!geminiApiKey) {
      setTestMessage("Please enter an API key first to sync models.");
      setTestStatus('error');
      return;
    }
    setIsSyncingGemini(true);
    setTestStatus('loading');
    setTestMessage('Fetching latest models from Google...');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch models.");
      }
      const data = await res.json();
      
      const models = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
        
      if (models.length > 0) {
        setGeminiModelList(models);
        AppStorage.set({ cachedGeminiModels: models });
        setTestMessage(`Successfully synced ${models.length} Gemini models.`);
        setTestStatus('success');
      } else {
        setTestMessage('No compatible models found.');
        setTestStatus('error');
      }
    } catch (err) {
      setTestMessage(err.message || 'Failed to sync models.');
      setTestStatus('error');
    } finally {
      setIsSyncingGemini(false);
    }
  }

  const stopGeneration = () => {
    if (portRef.current) {
      portRef.current.disconnect();
      portRef.current = null;
    }
    setLoading(false);
    setChat(prev => {
      const next = [...prev];
      if (next.length > 0 && next[next.length - 1].role === 'assistant') {
        next[next.length - 1].status = '';
      }
      return next;
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const newFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      const fileData = await new Promise(async (resolve) => {
        const reader = new FileReader();
        
        if (isPdf) {
          // Dynamic import for pdfjs
          const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          
          reader.onload = async (event) => {
            try {
              const typedarray = new Uint8Array(event.target.result);
              const pdf = await pdfjs.getDocument(typedarray).promise;
              let textContent = '';
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const text = await page.getTextContent();
                textContent += text.items.map(s => s.str).join(' ') + '\n';
              }
              resolve({
                name: file.name,
                type: file.type,
                content: textContent,
                isImage: false,
                isPdf: true
              });
            } catch (err) {
              console.error('Error parsing PDF:', err);
              resolve({
                name: file.name,
                type: file.type,
                content: 'Error parsing PDF content.',
                isImage: false,
                isPdf: true
              });
            }
          };
          reader.readAsArrayBuffer(file);
        } else if (isImage) {
          reader.onload = async (event) => {
            let textContent = '';
            try {
              // Dynamic import for tesseract
              const Tesseract = await import('tesseract.js');
              const { data: { text } } = await Tesseract.recognize(event.target.result, 'eng');
              textContent = text;
            } catch (err) {
              console.error('Error during OCR:', err);
            }
            
            resolve({
              name: file.name,
              type: file.type,
              content: event.target.result,
              extractedText: textContent,
              isImage: true,
              isPdf: false
            });
          };
          reader.readAsDataURL(file);
        } else {
          reader.onload = (event) => {
            resolve({
              name: file.name,
              type: file.type,
              content: event.target.result,
              isImage: false,
              isPdf: false
            });
          };
          reader.readAsText(file);
        }
      });
      
      newFiles.push(fileData);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
      // Artificial slight delay to allow UI to render progress if processing is too fast
      await new Promise(r => setTimeout(r, 50)); 
    }
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(false);
    setUploadProgress(0);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function sendMessage() {
    if (!message.trim() || loading) return;
    
    const userMessage = message.trim();

    // Validation based on selected model (using truth settings)
    const isConfigured = () => {
      if (!savedSettings.selectedModel) return false;
      if (savedSettings.selectedModel === 'gemini') return !!savedSettings.geminiApiKey;
      if (savedSettings.selectedModel === 'openai') return !!savedSettings.openAiApiKey;
      if (savedSettings.selectedModel === 'huggingface') return !!savedSettings.hfApiKey;
      if (savedSettings.selectedModel === 'ollama') return !!savedSettings.ollamaUrl;
      return false;
    };

    if (!isConfigured()) {
      setChat((items) => [
        ...items,
        { role: 'user', text: userMessage },
        { role: 'assistant', text: "⚠️ **Model API not configured!**\n\nPlease select an active model and configure its API key in the **Settings** before chatting." }
      ]);
      setMessage('');
      return;
    }

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

    let pluginContext = '';
    if (savedSettings.pluginNameGenerator) {
      pluginContext += "\n[PLUGIN: Name Generator Active] Use the following static name data for any form-fill operations instead of generating from scratch: Alex Carter.";
    }
    if (savedSettings.pluginAddressGenerator) {
      pluginContext += "\n[PLUGIN: Address Generator Active] Use the following static address data for any form-fill operations instead of generating from scratch: 456 Innovation Drive, Tech City, TC 90210.";
    }
    if (savedSettings.pluginCsvGenerator) {
      pluginContext += "\n[PLUGIN: CSV/Excel/TXT Generator & Reader Active] You have capabilities to read and generate structured files (CSV/Excel/TXT).";
    }
    if (savedSettings.pluginEmailGrouper) {
      pluginContext += "\n[PLUGIN: Email Grouper Active] You have capabilities to automatically group and process emails efficiently.";
    }
    
    if (pluginContext) {
      domContext += (domContext ? "\n\n" : "") + "--- ACTIVE SYSTEM PLUGINS ---\n" + pluginContext.trim();
    }

    if (uploadedFiles.length > 0) {
      const filesContext = uploadedFiles.map(f => {
        let contentToInject = f.content;
        if (f.isImage && f.extractedText) {
          contentToInject = `[Image OCR Extracted Text]:\n${f.extractedText}`;
        }
        return `--- FILE: ${f.name} ---\n${contentToInject}\n--- END OF FILE ---`;
      }).join('\n\n');
      domContext += (domContext ? "\n\n" : "") + "--- ATTACHED FILES ---\n" + filesContext;
      // Clear files after attaching them
      setUploadedFiles([]);
    }

    const payloadObj = {
      message: userMessage,
      chatHistory: chat,
      domContext,
      includeScreenshot,
      thinkMode,
      model: savedSettings.selectedModel,
      geminiApiKey: savedSettings.geminiApiKey,
      geminiModel: savedSettings.geminiModel,
      openAiApiKey: savedSettings.openAiApiKey,
      openAiModel: savedSettings.openAiModel,
      hfApiKey: savedSettings.hfApiKey,
      hfModel: savedSettings.hfModel,
      ollamaUrl: savedSettings.ollamaUrl,
      ollamaModel: savedSettings.ollamaModel
    };

    setChat((items) => [...items, { role: 'assistant', text: '', status: '' }]);

    if (chrome && chrome.runtime && chrome.runtime.id && chrome.runtime.connect) {
      try {
        portRef.current = chrome.runtime.connect({ name: 'chat_stream' });
        
        portRef.current.onMessage.addListener((msg) => {
          if (msg.error) {
            setChat(prev => {
              const next = [...prev];
              let errorMsg = typeof msg.error === 'object' ? JSON.stringify(msg.error) : String(msg.error);
              // Clean up typical JSON error strings if present
              try {
                const parsed = JSON.parse(errorMsg);
                if (parsed.error?.message) errorMsg = parsed.error.message;
                else if (parsed.message) errorMsg = parsed.message;
              } catch(e) {}
              
              if (next[next.length - 1].text) {
                next[next.length - 1].text += `\n\n**⚠️ Error:** ${errorMsg}`;
              } else {
                next[next.length - 1].text = `**⚠️ Error:** ${errorMsg}`;
              }
              next[next.length - 1].status = '';
              return next;
            });
            setLoading(false);
          } else if (msg.status) {
            setChat(prev => {
              const next = [...prev];
              next[next.length - 1].status = msg.status;
              return next;
            });
          } else if (msg.chunk) {
            setChat(prev => {
              const next = [...prev];
              next[next.length - 1].text += msg.chunk;
              next[next.length - 1].status = ''; // clear status when getting text
              return next;
            });
          } else if (msg.done) {
            setChat(prev => {
              const next = [...prev];
              next[next.length - 1].status = '';
              return next;
            });
            setLoading(false);
            if (portRef.current) {
                portRef.current.disconnect();
                portRef.current = null;
            }
          }
        });

        portRef.current.postMessage({ type: 'AI_CHAT_REQUEST', ...payloadObj });
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
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[380px] shadow-2xl border-l border-slate-200 z-50">
        <aside id="settings-panel" className="h-full w-full bg-slate-50/50 flex flex-col font-sans text-slate-800 overflow-y-auto">
          <header className="px-4 pt-3 border-b border-slate-200 bg-white flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-600" />
                <h2 className="text-[14px] font-semibold">Settings</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pt-1">
              {['model', 'general', 'personal', 'plugin'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsPageTab(tab)}
                  className={`py-2 px-1 text-[13px] font-medium whitespace-nowrap transition-all capitalize border-b-2 -mb-[1px] ${
                    settingsPageTab === tab
                      ? 'border-slate-800 text-slate-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </header>
          
          <div className="p-4 flex-1 space-y-4">
            {settingsPageTab === 'model' && (
              <>
                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[13px] font-semibold text-slate-800">Providers</label>
                    <div className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {[savedSettings.geminiApiKey, savedSettings.openAiApiKey, savedSettings.hfApiKey, savedSettings.ollamaUrl].filter(k => k && k.trim().length > 0).length}/4 Active
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
                     {['gemini', 'openai', 'huggingface', 'ollama'].map(p => (
                        <button 
                          key={p} 
                          onClick={() => setSettingsTab(p)}
                          className={`py-1.5 px-1 text-[12px] font-medium whitespace-nowrap transition-all capitalize border-b-2 -mb-[1px] ${
                            settingsTab === p 
                            ? 'border-slate-800 text-slate-800' 
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : p === 'huggingface' ? 'Hugging Face' : 'Ollama'}
                        </button>
                     ))}
                  </div>

                  <div className="space-y-3 pt-0">
                    {settingsTab === 'gemini' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Gemini API Key</label>
                          <input 
                            type="password" 
                            value={geminiApiKey} 
                            onChange={(e) => setGeminiApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="AIzaSy..."
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[12px] font-medium text-slate-700">Model ID</label>
                            <button 
                              onClick={fetchGeminiModels}
                              disabled={isSyncingGemini}
                              className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                              title="Sync models from Google"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSyncingGemini ? 'animate-spin' : ''}`} />
                              Sync
                            </button>
                          </div>
                          <SearchableSelect 
                            value={geminiModel} 
                            onChange={setGeminiModel} 
                            options={geminiModelList}
                            placeholder="Search or enter model..."
                          />
                        </div>
                      </div>
                    )}
                    {settingsTab === 'openai' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">OpenAI API Key</label>
                          <input 
                            type="password" 
                            value={openAiApiKey} 
                            onChange={(e) => setOpenAiApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="sk-..."
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Model ID</label>
                          <SearchableSelect 
                            value={openAiModel} 
                            onChange={setOpenAiModel} 
                            options={[
                              'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 
                              'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'
                            ]}
                            placeholder="Search or enter model..."
                          />
                        </div>
                      </div>
                    )}
                    {settingsTab === 'huggingface' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Hugging Face Token</label>
                          <input 
                            type="password" 
                            value={hfApiKey} 
                            onChange={(e) => setHfApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="hf_..."
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Model ID</label>
                          <SearchableSelect 
                            value={hfModel} 
                            onChange={setHfModel} 
                            options={[
                              'mistralai/Mistral-Nemo-Instruct-2407',
                              'meta-llama/Meta-Llama-3-8B-Instruct',
                              'google/gemma-2-2b-it',
                              'microsoft/Phi-3-mini-4k-instruct'
                            ]}
                            placeholder="Search or enter model..."
                          />
                        </div>
                      </div>
                    )}
                    {settingsTab === 'ollama' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Ollama API URL</label>
                          <input 
                            type="text" 
                            value={ollamaUrl} 
                            onChange={(e) => setOllamaUrl(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder="http://localhost:11434"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-slate-700 mb-0.5">Model ID</label>
                          <SearchableSelect 
                            value={ollamaModel} 
                            onChange={setOllamaModel} 
                            options={[
                              'llama3', 'llama3:8b', 'llama3:70b', 
                              'mistral', 'mixtral', 'gemma', 'gemma:2b', 'gemma:7b',
                              'phi3', 'qwen2'
                            ]}
                            placeholder="Search or enter model..."
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => handleTestConnection(settingsTab)}
                        disabled={testStatus === 'testing'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                      >
                        {testStatus === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Test Connection
                      </button>
                      <button 
                        onClick={() => saveConfig(settingsTab)}
                        disabled={saveStatus === 'saving'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                      >
                        {saveStatus === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Config
                      </button>
                    </div>

                    {testMessage && (
                      <div className={`mt-2 p-2 rounded-md text-[11px] flex items-start gap-1.5 ${
                        testStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                        testStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : ''
                      }`}>
                        {testStatus === 'success' ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                        <span className="leading-relaxed">{testMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <label className="block text-[13px] font-semibold text-slate-800 mb-3">Active Configurations</label>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500">Provider</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500">Model</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-[12px]">
                        {savedSettings.geminiApiKey && (
                          <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                            <td className="px-3 py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Gemini
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 truncate max-w-[100px]">{savedSettings.geminiModel || 'gemini-2.5-flash'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleProviderAction('gemini', 'activate', async () => { const isActive = savedSettings.selectedModel === 'gemini'; const newModel = isActive ? '' : 'gemini'; await AppStorage.set({ selectedModel: newModel }); setSelectedModel(newModel); if (!isActive) setSettingsTab('gemini'); })} title={savedSettings.selectedModel === 'gemini' ? "Deactivate" : "Set Active"} className={`p-1 rounded-md transition-colors ${savedSettings.selectedModel === 'gemini' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                  {actionLoading.provider === 'gemini' && actionLoading.action === 'activate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setSettingsTab('gemini')} title="Edit" className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleProviderAction('gemini', 'test', async () => await handleTestConnection('gemini'))} title="Test API" className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'gemini' && actionLoading.action === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleProviderAction('gemini', 'delete', async () => await AppStorage.set({ geminiApiKey: '' }))} title="Delete" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'gemini' && actionLoading.action === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {savedSettings.openAiApiKey && (
                          <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                            <td className="px-3 py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-emerald-500" /> OpenAI
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 truncate max-w-[100px]">{savedSettings.openAiModel || 'gpt-4o'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleProviderAction('openai', 'activate', async () => { const isActive = savedSettings.selectedModel === 'openai'; const newModel = isActive ? '' : 'openai'; await AppStorage.set({ selectedModel: newModel }); setSelectedModel(newModel); if (!isActive) setSettingsTab('openai'); })} title={savedSettings.selectedModel === 'openai' ? "Deactivate" : "Set Active"} className={`p-1 rounded-md transition-colors ${savedSettings.selectedModel === 'openai' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                  {actionLoading.provider === 'openai' && actionLoading.action === 'activate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setSettingsTab('openai')} title="Edit" className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleProviderAction('openai', 'test', async () => await handleTestConnection('openai'))} title="Test API" className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'openai' && actionLoading.action === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleProviderAction('openai', 'delete', async () => await AppStorage.set({ openAiApiKey: '' }))} title="Delete" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'openai' && actionLoading.action === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {savedSettings.hfApiKey && (
                          <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                            <td className="px-3 py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                              <Box className="w-3.5 h-3.5 text-amber-500" /> HuggingFace
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 truncate max-w-[100px]">{savedSettings.hfModel || 'mistralai/Mistral-Nemo-Instruct-2407'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleProviderAction('huggingface', 'activate', async () => { const isActive = savedSettings.selectedModel === 'huggingface'; const newModel = isActive ? '' : 'huggingface'; await AppStorage.set({ selectedModel: newModel }); setSelectedModel(newModel); if (!isActive) setSettingsTab('huggingface'); })} title={savedSettings.selectedModel === 'huggingface' ? "Deactivate" : "Set Active"} className={`p-1 rounded-md transition-colors ${savedSettings.selectedModel === 'huggingface' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                  {actionLoading.provider === 'huggingface' && actionLoading.action === 'activate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setSettingsTab('huggingface')} title="Edit" className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleProviderAction('huggingface', 'test', async () => await handleTestConnection('huggingface'))} title="Test API" className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'huggingface' && actionLoading.action === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleProviderAction('huggingface', 'delete', async () => await AppStorage.set({ hfApiKey: '' }))} title="Delete" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'huggingface' && actionLoading.action === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {savedSettings.ollamaUrl && (
                          <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                            <td className="px-3 py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                              <Server className="w-3.5 h-3.5 text-slate-500" /> Ollama
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 truncate max-w-[100px]">{savedSettings.ollamaModel || 'llama3'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleProviderAction('ollama', 'activate', async () => { const isActive = savedSettings.selectedModel === 'ollama'; const newModel = isActive ? '' : 'ollama'; await AppStorage.set({ selectedModel: newModel }); setSelectedModel(newModel); if (!isActive) setSettingsTab('ollama'); })} title={savedSettings.selectedModel === 'ollama' ? "Deactivate" : "Set Active"} className={`p-1 rounded-md transition-colors ${savedSettings.selectedModel === 'ollama' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                  {actionLoading.provider === 'ollama' && actionLoading.action === 'activate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setSettingsTab('ollama')} title="Edit" className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleProviderAction('ollama', 'test', async () => await handleTestConnection('ollama'))} title="Test API" className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'ollama' && actionLoading.action === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleProviderAction('ollama', 'delete', async () => await AppStorage.set({ ollamaUrl: '' }))} title="Delete" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                  {actionLoading.provider === 'ollama' && actionLoading.action === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {!savedSettings.geminiApiKey && !savedSettings.openAiApiKey && !savedSettings.hfApiKey && !savedSettings.ollamaUrl && (
                          <tr>
                            <td colSpan="3" className="px-3 py-4 text-center text-slate-400 italic">No providers configured yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {settingsPageTab === 'general' && (
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">System Prompt</label>
                  <textarea 
                    value={systemPrompt}
                    onChange={(e) => { setSystemPrompt(e.target.value); AppStorage.set({ systemPrompt: e.target.value }); }}
                    className="w-full h-20 border border-slate-300 px-3 py-2 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm resize-none"
                    placeholder="You are a helpful assistant..."
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Custom Instruction</label>
                  <textarea 
                    value={customInstruction}
                    onChange={(e) => { setCustomInstruction(e.target.value); AppStorage.set({ customInstruction: e.target.value }); }}
                    className="w-full h-20 border border-slate-300 px-3 py-2 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm resize-none"
                    placeholder="Always answer in markdown..."
                  />
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Default Model</label>
                  <select 
                    value={defaultModel}
                    onChange={(e) => { setDefaultModel(e.target.value); AppStorage.set({ defaultModel: e.target.value }); }}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  >
                    <option value="gemini">Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="huggingface">Hugging Face</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-[12px] font-medium text-slate-700">Auto Model Switch</div>
                    <div className="text-[11px] text-slate-500">Automatically switch if model fails</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={autoModelSwitch} onChange={(e) => { setAutoModelSwitch(e.target.checked); AppStorage.set({ autoModelSwitch: e.target.checked }); }} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-[12px] font-medium text-slate-700">Data Analysis</div>
                    <div className="text-[11px] text-slate-500">Enable local data processing</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={dataAnalysis} onChange={(e) => { setDataAnalysis(e.target.checked); AppStorage.set({ dataAnalysis: e.target.checked }); }} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-[12px] font-medium text-slate-700">Web Search</div>
                    <div className="text-[11px] text-slate-500">Allow AI to search the web</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={searchEnabled} onChange={(e) => { setSearchEnabled(e.target.checked); AppStorage.set({ searchEnabled: e.target.checked }); }} />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {searchEnabled && (
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[12px] font-medium text-slate-700 mb-1">Search Engine</label>
                    <select 
                      value={searchEngine}
                      onChange={(e) => { setSearchEngine(e.target.value); AppStorage.set({ searchEngine: e.target.value }); }}
                      className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                    >
                      <option value="google">Google</option>
                      <option value="bing">Bing</option>
                      <option value="duckduckgo">DuckDuckGo</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {settingsPageTab === 'personal' && (
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex flex-col items-start gap-1 mb-4">
                  <h3 className="text-[13px] font-semibold text-slate-800">Your Data</h3>
                  <p className="text-[11px] text-slate-500">Manage and export your personal chat data.</p>
                </div>
                
                <div className="pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chat));
                      const downloadAnchorNode = document.createElement('a');
                      downloadAnchorNode.setAttribute("href",     dataStr);
                      downloadAnchorNode.setAttribute("download", "chat_history_export.json");
                      document.body.appendChild(downloadAnchorNode); // required for firefox
                      downloadAnchorNode.click();
                      downloadAnchorNode.remove();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[12px] font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Chat History
                  </button>
                </div>
                
                <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-400 italic">More features coming soon...</span>
                </div>
              </div>
            )}

            {settingsPageTab === 'plugin' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Installed Plugins</span>
                  <span className="text-[10px] text-slate-400 font-medium">4 available</span>
                </div>

                {/* Name Generator */}
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-slate-300/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-100/80 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12px] font-medium text-slate-800 truncate block leading-tight">Name Generator</span>
                      <p className="text-[10px] text-slate-500 leading-3.5 truncate">
                        Quick name data injection for form-fill tasks.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pluginNameGenerator} 
                      onChange={(e) => { 
                        setPluginNameGenerator(e.target.checked); 
                        AppStorage.set({ pluginNameGenerator: e.target.checked }); 
                      }} 
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Address Generator */}
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-slate-300/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/80 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12px] font-medium text-slate-800 truncate block leading-tight">Address Generator</span>
                      <p className="text-[10px] text-slate-500 leading-3.5 truncate">
                        Supplies address data for quick form filling.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pluginAddressGenerator} 
                      onChange={(e) => { 
                        setPluginAddressGenerator(e.target.checked); 
                        AppStorage.set({ pluginAddressGenerator: e.target.checked }); 
                      }} 
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                {/* CSV/Excel/TXT Reader */}
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-slate-300/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shrink-0">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12px] font-medium text-slate-800 truncate block leading-tight">CSV / Excel / TXT</span>
                      <p className="text-[10px] text-slate-500 leading-3.5 truncate">
                        Quick reading and writing for data pipelines.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pluginCsvGenerator} 
                      onChange={(e) => { 
                        setPluginCsvGenerator(e.target.checked); 
                        AppStorage.set({ pluginCsvGenerator: e.target.checked }); 
                      }} 
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Email Grouper */}
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 hover:border-slate-300/80 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 border border-amber-100/80 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12px] font-medium text-slate-800 truncate block leading-tight">Email Grouper</span>
                      <p className="text-[10px] text-slate-500 leading-3.5 truncate">
                        Batches & organizes email communications.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pluginEmailGrouper} 
                      onChange={(e) => { 
                        setPluginEmailGrouper(e.target.checked); 
                        AppStorage.set({ pluginEmailGrouper: e.target.checked }); 
                      }} 
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[380px] shadow-2xl border-l border-slate-200 z-50">
        <aside className="h-full w-full bg-white flex flex-col font-sans text-slate-800">
          <header className="px-5 pt-4 pb-3 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="text-[16px] font-semibold flex items-center gap-2">
              Chat history <span className="text-slate-400 text-[13px] font-normal">({chatSessions.length})</span>
            </h2>
            <button onClick={() => setShowHistory(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </header>
          
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100">
              <div className="flex gap-4">
                <button 
                  onClick={() => setHistoryTab('all')}
                  className={`pb-2 text-[13px] font-medium border-b-2 -mb-[1px] transition-all ${historyTab === 'all' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setHistoryTab('starred')}
                  className={`pb-2 text-[13px] font-medium border-b-2 -mb-[1px] transition-all ${historyTab === 'starred' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
                >
                  Starred
                </button>
              </div>
              <button onClick={clearAllHistory} className="mb-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Clear all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search" 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 h-full mt-8">
                <div className="relative mb-6 group cursor-default">
                  <div className="w-16 h-16 bg-gradient-to-tr from-blue-50 to-slate-50 rounded-2xl flex items-center justify-center rotate-3 transition-transform duration-300 group-hover:rotate-6 shadow-sm border border-blue-100/50">
                    <Bot className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:-translate-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
                <h3 className="text-[14px] font-semibold text-slate-800 mb-1.5">No automation history</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed max-w-[240px] mx-auto mb-6">
                  Start your first browser automation task and your chat sessions will be securely saved here.
                </p>
                <button 
                  onClick={() => setShowHistory(false)} 
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium rounded-lg transition-colors shadow-sm"
                >
                  Start new task
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  {/* For now, just listing all without complex date grouping */}
                  {chatSessions
                    .filter(s => {
                      const searchLower = historySearch.toLowerCase();
                      const titleMatch = s.title?.toLowerCase().includes(searchLower);
                      const messagesMatch = s.messages?.some(msg => msg.text?.toLowerCase().includes(searchLower));
                      return titleMatch || messagesMatch;
                    })
                    .map(session => (
                    <div 
                      key={session.id} 
                      onClick={() => loadSession(session.id)}
                      className={`group p-3 rounded-xl border cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium text-slate-800 truncate">{session.title}</h4>
                          <p className="text-[12px] text-slate-500 truncate mt-0.5">
                            {session.messages?.[1]?.text || session.messages?.[0]?.text || 'Empty conversation...'}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               const newTitle = prompt("Enter new title:", session.title);
                               if (newTitle && newTitle.trim()) {
                                  const newSessions = chatSessions.map(s => s.id === session.id ? { ...s, title: newTitle.trim() } : s);
                                  setChatSessions(newSessions);
                                  AppStorage.set({ chatSessions: newSessions });
                               }
                            }} 
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-0.5"
                            title="Rename session"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => deleteSession(e, session.id)} 
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        <div className="flex items-center gap-2">
          <img src="/logo/branding/AI-Browser-Copilot-dark-Icon.png" alt="Copilot" className="h-7 w-7 object-cover rounded-md" />
          
          <div className="relative ml-2" ref={modelDropdownRef}>
            {/* Status indicator dot */}
            <div 
              className={`absolute top-1/2 -left-2.5 -translate-y-1/2 w-1.5 h-1.5 rounded-full z-20 ${
                (savedSettings.selectedModel === 'gemini' && savedSettings.geminiApiKey) ||
                (savedSettings.selectedModel === 'openai' && savedSettings.openAiApiKey) ||
                (savedSettings.selectedModel === 'huggingface' && savedSettings.hfApiKey) ||
                (savedSettings.selectedModel === 'ollama' && savedSettings.ollamaUrl) 
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                  : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
              }`}
              title={
                (savedSettings.selectedModel === 'gemini' && savedSettings.geminiApiKey) ||
                (savedSettings.selectedModel === 'openai' && savedSettings.openAiApiKey) ||
                (savedSettings.selectedModel === 'huggingface' && savedSettings.hfApiKey) ||
                (savedSettings.selectedModel === 'ollama' && savedSettings.ollamaUrl) 
                  ? 'Ready' 
                  : 'Configuration required'
              }
            ></div>
            
            <button 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 bg-transparent border border-transparent text-slate-700 hover:text-slate-900 text-[12px] font-semibold tracking-wide py-1 px-2 rounded-md cursor-pointer hover:bg-slate-100 transition-all focus:outline-none"
            >
              {savedSettings.selectedModel === 'gemini' && <Sparkles className="w-3.5 h-3.5 text-blue-500" />}
              {savedSettings.selectedModel === 'openai' && <Bot className="w-3.5 h-3.5 text-emerald-500" />}
              {savedSettings.selectedModel === 'huggingface' && <Box className="w-3.5 h-3.5 text-amber-500" />}
              {savedSettings.selectedModel === 'ollama' && <Server className="w-3.5 h-3.5 text-slate-500" />}
              <span className="max-w-[140px] truncate text-left">
                {savedSettings.selectedModel === 'gemini' ? savedSettings.geminiModel :
                 savedSettings.selectedModel === 'openai' ? savedSettings.openAiModel :
                 savedSettings.selectedModel === 'huggingface' ? savedSettings.hfModel :
                 savedSettings.selectedModel === 'ollama' ? savedSettings.ollamaModel :
                 'No Model Active'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-[240px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden z-50 flex flex-col">
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1.5 space-y-2">
                  
                  {/* Gemini Group */}
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gemini</span>
                    </div>
                    <div className="space-y-0.5">
                      {geminiModelList.map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel('gemini');
                            setGeminiModel(m);
                            AppStorage.set({ selectedModel: 'gemini', geminiModel: m });
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                            savedSettings.selectedModel === 'gemini' && savedSettings.geminiModel === m ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${savedSettings.geminiApiKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                            <span className="truncate">{m}</span>
                          </div>
                          {savedSettings.selectedModel === 'gemini' && savedSettings.geminiModel === m && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OpenAI Group */}
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">OpenAI</span>
                    </div>
                    <div className="space-y-0.5">
                      {['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel('openai');
                            setOpenAiModel(m);
                            AppStorage.set({ selectedModel: 'openai', openAiModel: m });
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                            savedSettings.selectedModel === 'openai' && savedSettings.openAiModel === m ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${savedSettings.openAiApiKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                            <span className="truncate">{m}</span>
                          </div>
                          {savedSettings.selectedModel === 'openai' && savedSettings.openAiModel === m && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HuggingFace Group */}
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
                      <Box className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">HuggingFace</span>
                    </div>
                    <div className="space-y-0.5">
                      {['mistralai/Mistral-Nemo-Instruct-2407', 'meta-llama/Meta-Llama-3-8B-Instruct', 'google/gemma-2-9b-it', 'HuggingFaceH4/zephyr-7b-beta'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel('huggingface');
                            setHfModel(m);
                            AppStorage.set({ selectedModel: 'huggingface', hfModel: m });
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                            savedSettings.selectedModel === 'huggingface' && savedSettings.hfModel === m ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${savedSettings.hfApiKey ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                            <span className="truncate">{m}</span>
                          </div>
                          {savedSettings.selectedModel === 'huggingface' && savedSettings.hfModel === m && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ollama Group */}
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 mb-0.5">
                      <Server className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ollama (Local)</span>
                    </div>
                    <div className="space-y-0.5">
                      {['llama3', 'llama3.1', 'mistral', 'gemma', 'gemma2', 'phi3', 'qwen2'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedModel('ollama');
                            setOllamaModel(m);
                            AppStorage.set({ selectedModel: 'ollama', ollamaModel: m });
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                            savedSettings.selectedModel === 'ollama' && savedSettings.ollamaModel === m ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${savedSettings.ollamaUrl ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                            <span className="truncate">{m}</span>
                          </div>
                          {savedSettings.selectedModel === 'ollama' && savedSettings.ollamaModel === m && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">

          <button 
            onClick={() => {
              setChat([]);
              AppStorage.set({ chatHistory: [] });
              if (chrome && chrome.runtime && chrome.runtime.id) {
                chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }).catch(() => {});
              }
            }} 
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>

          <button 
            onClick={() => setShowSettings(true)} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-white"
      >
        {chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4 space-y-3">
            <div className="p-2">
              <img src="/logo/branding/AI-Browser-Copilot-light-icon.png" alt="AI Browser Copilot" className="w-12 h-12 object-contain opacity-75 grayscale contrast-125" />
            </div>
            <p className="text-[13px]">I can read pages, click elements, and research. What would you like to do?</p>
          </div>
        )}
        
        {chat.map((item, index) => (
          <div key={index} className={`flex gap-2.5 text-[13px] leading-relaxed ${item.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
              item.role === 'user' 
                ? 'bg-slate-100 text-slate-600' 
                : 'bg-transparent overflow-hidden'
            }`}>
              {item.role === 'user' ? <User className="w-3.5 h-3.5" /> : <img src="/logo/branding/AI-Browser-Copilot-dark-Icon.png" className="w-full h-full object-cover rounded-full" alt="AI" />}
            </div>
            
            {/* Message Bubble */}
            <div className="max-w-[88%] flex flex-col gap-1.5">
              {item.status && (
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded border border-slate-100 bg-slate-50 text-slate-500 ${item.role === 'user' ? 'self-end' : 'self-start'}`}>
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  <span className="truncate max-w-[200px]">{item.status}</span>
                </div>
              )}
              
              {item.text && (
                <div className={`px-3.5 py-2.5 rounded-2xl ${
                  item.role === 'user'
                    ? 'bg-slate-900 text-slate-50 rounded-tr-sm shadow-sm whitespace-pre-wrap'
                    : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
                }`}>
                  {item.role === 'user' ? (
                    item.text
                  ) : (
                    <div className="markdown-body text-[13px]">
                      <ReactMarkdown
                        components={{
                          code({node, inline, className, children, ...props}) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                {...props}
                                children={String(children).replace(/\n$/, '')}
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md !mt-2 !mb-2 !text-[12px]"
                              />
                            ) : (
                              <code {...props} className={`${className} bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[12px]`}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {item.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && !chat[chat.length - 1]?.status && !chat[chat.length - 1]?.text && (
          <div className="flex gap-2.5 text-[13px]">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-transparent overflow-hidden flex items-center justify-center mt-1">
              <img src="/logo/branding/AI-Browser-Copilot-dark-Icon.png" className="w-full h-full object-cover rounded-full" alt="AI" />
            </div>
            <div className="bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1 shadow-sm">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.02)]">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIncludeScreenshot(!includeScreenshot)}
              className={`p-1.5 rounded-lg transition-colors ${includeScreenshot ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="Include Screenshot"
            >
              <Scissors className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Upload File"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIncludeContext(!includeContext)}
              className={`p-1.5 rounded-lg transition-colors ${includeContext ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
              title="Include Page Context"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowSettings(true)} className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors" title="Settings">
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} title="History">
              <Clock className="w-4 h-4" />
            </button>
            <button onClick={startNewChat} className="p-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 rounded-lg transition-colors" title="New Chat">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative flex flex-col bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-sm">
          {isUploading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 rounded-t-2xl overflow-hidden z-10">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="relative group flex items-center justify-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-14 w-14 flex-shrink-0">
                  {file.isImage ? (
                    <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-5 h-5 mb-0.5" />
                      <span className="text-[8px] font-medium uppercase truncate w-10 text-center">{file.name.split('.').pop()}</span>
                    </div>
                  )}
                  <button 
                    onClick={() => removeFile(idx)} 
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* Tooltip for file name */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                    {file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              // Auto-resize logic
              event.target.style.height = '64px';
              const scrollHeight = event.target.scrollHeight;
              event.target.style.height = `${Math.min(scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && message.trim()) {
                  sendMessage();
                  // Reset height
                  if (textareaRef.current) textareaRef.current.style.height = '64px';
                }
              }
            }}
            rows={1}
            placeholder="Ask anything, @ models, / prompts"
            className="w-full bg-transparent px-4 pt-3 pb-10 rounded-2xl text-[13px] focus:outline-none resize-none overflow-y-auto no-scrollbar"
            style={{ height: '64px', minHeight: '64px', maxHeight: '120px' }}
          />
          
          <div className="absolute bottom-1 left-2 right-1.5 flex items-center justify-between">
            <button 
              onClick={() => setThinkMode(!thinkMode)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${thinkMode ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-200'}`}
              title="Toggle Thinking Mode"
            >
              <BrainCircuit className="w-3 h-3" /> Think
            </button>

            <div className="flex items-center gap-1">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer" title="Voice Input">
                <Mic className="w-4 h-4" />
              </button>
              
              {loading ? (
                <button 
                  onClick={stopGeneration}
                  className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    sendMessage();
                    if (textareaRef.current) textareaRef.current.style.height = '64px';
                  }}
                  disabled={!message.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </aside>
    </div>
  );
}
