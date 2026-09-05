import React, { useState, useEffect, useRef } from 'react';
import { Send, Settings, Sparkles, User, Bot, X, Trash2, Square, BrainCircuit, Mic, Paperclip, Scissors, BookOpen, Settings2, Clock, Plus, Menu, RefreshCw, ChevronDown, ChevronUp, Check, Zap, Server, Box, Loader2, Pencil, Save, Download, Puzzle, MessageSquare, Search, MoreVertical, FileText, Image as ImageIcon, SlidersHorizontal, Globe, Languages, SquarePen, LayoutGrid, Code2, Info, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AppStorage } from '../core/appStorage.js';
import { createRequestId, createSessionId } from '../core/sessionProtocol.js';
import { CredentialVault, collectLegacyCredentials, credentialsFromConfigs, hydrateProviderConfigs, publicProviderConfigs } from '../core/credentialVault.js';
import { ACTION_DECISION, ACTION_CONFIRMATION } from '../core/confirmationProtocol.js';
import { IMAGE_CANCEL_REQUEST, IMAGE_GENERATE_REQUEST } from '../capabilities/imageGeneration.js';
import { validateUploadBatch, FILE_LIMITS, limitExtractedText } from '../core/filePolicy.js';
import { parseStructuredFile, structuredRowsToText } from '../capabilities/structuredData.js';
import { analyzeRows, formatAnalysis } from '../capabilities/dataAnalysis.js';
import { generateSyntheticIdentity } from '../capabilities/generators.js';
import { formatEmailGroups, groupEmailRows } from '../capabilities/emailGrouper.js';
import { extractArtifacts } from '../capabilities/artifacts.js';
import { isSafeRenderedUrl } from '../core/trustBoundary.js';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ocrWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import ocrCoreUrl from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url';
import { ActionConfirmationDialog, CredentialVaultDialog } from './SecurityDialogs.jsx';
import CapabilityDrawer from './CapabilityDrawer.jsx';

const OCR_LANGUAGE_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int';

function toProviderAttempt(config) {
  const provider = config?.provider;
  if (provider === 'gemini' || provider === 'openai' || provider === 'huggingface') {
    return { provider, modelId: config.model, apiKey: config.apiKey };
  }
  if (provider === 'ollama') {
    return { provider, modelId: config.model, baseUrl: config.url };
  }
  return null;
}

function providerAttemptFromSettings(settings, provider = settings.selectedModel) {
  if (provider === 'gemini') return { provider, modelId: settings.geminiModel, apiKey: settings.geminiApiKey };
  if (provider === 'openai') return { provider, modelId: settings.openAiModel, apiKey: settings.openAiApiKey };
  if (provider === 'huggingface') return { provider, modelId: settings.hfModel, apiKey: settings.hfApiKey };
  if (provider === 'ollama') return { provider, modelId: settings.ollamaModel, baseUrl: settings.ollamaUrl };
  return null;
}

function resolvePrimaryProviderAttempt(settings, configs = []) {
  const provider = settings.selectedModel;
  const selectedModel = provider === 'gemini' ? settings.geminiModel
    : provider === 'openai' ? settings.openAiModel
      : provider === 'huggingface' ? settings.hfModel
        : settings.ollamaModel;
  const activeConfig = configs.find((config) => config.isActive && config.provider === provider)
    || configs.find((config) => config.provider === provider && config.model === selectedModel);
  return toProviderAttempt(activeConfig) || providerAttemptFromSettings(settings, provider);
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => console.error("Copy failed:", err));
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-colors self-start"
      title="Copy response"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

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
    dataAnalysis: false, searchEnabled: false, searchEngine: 'google',
    artifactsEnabled: false, imageGenEnabled: false, imageGenModel: 'Nano Banana',
    customInstructionsEnabled: true, responseLanguage: 'Auto'
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
  const [tabSummaryInstruction, setTabSummaryInstruction] = useState('Please provide a concise summary of the current page context.');
  const [defaultModel, setDefaultModel] = useState('gemini');
  const [autoModelSwitch, setAutoModelSwitch] = useState(false);
  const [dataAnalysis, setDataAnalysis] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchEngine, setSearchEngine] = useState('google');
  
  const [pluginNameGenerator, setPluginNameGenerator] = useState(false);
  const [pluginAddressGenerator, setPluginAddressGenerator] = useState(false);
  const [pluginCsvGenerator, setPluginCsvGenerator] = useState(false);
  const [pluginEmailGrouper, setPluginEmailGrouper] = useState(false);
  
  // Chat Controls & Capabilities State
  const [showChatControls, setShowChatControls] = useState(false);
  const [artifactsEnabled, setArtifactsEnabled] = useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [imageGenModel, setImageGenModel] = useState('Nano Banana');
  const [showImageModelPicker, setShowImageModelPicker] = useState(false);
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = useState(true);
  const [showCustomInstructionModal, setShowCustomInstructionModal] = useState(false);
  const [tempCustomInstruction, setTempCustomInstruction] = useState('');
  const [responseLanguage, setResponseLanguage] = useState('Auto');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [capabilityDrawer, setCapabilityDrawer] = useState(null);
  const [credentialMode, setCredentialMode] = useState('legacy');
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  
  const [testStatus, setTestStatus] = useState('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  
  const [settingsPageTab, setSettingsPageTab] = useState('model'); // main tab
  const [settingsTab, setSettingsTab] = useState('gemini'); // model sub-tab
  const [actionLoading, setActionLoading] = useState({ provider: null, action: null });
  const [activeConfigs, setActiveConfigs] = useState([]);
  const [editingConfigId, setEditingConfigId] = useState(null);

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

  const requestProviderProbe = async (attempt) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      const response = await chrome.runtime.sendMessage({ type: 'PROVIDER_PROBE', attempt });
      if (!response?.success) throw new Error(response?.error?.message || 'Connection test failed');
      return response.result;
    }
    const response = await fetch('/api/provider/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attempt })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data?.error?.message || 'Connection test failed');
    return data.result;
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
  const abortControllerRef = useRef(null);
  const imageRequestIdRef = useRef(null);
  const textareaRef = useRef(null);
  const credentialsRef = useRef({});

  useEffect(() => {
    AppStorage.get([
      'geminiApiKey', 'geminiModel', 'cachedGeminiModels',
      'openAiApiKey', 'openAiModel',
      'hfApiKey', 'hfModel',
      'ollamaUrl', 'ollamaModel',
      'selectedModel', 'activeConfigs',
      'chatHistory', 'chatSessions', 'currentSessionId',
      'systemPrompt', 'customInstruction', 'tabSummaryInstruction',
      'defaultModel', 'autoModelSwitch',
      'dataAnalysis', 'searchEnabled', 'searchEngine',
      'pluginNameGenerator', 'pluginAddressGenerator', 'pluginCsvGenerator', 'pluginEmailGrouper',
      'artifactsEnabled', 'imageGenEnabled', 'imageGenModel', 'customInstructionsEnabled', 'responseLanguage',
      'privacyConsent'
    ]).then(async result => {
      const vaultState = await CredentialVault.initialize();
      setCredentialMode(vaultState.mode);
      if (result.privacyConsent !== undefined) setPrivacyConsent(Boolean(result.privacyConsent));
      if (result.cachedGeminiModels) setGeminiModelList(result.cachedGeminiModels);
      if (result.selectedModel) setSelectedModel(result.selectedModel);

      // Build active configurations from storage or migrate from existing keys
      let configs = result.activeConfigs;
      if (!Array.isArray(configs) || configs.length === 0) {
        configs = [];
        if (result.geminiApiKey) {
          configs.push({
            id: 'gemini_' + (result.geminiModel || 'gemini-2.5-flash'),
            provider: 'gemini',
            model: result.geminiModel || 'gemini-2.5-flash',
            apiKey: result.geminiApiKey,
            isActive: (result.selectedModel || 'gemini') === 'gemini'
          });
        }
        if (result.openAiApiKey) {
          configs.push({
            id: 'openai_' + (result.openAiModel || 'gpt-4o'),
            provider: 'openai',
            model: result.openAiModel || 'gpt-4o',
            apiKey: result.openAiApiKey,
            isActive: result.selectedModel === 'openai'
          });
        }
        if (result.hfApiKey) {
          configs.push({
            id: 'hf_' + (result.hfModel || 'mistralai/Mistral-Nemo-Instruct-2407'),
            provider: 'huggingface',
            model: result.hfModel || 'mistralai/Mistral-Nemo-Instruct-2407',
            apiKey: result.hfApiKey,
            isActive: result.selectedModel === 'huggingface'
          });
        }
        if (result.ollamaUrl) {
          configs.push({
            id: 'ollama_' + (result.ollamaModel || 'llama3'),
            provider: 'ollama',
            model: result.ollamaModel || 'llama3',
            url: result.ollamaUrl,
            isActive: result.selectedModel === 'ollama'
          });
        }
      }
      const legacyCredentials = collectLegacyCredentials(configs, result);
      let runtimeCredentials = vaultState.credentials;
      if (Object.keys(runtimeCredentials).length === 0 && Object.keys(legacyCredentials).length > 0) {
        runtimeCredentials = legacyCredentials;
        await CredentialVault.writeSession(runtimeCredentials);
      }
      credentialsRef.current = runtimeCredentials;
      configs = hydrateProviderConfigs(configs, runtimeCredentials);
      setActiveConfigs(configs);
      if (vaultState.mode === 'legacy' && Object.keys(legacyCredentials).length > 0) setShowVaultDialog(true);
      if (vaultState.mode === 'encrypted' && Object.keys(runtimeCredentials).length === 0) setShowVaultDialog(true);
      
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
      
      if (result.tabSummaryInstruction !== undefined) {
        setTabSummaryInstruction(result.tabSummaryInstruction);
      } else {
        AppStorage.set({ tabSummaryInstruction: 'Please provide a concise summary of the current page context.' });
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
      
      if (result.artifactsEnabled !== undefined) setArtifactsEnabled(result.artifactsEnabled);
      if (result.imageGenEnabled !== undefined) setImageGenEnabled(result.imageGenEnabled);
      if (result.imageGenModel !== undefined) setImageGenModel(result.imageGenModel);
      if (result.customInstructionsEnabled !== undefined) setCustomInstructionsEnabled(result.customInstructionsEnabled);
      if (result.responseLanguage !== undefined) setResponseLanguage(result.responseLanguage);
      
      // Init SavedSettings truth
      setSavedSettings({
        activeConfigs: configs,
        geminiApiKey: configs.find(c => c.provider === 'gemini')?.apiKey || result.geminiApiKey || '',
        geminiModel: result.geminiModel || 'gemini-2.5-flash',
        openAiApiKey: configs.find(c => c.provider === 'openai')?.apiKey || result.openAiApiKey || '',
        openAiModel: result.openAiModel || 'gpt-4o',
        hfApiKey: configs.find(c => c.provider === 'huggingface')?.apiKey || result.hfApiKey || '',
        hfModel: result.hfModel || 'mistralai/Mistral-Nemo-Instruct-2407',
        ollamaUrl: result.ollamaUrl || 'http://localhost:11434',
        ollamaModel: result.ollamaModel || 'llama3',
        selectedModel: result.selectedModel || (configs.find(c => c.isActive)?.provider || 'gemini'),
        systemPrompt: result.systemPrompt !== undefined ? result.systemPrompt : 'You are a helpful and intelligent AI assistant. Provide clear, accurate, and concise responses.',
        customInstruction: result.customInstruction !== undefined ? result.customInstruction : 'Always format your responses using Markdown. Use code blocks for code snippets and lists for structured information.',
        tabSummaryInstruction: result.tabSummaryInstruction !== undefined ? result.tabSummaryInstruction : 'Please provide a concise summary of the current page context.',
        defaultModel: result.defaultModel || 'gemini',
        autoModelSwitch: result.autoModelSwitch || false,
        dataAnalysis: result.dataAnalysis || false,
        searchEnabled: result.searchEnabled || false,
        searchEngine: result.searchEngine || 'google',
        pluginNameGenerator: result.pluginNameGenerator || false,
        pluginAddressGenerator: result.pluginAddressGenerator || false,
        pluginCsvGenerator: result.pluginCsvGenerator || false,
        pluginEmailGrouper: result.pluginEmailGrouper || false,
        artifactsEnabled: result.artifactsEnabled || false,
        imageGenEnabled: result.imageGenEnabled || false,
        imageGenModel: result.imageGenModel || 'Nano Banana',
        customInstructionsEnabled: result.customInstructionsEnabled !== undefined ? result.customInstructionsEnabled : true,
        responseLanguage: result.responseLanguage || 'Auto'
      });

      if (result.chatHistory) setChat(result.chatHistory);
      setChatLoaded(true);
    }).catch((error) => {
      console.error('Unable to initialize local extension state:', error);
      setVaultError(error.message || 'Unable to initialize credential storage.');
      setCredentialMode('session');
      setChatLoaded(true);
    });
    
    // Listen for cross-tab or storage changes
    const unsubscribeStorage = AppStorage.listen((changes) => {
      if (changes.__storageError) {
        console.error('Storage operation failed:', changes.__storageError);
        return;
      }
      setSavedSettings(prev => ({ ...prev, ...changes }));
      if (changes.activeConfigs !== undefined) setActiveConfigs(hydrateProviderConfigs(changes.activeConfigs, credentialsRef.current));
      if (changes.selectedModel !== undefined) setSelectedModel(changes.selectedModel);
      if (changes.systemPrompt !== undefined) setSystemPrompt(changes.systemPrompt);
      if (changes.customInstruction !== undefined) setCustomInstruction(changes.customInstruction);
      if (changes.tabSummaryInstruction !== undefined) setTabSummaryInstruction(changes.tabSummaryInstruction);
      if (changes.defaultModel !== undefined) setDefaultModel(changes.defaultModel);
      if (changes.autoModelSwitch !== undefined) setAutoModelSwitch(changes.autoModelSwitch);
      if (changes.dataAnalysis !== undefined) setDataAnalysis(changes.dataAnalysis);
      if (changes.searchEnabled !== undefined) setSearchEnabled(changes.searchEnabled);
      if (changes.searchEngine !== undefined) setSearchEngine(changes.searchEngine);
      
      if (changes.pluginNameGenerator !== undefined) setPluginNameGenerator(changes.pluginNameGenerator);
      if (changes.pluginAddressGenerator !== undefined) setPluginAddressGenerator(changes.pluginAddressGenerator);
      if (changes.pluginCsvGenerator !== undefined) setPluginCsvGenerator(changes.pluginCsvGenerator);
      if (changes.pluginEmailGrouper !== undefined) setPluginEmailGrouper(changes.pluginEmailGrouper);
      
      if (changes.artifactsEnabled !== undefined) setArtifactsEnabled(changes.artifactsEnabled);
      if (changes.imageGenEnabled !== undefined) setImageGenEnabled(changes.imageGenEnabled);
      if (changes.imageGenModel !== undefined) setImageGenModel(changes.imageGenModel);
      if (changes.customInstructionsEnabled !== undefined) setCustomInstructionsEnabled(changes.customInstructionsEnabled);
      if (changes.responseLanguage !== undefined) setResponseLanguage(changes.responseLanguage);
      
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

    return unsubscribeStorage;
  }, []);

  useEffect(() => {
    if (chatLoaded) {
      const persistedChat = chat.map(({ imageDataUrl, status, ...item }) => imageDataUrl
        ? { ...item, text: item.text || '[Generated image — open chat session did not persist image bytes.]' }
        : { ...item, ...(status ? { status: '' } : {}) });
      AppStorage.set({ chatHistory: persistedChat });
      
      if (chat.length > 0) {
        setChatSessions(prevSessions => {
          let sessionId = currentSessionId;
          let newSessions = [...prevSessions];
          
          if (!sessionId) {
            sessionId = createSessionId();
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
              messages: persistedChat
            };
          } else {
            newSessions.unshift({
              id: sessionId,
              title,
              updatedAt: Date.now(),
              messages: persistedChat
            });
          }
          
          AppStorage.set({ chatSessions: newSessions });
          return newSessions;
        });
      }
    }
  }, [chat, chatLoaded, currentSessionId]);

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
    setChat([]);
    setCurrentSessionId(null);
    AppStorage.set({ chatSessions: [], chatHistory: [], currentSessionId: null });
    setShowHistory(false);
  };

  const clearCurrentChat = () => {
    const nextSessions = currentSessionId
      ? chatSessions.filter((session) => session.id !== currentSessionId)
      : chatSessions;
    setChatSessions(nextSessions);
    setChat([]);
    setCurrentSessionId(null);
    AppStorage.set({
      chatSessions: nextSessions,
      chatHistory: [],
      currentSessionId: null
    });

    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY', sessionId: currentSessionId }).catch(() => {});
    }
  };

  const clearCurrentForm = () => {
    if (settingsTab === 'gemini') {
      setGeminiApiKey('');
      setGeminiModel('gemini-2.5-flash');
    } else if (settingsTab === 'openai') {
      setOpenAiApiKey('');
      setOpenAiModel('gpt-4o');
    } else if (settingsTab === 'huggingface') {
      setHfApiKey('');
      setHfModel('mistralai/Mistral-Nemo-Instruct-2407');
    } else if (settingsTab === 'ollama') {
      setOllamaUrl('http://localhost:11434');
      setOllamaModel('llama3');
    }
    setEditingConfigId(null);
    setTestStatus('idle');
    setTestMessage('');
  };

  const persistSecureConfigs = async (configs, extra = {}, passphrase = vaultPassphrase) => {
    const credentials = credentialsFromConfigs(configs);
    const metadataResult = await AppStorage.set({ ...extra, activeConfigs: publicProviderConfigs(configs) });
    if (!metadataResult.ok) throw new Error(metadataResult.error?.message || 'Unable to save provider configuration.');
    if (credentialMode === 'encrypted') {
      if (!passphrase || passphrase.length < 10) {
        setVaultError('Unlock the encrypted vault before changing provider credentials.');
        setShowVaultDialog(true);
        throw new Error('Credential vault is locked.');
      }
      await CredentialVault.persistEncrypted(credentials, passphrase);
    } else {
      await CredentialVault.migrateSessionOnly(credentials);
      if (credentialMode !== 'session') setCredentialMode('session');
    }
    credentialsRef.current = credentials;
    const scrubResult = await AppStorage.remove(['geminiApiKey', 'openAiApiKey', 'hfApiKey']);
    if (!scrubResult.ok) throw new Error(scrubResult.error?.message || 'Unable to remove legacy provider credentials.');
    setSavedSettings((previous) => ({
      ...previous,
      ...extra,
      activeConfigs: configs,
      geminiApiKey: configs.find((config) => config.provider === 'gemini')?.apiKey || '',
      openAiApiKey: configs.find((config) => config.provider === 'openai')?.apiKey || '',
      hfApiKey: configs.find((config) => config.provider === 'huggingface')?.apiKey || ''
    }));
    return metadataResult;
  };

  const migrateVaultSessionOnly = async () => {
    try {
      setVaultError('');
      const credentials = collectLegacyCredentials(activeConfigs, savedSettings);
      const metadataResult = await AppStorage.set({ activeConfigs: publicProviderConfigs(activeConfigs) });
      if (!metadataResult.ok) throw new Error(metadataResult.error?.message || 'Unable to secure provider metadata.');
      await CredentialVault.migrateSessionOnly(credentials);
      credentialsRef.current = credentials;
      const scrubResult = await AppStorage.remove(['geminiApiKey', 'openAiApiKey', 'hfApiKey']);
      if (!scrubResult.ok) throw new Error(scrubResult.error?.message || 'Unable to remove legacy provider credentials.');
      setCredentialMode('session');
      setShowVaultDialog(false);
    } catch (error) {
      setVaultError(error.message || 'Credential migration failed.');
    }
  };

  const migrateVaultEncrypted = async (passphrase) => {
    try {
      setVaultError('');
      const credentials = collectLegacyCredentials(activeConfigs, savedSettings);
      const metadataResult = await AppStorage.set({ activeConfigs: publicProviderConfigs(activeConfigs) });
      if (!metadataResult.ok) throw new Error(metadataResult.error?.message || 'Unable to secure provider metadata.');
      await CredentialVault.persistEncrypted(credentials, passphrase);
      credentialsRef.current = credentials;
      const scrubResult = await AppStorage.remove(['geminiApiKey', 'openAiApiKey', 'hfApiKey']);
      if (!scrubResult.ok) throw new Error(scrubResult.error?.message || 'Unable to remove legacy provider credentials.');
      setVaultPassphrase(passphrase);
      setCredentialMode('encrypted');
      setShowVaultDialog(false);
    } catch (error) {
      setVaultError(error.message || 'Credential migration failed.');
    }
  };

  const unlockCredentialVault = async (passphrase) => {
    try {
      setVaultError('');
      const credentials = await CredentialVault.unlock(passphrase);
      credentialsRef.current = credentials;
      setActiveConfigs((configs) => hydrateProviderConfigs(configs, credentials));
      const credentialFor = (provider) => {
        const config = activeConfigs.find((item) => item.provider === provider && credentials[item.id]);
        return config ? credentials[config.id] : '';
      };
      setSavedSettings((previous) => ({
        ...previous,
        geminiApiKey: credentialFor('gemini'),
        openAiApiKey: credentialFor('openai'),
        hfApiKey: credentialFor('huggingface')
      }));
      setVaultPassphrase(passphrase);
      setShowVaultDialog(false);
    } catch (error) {
      setVaultError(error.message || 'Unable to unlock credential vault.');
    }
  };

  const relockCredentialVault = async () => {
    await CredentialVault.relock();
    credentialsRef.current = {};
    setVaultPassphrase('');
    setActiveConfigs((configs) => publicProviderConfigs(configs));
    setSavedSettings((previous) => ({ ...previous, geminiApiKey: '', openAiApiKey: '', hfApiKey: '' }));
    setCredentialMode('encrypted');
    setShowVaultDialog(true);
  };

  const handleEditConfig = (config) => {
    setEditingConfigId(config.id);
    setSettingsTab(config.provider);
    if (config.provider === 'gemini') {
      setGeminiApiKey(config.apiKey || '');
      setGeminiModel(config.model || 'gemini-2.5-flash');
    } else if (config.provider === 'openai') {
      setOpenAiApiKey(config.apiKey || '');
      setOpenAiModel(config.model || 'gpt-4o');
    } else if (config.provider === 'huggingface') {
      setHfApiKey(config.apiKey || '');
      setHfModel(config.model || 'mistralai/Mistral-Nemo-Instruct-2407');
    } else if (config.provider === 'ollama') {
      setOllamaUrl(config.url || 'http://localhost:11434');
      setOllamaModel(config.model || 'llama3');
    }
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleActivateConfig = async (configId) => {
    const updated = activeConfigs.map(c => ({
      ...c,
      isActive: c.id === configId
    }));
    setActiveConfigs(updated);
    const target = updated.find(c => c.id === configId);
    if (target) {
      setSelectedModel(target.provider);
      const updates = {
        selectedModel: target.provider
      };
      if (target.provider === 'gemini') {
        updates.geminiModel = target.model;
      } else if (target.provider === 'openai') {
        updates.openAiModel = target.model;
      } else if (target.provider === 'huggingface') {
        updates.hfModel = target.model;
      } else if (target.provider === 'ollama') {
        updates.ollamaUrl = target.url;
        updates.ollamaModel = target.model;
      }
      await AppStorage.set({ ...updates, activeConfigs: publicProviderConfigs(updated) });
    }
  };

  const handleDropdownSelect = async (provider, model) => {
    let target = activeConfigs.find(c => c.provider === provider && c.model === model);
    if (!target) {
       target = activeConfigs.find(c => c.provider === provider);
    }
    
    if (target) {
      const updated = activeConfigs.map(c => ({ ...c, isActive: c.id === target.id }));
      setActiveConfigs(updated);
      setSelectedModel(provider);
      const updates = { activeConfigs: publicProviderConfigs(updated), selectedModel: provider };
      
      if (provider === 'gemini') {
        setGeminiModel(model);
        updates.geminiModel = model;
      } else if (provider === 'openai') {
        setOpenAiModel(model);
        updates.openAiModel = model;
      } else if (provider === 'huggingface') {
        setHfModel(model);
        updates.hfModel = model;
      } else if (provider === 'ollama') {
        setOllamaModel(model);
        updates.ollamaUrl = target.url;
        updates.ollamaModel = model;
      }
      await AppStorage.set(updates);
    } else {
      setSelectedModel(provider);
      const updates = { selectedModel: provider };
      if (provider === 'gemini') { setGeminiModel(model); updates.geminiModel = model; }
      else if (provider === 'openai') { setOpenAiModel(model); updates.openAiModel = model; }
      else if (provider === 'huggingface') { setHfModel(model); updates.hfModel = model; }
      else if (provider === 'ollama') { setOllamaModel(model); updates.ollamaModel = model; }
      await AppStorage.set(updates);
    }
    setIsModelDropdownOpen(false);
  };

  const handleDeleteConfig = async (configId) => {
    const updated = activeConfigs.filter(c => c.id !== configId);
    if (editingConfigId === configId) {
      clearCurrentForm();
    }
    const updates = {};
    const wasActive = activeConfigs.find(c => c.id === configId)?.isActive;
    if (wasActive) {
      if (updated.length > 0) {
        updated[0].isActive = true;
        const next = updated[0];
        updates.selectedModel = next.provider;
        if (next.provider === 'gemini') { updates.geminiModel = next.model; }
        else if (next.provider === 'openai') { updates.openAiModel = next.model; }
        else if (next.provider === 'huggingface') { updates.hfModel = next.model; }
        else if (next.provider === 'ollama') { updates.ollamaModel = next.model; updates.ollamaUrl = next.url; }
      } else {
        updates.selectedModel = '';
      }
    }
    try {
      await persistSecureConfigs(updated, updates);
      setActiveConfigs(updated);
    } catch (error) {
      setTestStatus('error');
      setTestMessage(error.message || 'Unable to delete provider configuration.');
    }
  };

  const handleTestConfig = async (config) => {
    setActionLoading({ provider: config.id, action: 'test' });
    setTestStatus('loading');
    setTestMessage(`Testing ${config.provider} (${config.model})...`);
    try {
      const attempt = toProviderAttempt(config);
      if (!attempt) throw new Error('Unsupported provider configuration');
      await requestProviderProbe(attempt);
      setTestStatus('success');
      setTestMessage(`${config.provider.toUpperCase()} (${config.model}) connected successfully!`);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed');
    } finally {
      setActionLoading({ provider: null, action: null });
    }
  };

  const saveConfig = async (provider = settingsTab) => {
    setSaveStatus('saving');
    try {
      let keyOrUrl = '';
      let modelId = '';

      if (provider === 'gemini') {
        keyOrUrl = geminiApiKey.trim() || (editingConfigId ? activeConfigs.find(c => c.id === editingConfigId)?.apiKey : (savedSettings.geminiApiKey || activeConfigs.find(c => c.provider === 'gemini')?.apiKey));
        modelId = geminiModel.trim() || 'gemini-2.5-flash';
        if (!keyOrUrl) {
          setTestStatus('error');
          setTestMessage('Gemini API key is required');
          setSaveStatus('idle');
          return;
        }
      } else if (provider === 'openai') {
        keyOrUrl = openAiApiKey.trim() || (editingConfigId ? activeConfigs.find(c => c.id === editingConfigId)?.apiKey : (savedSettings.openAiApiKey || activeConfigs.find(c => c.provider === 'openai')?.apiKey));
        modelId = openAiModel.trim() || 'gpt-4o';
        if (!keyOrUrl) {
          setTestStatus('error');
          setTestMessage('OpenAI API key is required');
          setSaveStatus('idle');
          return;
        }
      } else if (provider === 'huggingface') {
        keyOrUrl = hfApiKey.trim() || (editingConfigId ? activeConfigs.find(c => c.id === editingConfigId)?.apiKey : (savedSettings.hfApiKey || activeConfigs.find(c => c.provider === 'huggingface')?.apiKey));
        modelId = hfModel.trim() || 'mistralai/Mistral-Nemo-Instruct-2407';
        if (!keyOrUrl) {
          setTestStatus('error');
          setTestMessage('Hugging Face token is required');
          setSaveStatus('idle');
          return;
        }
      } else if (provider === 'ollama') {
        keyOrUrl = ollamaUrl.trim() || (editingConfigId ? activeConfigs.find(c => c.id === editingConfigId)?.url : (savedSettings.ollamaUrl || activeConfigs.find(c => c.provider === 'ollama')?.url)) || 'http://localhost:11434';
        modelId = ollamaModel.trim() || 'llama3';
        if (!keyOrUrl) {
          setTestStatus('error');
          setTestMessage('Ollama URL is required');
          setSaveStatus('idle');
          return;
        }
      }

      let updatedConfigs = [...activeConfigs];
      let configId = editingConfigId;

      if (configId) {
        // Updating an existing configuration
        updatedConfigs = updatedConfigs.map(c => {
          if (c.id === configId) {
            return {
              ...c,
              provider,
              model: modelId,
              ...(provider === 'ollama' ? { url: keyOrUrl } : { apiKey: keyOrUrl })
            };
          }
          return c;
        });
      } else {
        // Checking if exact provider & model already exists
        const existingIdx = updatedConfigs.findIndex(c => c.provider === provider && c.model === modelId);
        if (existingIdx >= 0) {
          updatedConfigs[existingIdx] = {
            ...updatedConfigs[existingIdx],
            ...(provider === 'ollama' ? { url: keyOrUrl } : { apiKey: keyOrUrl })
          };
          configId = updatedConfigs[existingIdx].id;
        } else {
          // Adding new model configuration
          const newId = `${provider}_${modelId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`;
          const isFirst = updatedConfigs.length === 0;
          const newConfig = {
            id: newId,
            provider,
            model: modelId,
            ...(provider === 'ollama' ? { url: keyOrUrl } : { apiKey: keyOrUrl }),
            isActive: isFirst || !updatedConfigs.some(c => c.isActive)
          };
          updatedConfigs.push(newConfig);
          configId = newId;
        }
      }

      const activeConf = updatedConfigs.find(c => c.isActive) || updatedConfigs[0];
      const storageUpdates = {
        selectedModel: activeConf ? activeConf.provider : provider,
      };

      if (provider === 'gemini') {
        storageUpdates.geminiModel = modelId;
      } else if (provider === 'openai') {
        storageUpdates.openAiModel = modelId;
      } else if (provider === 'huggingface') {
        storageUpdates.hfModel = modelId;
      } else if (provider === 'ollama') {
        storageUpdates.ollamaUrl = keyOrUrl;
        storageUpdates.ollamaModel = modelId;
      }

      await persistSecureConfigs(updatedConfigs, storageUpdates);
      setActiveConfigs(updatedConfigs);

      // FORM KHIALI / RESET:
      // Clear input fields so the form is clean and empty
      setGeminiApiKey('');
      setGeminiModel('gemini-2.5-flash');
      setOpenAiApiKey('');
      setOpenAiModel('gpt-4o');
      setHfApiKey('');
      setHfModel('mistralai/Mistral-Nemo-Instruct-2407');
      setOllamaUrl('http://localhost:11434');
      setOllamaModel('llama3');
      setEditingConfigId(null);

      setSaveStatus('success');
      setTestStatus('success');
      setTestMessage(`Saved ${provider.toUpperCase()} (${modelId})! Form reset.`);
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      setTestStatus('error');
      setTestMessage('Failed to save configuration.');
    }
  };

  const saveApiKey = saveConfig;

  async function handleTestConnection(provider = settingsTab) {
    if (provider !== settingsTab) setSettingsTab(provider);
    setTestStatus('loading');
    setTestMessage('Testing connection...');
    try {
      const draftSettings = {
        ...savedSettings,
        geminiApiKey: geminiApiKey || savedSettings.geminiApiKey,
        geminiModel: geminiModel || savedSettings.geminiModel,
        openAiApiKey: openAiApiKey || savedSettings.openAiApiKey,
        openAiModel: openAiModel || savedSettings.openAiModel,
        hfApiKey: hfApiKey || savedSettings.hfApiKey,
        hfModel: hfModel || savedSettings.hfModel,
        ollamaUrl: ollamaUrl || savedSettings.ollamaUrl,
        ollamaModel: ollamaModel || savedSettings.ollamaModel
      };
      const attempt = providerAttemptFromSettings(draftSettings, provider);
      if (!attempt) throw new Error('Unsupported provider configuration');
      await requestProviderProbe(attempt);
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
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': geminiApiKey }
      });
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
    if (imageRequestIdRef.current && typeof chrome !== 'undefined' && chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: IMAGE_CANCEL_REQUEST, requestId: imageRequestIdRef.current }).catch(() => {});
      imageRequestIdRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
    let validated;
    try {
      validated = validateUploadBatch(files);
    } catch (error) {
      setChat((items) => [...items, { role: 'assistant', text: `**⚠️ File error:** ${error.message}` }]);
      e.target.value = '';
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    const newFiles = [];
    const readFile = (file, method) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(reader.error || new Error(`Unable to read ${file.name}.`));
      reader[method](file);
    });

    for (let i = 0; i < validated.length; i++) {
      const { file, extension } = validated[i];
      const isImage = file.type.startsWith('image/');
      try {
        let fileData;
        if (extension === 'pdf') {
          const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
          const arrayBuffer = await readFile(file, 'readAsArrayBuffer');
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
          if (pdf.numPages > FILE_LIMITS.maxPdfPages) throw new Error(`PDF exceeds the ${FILE_LIMITS.maxPdfPages}-page limit.`);
          let textContent = '';
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
            const page = await pdf.getPage(pageNum);
            const text = await page.getTextContent();
            textContent += `${text.items.map((item) => item.str).join(' ')}\n`;
          }
          const limited = limitExtractedText(textContent);
          fileData = { name: file.name, type: file.type, content: limited.text, truncated: limited.truncated, isImage: false, isPdf: true };
        } else if (isImage) {
          const dataUrl = await readFile(file, 'readAsDataURL');
          let extractedText = '';
          let ocrWorker = null;
          let ocrTimer = null;
          try {
            const Tesseract = await import('tesseract.js');
            const recognition = (async () => {
              ocrWorker = await Tesseract.createWorker('eng', 1, {
                workerPath: ocrWorkerUrl,
                workerBlobURL: false,
                corePath: ocrCoreUrl,
                langPath: OCR_LANGUAGE_PATH
              });
              return ocrWorker.recognize(dataUrl);
            })();
            const timeout = new Promise((_, reject) => {
              ocrTimer = setTimeout(() => reject(new Error('OCR timed out after 45 seconds.')), 45_000);
            });
            const { data } = await Promise.race([recognition, timeout]);
            extractedText = limitExtractedText(data?.text || '').text;
          } catch (error) {
            extractedText = `[OCR unavailable: ${error.message || 'processing failed'}]`;
          } finally {
            clearTimeout(ocrTimer);
            await ocrWorker?.terminate().catch(() => {});
          }
          fileData = { name: file.name, type: file.type, content: dataUrl, extractedText, isImage: true, isPdf: false };
        } else {
          const arrayBuffer = extension === 'xlsx' ? await readFile(file, 'readAsArrayBuffer') : null;
          const text = extension === 'xlsx' ? '' : await readFile(file, 'readAsText');
          const rows = await parseStructuredFile({ name: file.name, text, arrayBuffer });
          const analysis = analyzeRows(rows);
          const emailGroups = groupEmailRows(rows);
          fileData = {
            name: file.name, type: file.type, rows, analysis, emailGroups,
            content: structuredRowsToText(rows), isImage: false, isPdf: false
          };
        }
        newFiles.push(fileData);
      } catch (error) {
        newFiles.push({ name: file.name, type: file.type, content: `[File processing failed: ${error.message}]`, error: error.message, isImage: false, isPdf: extension === 'pdf' });
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
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

  const handleSummarizePage = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    sendMessage(tabSummaryInstruction, true);
  };

  async function sendMessage(overrideMessage = null, forceContext = false) {
    const isEvent = overrideMessage && typeof overrideMessage === 'object' && overrideMessage.nativeEvent;
    const actualOverrideMessage = isEvent ? '' : (typeof overrideMessage === 'string' ? overrideMessage : '');
    
    const userMessage = (actualOverrideMessage || message).trim();
    if (!userMessage || loading) return;

    // Validation based on selected model (using truth settings)
    const isConfigured = () => {
      const attempt = resolvePrimaryProviderAttempt(savedSettings, activeConfigs);
      return Boolean(attempt && (attempt.apiKey || attempt.baseUrl));
    };

    if (!isConfigured()) {
      setChat((items) => [
        ...items,
        { role: 'user', text: userMessage },
        { role: 'assistant', text: "⚠️ **Model API not configured!**\n\nPlease select an active model and configure its API key in the **Settings** before chatting." }
      ]);
      if (!actualOverrideMessage) setMessage('');
      return;
    }

    if (!privacyConsent && (includeContext || forceContext || includeScreenshot || uploadedFiles.length > 0 || imageGenEnabled)) {
      const accepted = window.confirm('Navix AI will send the enabled page/file/screenshot or image prompt data to the selected AI provider. Continue and remember this choice?');
      if (!accepted) return;
      setPrivacyConsent(true);
      await AppStorage.set({ privacyConsent: true });
    }

    const requestSessionId = currentSessionId || createSessionId();
    if (!currentSessionId) {
      setCurrentSessionId(requestSessionId);
      await AppStorage.set({ currentSessionId: requestSessionId });
    }

    setChat((items) => [
      ...items,
      { role: 'user', text: userMessage }
    ]);

    if (!actualOverrideMessage) setMessage('');
    setLoading(true);

    let domContext = '';

    if (includeContext || forceContext) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        try {
          // Try to fetch context from the active tab if running as a Chrome Extension
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab && activeTab.id) {
            const requestContext = () => new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(activeTab.id, { action: 'get_page_context' }, (response) => {
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(response);
              });
            });
            let contextResponse;
            try {
              contextResponse = await requestContext();
            } catch {
              try {
                await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['src/content.js'] });
                contextResponse = await requestContext();
              } catch (injectionError) {
                const url = activeTab.url ? new URL(activeTab.url) : null;
                if (url && ['http:', 'https:'].includes(url.protocol) && chrome.permissions) {
                  const origin = `${url.origin}/*`;
                  const granted = await chrome.permissions.request({ origins: [origin] });
                  if (granted) {
                    await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['src/content.js'] });
                    contextResponse = await requestContext();
                  }
                }
                if (!contextResponse) throw injectionError;
              }
            }
            
            if (contextResponse && contextResponse.text) {
              domContext = `URL: ${contextResponse.url}\nTitle: ${contextResponse.title}\n\nContent:\n${contextResponse.text}`;
            }
          }
        } catch (err) {
          console.warn("Error querying active tab. Continuing without context.", err);
        }
      } else {
        // Fallback for AI Studio Web Preview environment
        domContext = `URL: https://example.com/mock-page\nTitle: Mock Example Page\n\nContent:\nThis is simulated page content. The extension is running as a web application preview. The text extraction and summarization feature works successfully by extracting this simulated text context.`;
      }
    }

    let pluginContext = '';
    const syntheticIdentity = (savedSettings.pluginNameGenerator || savedSettings.pluginAddressGenerator)
      ? generateSyntheticIdentity()
      : null;
    if (savedSettings.pluginNameGenerator) {
      pluginContext += `\n[Name Generator] Synthetic identity: ${syntheticIdentity.firstName} ${syntheticIdentity.lastName}. Treat it as synthetic test data.`;
    }
    if (savedSettings.pluginAddressGenerator) {
      pluginContext += `\n[Address Generator] Synthetic address: ${syntheticIdentity.address}, ${syntheticIdentity.city}, ${syntheticIdentity.postalCode}, ${syntheticIdentity.country}. Treat it as synthetic test data.`;
    }
    if (savedSettings.pluginCsvGenerator) {
      pluginContext += "\n[PLUGIN: CSV/Excel/TXT Generator & Reader Active] You have capabilities to read and generate structured files (CSV/Excel/TXT).";
    }
    if (savedSettings.pluginEmailGrouper) {
      pluginContext += "\n[PLUGIN: Email Grouper Active] You have capabilities to automatically group and process emails efficiently.";
    }
    if (artifactsEnabled) {
      pluginContext += "\n[CAPABILITY: Artifacts Active] When writing significant code, documents, or UI layouts, output them in clean standalone artifact blocks.";
    }
    if (imageGenEnabled) {
      pluginContext += `\n[CAPABILITY: Image Generation Active: ${imageGenModel}] You can create and describe images using the ${imageGenModel} model.`;
    }
    if (dataAnalysis) {
      pluginContext += "\n[CAPABILITY: Data Analysis Active] Analytical, computational, and structured dataset queries are prioritized.";
    }
    const requestAttachments = uploadedFiles.map(f => {
        let contentToInject = f.content;
        if (f.isImage && f.extractedText) {
          contentToInject = `[Image OCR Extracted Text]:\n${f.extractedText}`;
        }
        if (f.analysis && dataAnalysis) contentToInject += `\n\n[LOCAL DATA ANALYSIS]\n${formatAnalysis(f.analysis)}`;
        if (f.emailGroups?.length && savedSettings.pluginEmailGrouper) contentToInject += `\n\n[LOCAL EMAIL GROUPS]\n${formatEmailGroups(f.emailGroups)}`;
        return { name: f.name, content: contentToInject };
      }).filter(file => typeof file.content === 'string' && file.content.trim());
    if (requestAttachments.length > 0) {
      // Clear files after attaching them
      setUploadedFiles([]);
    }

    const primaryAttempt = resolvePrimaryProviderAttempt(savedSettings, activeConfigs);
    const attemptList = primaryAttempt ? [primaryAttempt] : [];

    if (autoModelSwitch && activeConfigs && activeConfigs.length > 0) {
      const primaryIdentity = `${primaryAttempt?.provider || ''}\u0000${primaryAttempt?.modelId || ''}`;
      activeConfigs.forEach((config) => {
        const fallback = toProviderAttempt(config);
        if (!fallback) return;
        const identity = `${fallback.provider}\u0000${fallback.modelId}`;
        if (identity !== primaryIdentity) attemptList.push(fallback);
      });
    }

    if (imageGenEnabled) {
      setChat((items) => [...items, { role: 'assistant', text: '', status: `Generating with ${imageGenModel}...` }]);
      try {
        if (!(typeof chrome !== 'undefined' && chrome.runtime?.id)) throw new Error('Image generation is available in the installed extension.');
        const imageRequestId = createRequestId();
        imageRequestIdRef.current = imageRequestId;
        const response = await chrome.runtime.sendMessage({ type: IMAGE_GENERATE_REQUEST, requestId: imageRequestId, prompt: userMessage, imageModel: imageGenModel, attempt: primaryAttempt });
        if (!response?.success) throw new Error(response?.error?.message || 'Image generation failed.');
        const imageDataUrl = `data:${response.result.mimeType};base64,${response.result.data}`;
        setChat((items) => {
          const next = [...items];
          next[next.length - 1] = { role: 'assistant', text: `Generated with ${imageGenModel}.`, status: '', imageDataUrl };
          return next;
        });
      } catch (error) {
        setChat((items) => {
          const next = [...items];
          next[next.length - 1] = { role: 'assistant', text: `**⚠️ Image generation error:** ${error.message}`, status: '' };
          return next;
        });
      } finally {
        imageRequestIdRef.current = null;
        setLoading(false);
      }
      return;
    }

    setChat((items) => [...items, { role: 'assistant', text: '', status: '' }]);

    const executeRequest = () => {
      const requestId = createRequestId();
      const payloadObj = {
        message: userMessage,
        chatHistory: chat,
        sessionId: requestSessionId,
        requestId,
        model: primaryAttempt?.provider,
        providerAttempts: attemptList,
        pageContext: domContext,
        attachments: requestAttachments,
        includeScreenshot,
        thinkMode,
        systemPrompt,
        customInstruction,
        customInstructionsEnabled,
        responseLanguage,
        capabilityContext: pluginContext.trim(),
        searchEnabled: Boolean(savedSettings.searchEnabled),
        searchEngine: savedSettings.searchEngine || 'google'
      };

      const handleError = (errorMsg) => {
        setChat(prev => {
          const next = [...prev];
          if (next[next.length - 1].text) {
            next[next.length - 1].text += `\n\n**⚠️ Error:** ${errorMsg}`;
          } else {
            next[next.length - 1].text = `**⚠️ Error:** ${errorMsg}`;
          }
          next[next.length - 1].status = '';
          return next;
        });
        setLoading(false);
      };

      if (typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.runtime.connect) {
        try {
          const streamPort = chrome.runtime.connect({ name: 'chat_stream' });
          let receivedError = false;
          portRef.current = streamPort;
          
          streamPort.onMessage.addListener((msg) => {
            if (msg.requestId && msg.requestId !== requestId) return;
            if (msg.type === ACTION_CONFIRMATION && msg.confirmation) {
              setPendingConfirmation(msg.confirmation);
              setChat(prev => {
                const next = [...prev];
                next[next.length - 1].status = 'Waiting for action approval';
                return next;
              });
            } else if (msg.error) {
              receivedError = true;
              let errorMsg = typeof msg.error === 'object' ? (msg.error.message || JSON.stringify(msg.error)) : String(msg.error);
              try {
                const parsed = JSON.parse(errorMsg);
                if (parsed.error?.message) errorMsg = parsed.error.message;
                else if (parsed.message) errorMsg = parsed.message;
              } catch(e) {}
              streamPort.disconnect();
              if (portRef.current === streamPort) portRef.current = null;
              handleError(errorMsg);
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
              if (receivedError) return;
              setChat(prev => {
                const next = [...prev];
                next[next.length - 1].status = '';
                return next;
              });
              setLoading(false);
              streamPort.disconnect();
              if (portRef.current === streamPort) {
                  portRef.current = null;
              }
            }
          });

          streamPort.onDisconnect.addListener(() => {
            if (portRef.current !== streamPort) return;
            portRef.current = null;
            setPendingConfirmation(null);
            setLoading(false);
            setChat(prev => {
              const next = [...prev];
              if (next.length > 0 && next[next.length - 1].role === 'assistant') {
                next[next.length - 1].status = '';
              }
              return next;
            });
          });

          streamPort.postMessage({ type: 'AI_CHAT_REQUEST', ...payloadObj });
        } catch (err) {
          handleError("Extension connection failed.");
        }
      } else {
        // Fallback to our Web API Service Layer when not in Chrome Extension mode
        const doFetch = async () => {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payloadObj),
              signal: controller.signal
            });
            
            if (!res.ok) {
              const errText = await res.text();
              throw new Error(errText || "API request failed");
            }
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                setLoading(false);
                if (abortControllerRef.current === controller) abortControllerRef.current = null;
                break;
              }
              const chunkStr = decoder.decode(value, { stream: true });
              
              setChat(prev => {
                const next = [...prev];
                next[next.length - 1].text += chunkStr;
                return next;
              });
            }
          } catch (error) {
             if (error.name === 'AbortError') return;
             let errStr = error.message || "Error connecting to Web API service layer.";
             try {
               const parsed = JSON.parse(errStr);
               if (parsed.error) errStr = parsed.error;
             } catch(e) {}
             handleError(errStr);
          } finally {
            if (abortControllerRef.current === controller) abortControllerRef.current = null;
          }
        };
        doFetch();
      }
    };

    executeRequest();
  }

  const handleActionDecision = async (approved) => {
    const confirmation = pendingConfirmation;
    if (!confirmation) return;
    let finalApproval = approved;
    if (approved && confirmation.requiredOrigin && confirmation.requiredOrigin !== confirmation.origin && chrome?.permissions) {
      try {
        const parsed = new URL(confirmation.requiredOrigin);
        if (['http:', 'https:'].includes(parsed.protocol)) {
          const originPattern = `${parsed.origin}/*`;
          const alreadyGranted = await chrome.permissions.contains({ origins: [originPattern] });
          if (!alreadyGranted) finalApproval = await chrome.permissions.request({ origins: [originPattern] });
        }
      } catch {
        finalApproval = false;
      }
    }
    portRef.current?.postMessage({
      type: ACTION_DECISION,
      confirmationId: confirmation.confirmationId,
      requestId: confirmation.requestId,
      sessionId: confirmation.sessionId,
      approved: finalApproval
    });
    setPendingConfirmation(null);
  };

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
                      {activeConfigs.length} Configured
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

                  {editingConfigId && (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-[12px] text-blue-700 mb-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <Pencil className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">Editing: <strong>{activeConfigs.find(c => c.id === editingConfigId)?.model || 'Configuration'}</strong></span>
                      </div>
                      <button 
                        onClick={clearCurrentForm}
                        type="button"
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline ml-2 shrink-0 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="space-y-3 pt-0">
                    {settingsTab === 'gemini' && (
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[12px] font-medium text-slate-700">Gemini API Key</label>
                            {savedSettings.geminiApiKey && !geminiApiKey && (
                              <span className="text-[10px] text-emerald-600 font-medium">Saved key detected</span>
                            )}
                          </div>
                          <input 
                            type="password" 
                            value={geminiApiKey} 
                            onChange={(e) => setGeminiApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder={savedSettings.geminiApiKey ? "Using saved key (or enter new key)..." : "AIzaSy..."}
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
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[12px] font-medium text-slate-700">OpenAI API Key</label>
                            {savedSettings.openAiApiKey && !openAiApiKey && (
                              <span className="text-[10px] text-emerald-600 font-medium">Saved key detected</span>
                            )}
                          </div>
                          <input 
                            type="password" 
                            value={openAiApiKey} 
                            onChange={(e) => setOpenAiApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder={savedSettings.openAiApiKey ? "Using saved key (or enter new key)..." : "sk-..."}
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
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[12px] font-medium text-slate-700">Hugging Face Token</label>
                            {savedSettings.hfApiKey && !hfApiKey && (
                              <span className="text-[10px] text-emerald-600 font-medium">Saved token detected</span>
                            )}
                          </div>
                          <input 
                            type="password" 
                            value={hfApiKey} 
                            onChange={(e) => setHfApiKey(e.target.value)} 
                            className="w-full border border-slate-300 px-3 py-1.5 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            placeholder={savedSettings.hfApiKey ? "Using saved token (or enter new token)..." : "hf_..."}
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
                        disabled={testStatus === 'testing' || testStatus === 'loading'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                      >
                        {testStatus === 'testing' || testStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Test Connection
                      </button>
                      <button 
                        onClick={() => saveConfig(settingsTab)}
                        disabled={saveStatus === 'saving'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                      >
                        {saveStatus === 'saving' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : editingConfigId ? (
                          <Save className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        {editingConfigId ? 'Update' : 'Add'}
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
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[13px] font-semibold text-slate-800">Active Configurations</label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {activeConfigs.length} {activeConfigs.length === 1 ? 'model' : 'models'}
                    </span>
                  </div>
                  <div className="overflow-x-auto compact-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full text-left border-collapse min-w-[280px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500">Provider</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500">Model</th>
                          <th className="px-3 py-2 text-[11px] font-semibold text-slate-500 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-[12px]">
                        {activeConfigs.length > 0 ? (
                          activeConfigs.map(config => {
                            const isCurrentActive = (savedSettings.selectedModel === config.provider && (
                              config.provider === 'gemini' ? savedSettings.geminiModel === config.model :
                              config.provider === 'openai' ? savedSettings.openAiModel === config.model :
                              config.provider === 'huggingface' ? savedSettings.hfModel === config.model :
                              savedSettings.ollamaModel === config.model
                            )) || config.isActive;

                            return (
                              <tr key={config.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 group">
                                <td className="px-3 py-2.5 font-medium text-slate-700 flex items-center gap-1.5">
                                  {config.provider === 'gemini' && <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                  {config.provider === 'openai' && <Bot className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  {config.provider === 'huggingface' && <Box className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                  {config.provider === 'ollama' && <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                                  <span className="capitalize">{config.provider === 'huggingface' ? 'HuggingFace' : config.provider}</span>
                                  {isCurrentActive && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full ml-1 leading-none">
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 truncate max-w-[140px] font-mono text-[11px]">
                                  {config.model}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleActivateConfig(config.id)} 
                                      title={isCurrentActive ? "Active" : "Set as Active Model"} 
                                      className={`p-1 rounded-md transition-colors ${isCurrentActive ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                    >
                                      {actionLoading.provider === config.id && actionLoading.action === 'activate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                      onClick={() => handleEditConfig(config)} 
                                      title="Edit in form" 
                                      className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleTestConfig(config)} 
                                      title="Test API" 
                                      className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                                    >
                                      {actionLoading.provider === config.id && actionLoading.action === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteConfig(config.id)} 
                                      title="Delete" 
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    >
                                      {actionLoading.provider === config.id && actionLoading.action === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-3 py-4 text-center text-slate-400 italic">No configurations added yet</td>
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
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">Tab Summary Instruction</label>
                  <textarea 
                    value={tabSummaryInstruction}
                    onChange={(e) => { setTabSummaryInstruction(e.target.value); AppStorage.set({ tabSummaryInstruction: e.target.value }); }}
                    className="w-full h-20 border border-slate-300 px-3 py-2 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm resize-none"
                    placeholder="Please provide a concise summary of the current page context."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">This prompt is sent when you click the Summarize Page button.</p>
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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-700">Credential vault</p><p className="mt-0.5 text-[10px] text-slate-500">Mode: {credentialMode === 'encrypted' ? 'Encrypted persistent vault' : credentialMode === 'session' ? 'Session only' : 'Migration required'}</p></div><button onClick={() => setShowVaultDialog(true)} className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-blue-600 shadow-sm ring-1 ring-slate-200">Manage</button></div>
                  {credentialMode === 'encrypted' && <button onClick={relockCredentialVault} className="mt-2 w-full rounded-lg bg-slate-200/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200">Relock now</button>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-700">External data consent</p><p className="mt-0.5 text-[10px] text-slate-500">{privacyConsent ? 'Remembered for enabled context/files/screenshots.' : 'Not granted.'}</p></div><button onClick={() => { setPrivacyConsent(false); AppStorage.set({ privacyConsent: false }); }} className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">Revoke</button></div>
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
        {showVaultDialog && <CredentialVaultDialog
          mode={credentialMode}
          error={vaultError}
          onSessionOnly={migrateVaultSessionOnly}
          onEncrypt={migrateVaultEncrypted}
          onUnlock={unlockCredentialVault}
          onClose={credentialMode === 'encrypted' ? () => setShowVaultDialog(false) : null}
        />}
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
          <img src="/logo/branding/navix-ai-dark-icon.png" alt="Navix AI" className="h-7 w-7 object-cover rounded-md" />
          
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
                          onClick={() => handleDropdownSelect('gemini', m)}
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
                          onClick={() => handleDropdownSelect('openai', m)}
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
                          onClick={() => handleDropdownSelect('huggingface', m)}
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
                          onClick={() => handleDropdownSelect('ollama', m)}
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
            onClick={clearCurrentChat} 
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
              <img src="/logo/branding/navix-ai-light-icon.png" alt="Navix AI" className="w-12 h-12 object-contain opacity-75 grayscale contrast-125" />
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
              {item.role === 'user' ? <User className="w-3.5 h-3.5" /> : <img src="/logo/branding/navix-ai-dark-icon.png" className="w-full h-full object-cover rounded-full" alt="AI" />}
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
                <div className={`px-3.5 py-2.5 rounded-2xl break-words overflow-x-auto ${
                  item.role === 'user'
                    ? 'bg-slate-900 text-slate-50 rounded-tr-sm shadow-sm whitespace-pre-wrap'
                    : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
                }`}>
                  {item.role === 'user' ? (
                    item.text
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="markdown-body text-[13px]">
                        {item.imageDataUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <img src={item.imageDataUrl} alt="AI generated" className="h-auto w-full" />
                            <a href={item.imageDataUrl} download="navix-generated-image.png" className="flex items-center justify-center gap-1.5 border-t border-slate-100 px-3 py-2 text-[11px] font-medium text-blue-600 hover:bg-blue-50"><Download className="h-3.5 w-3.5" />Download image</a>
                          </div>
                        )}
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
                                <code {...props} className={`${className} bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[12px] break-all`}>
                                  {children}
                                </code>
                              );
                            },
                            a({ href, children }) {
                              return isSafeRenderedUrl(href) ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a> : <span title="Blocked unsafe link">{children}</span>;
                            },
                            img({ alt }) {
                              return <span className="inline-flex rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700" title="Remote images are blocked to prevent tracking and data exfiltration">[Remote image blocked{alt ? `: ${alt}` : ''}]</span>;
                            }
                          }}
                        >
                          {item.text}
                        </ReactMarkdown>
                        {artifactsEnabled && extractArtifacts(item.text).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">{extractArtifacts(item.text).map((artifact) => <button key={artifact.id} onClick={() => setCapabilityDrawer({ kind: 'artifact', ...artifact })} className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-100">Open {artifact.language} artifact</button>)}</div>
                        )}
                      </div>
                      <div className="flex justify-end pt-1 mt-1 border-t border-slate-200/60">
                        <CopyButton text={item.text} />
                      </div>
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
              <img src="/logo/branding/navix-ai-dark-icon.png" className="w-full h-full object-cover rounded-full" alt="AI" />
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
        <div className="flex items-center justify-between px-1 mb-2 relative">
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
              accept=".txt,.csv,.json,.xlsx,.pdf,.png,.jpg,.jpeg,.webp"
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
          <div className="flex items-center gap-1.5 relative">
            <button 
              id="chat-controls-btn"
              onClick={() => {
                setShowChatControls(!showChatControls);
                setShowImageModelPicker(false);
                setShowLanguagePicker(false);
              }} 
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${showChatControls ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} 
              title="Chat controls"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`} title="History">
              <Clock className="w-4 h-4" />
            </button>
            <button onClick={startNewChat} className="p-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 rounded-lg transition-colors" title="New Chat">
              <Plus className="w-4 h-4" />
            </button>

            {/* Chat Controls Dropdown Modal */}
            {showChatControls && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => {
                    setShowChatControls(false);
                    setShowImageModelPicker(false);
                    setShowLanguagePicker(false);
                  }} 
                />

                <div 
                  id="chat-controls-modal"
                  className="absolute bottom-full right-0 mb-2.5 w-[295px] sm:w-[315px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <h3 className="text-[16px] font-bold text-slate-800 tracking-tight">Chat controls</h3>
                    <button 
                      onClick={() => {
                        setShowChatControls(false);
                        setShowImageModelPicker(false);
                        setShowLanguagePicker(false);
                      }} 
                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section: Capabilities */}
                  <div className="space-y-2.5">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Capabilities
                    </div>

                    {/* Artifacts */}
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-teal-600">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">Artifacts</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={artifactsEnabled} 
                          onChange={(e) => { 
                            setArtifactsEnabled(e.target.checked); 
                            AppStorage.set({ artifactsEnabled: e.target.checked }); 
                          }} 
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Search */}
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-indigo-500">
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">Search</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={searchEnabled} 
                          onChange={(e) => { 
                            setSearchEnabled(e.target.checked); 
                            AppStorage.set({ searchEnabled: e.target.checked }); 
                          }} 
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Image with model dropdown */}
                    <div className="flex items-center justify-between py-0.5 relative">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-amber-500 shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">Image</span>
                        <div className="group relative flex items-center">
                          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-36 bg-slate-800 text-white text-[10px] p-1.5 rounded-md shadow-lg z-50 text-center pointer-events-none">
                            Image generation model
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImageModelPicker(!showImageModelPicker);
                            setShowLanguagePicker(false);
                          }}
                          className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-md transition-colors font-medium cursor-pointer"
                        >
                          <span className="max-w-[78px] truncate">{imageGenModel}</span>
                          {showImageModelPicker ? (
                            <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                          )}
                        </button>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={imageGenEnabled} 
                            onChange={(e) => { 
                              setImageGenEnabled(e.target.checked); 
                              AppStorage.set({ imageGenEnabled: e.target.checked }); 
                            }} 
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Select Generation Model Flyout Menu (Screenshot_8) */}
                      {showImageModelPicker && (
                        <div 
                          className="absolute right-0 top-full mt-1.5 w-[205px] bg-white border border-slate-200/90 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 border-b border-slate-100 bg-slate-50/70">
                            Select Generation Model
                          </div>
                          <div className="py-1 max-h-[175px] overflow-y-auto no-scrollbar">
                            {[
                              'Nano Banana',
                              'Nano Banana 2',
                              'Nano Banana Pro',
                              'GPT-image-2 (Low)',
                              'GPT-image-2 (Medium)',
                              'GPT-image-2 (High)'
                            ].map(model => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => {
                                  setImageGenModel(model);
                                  AppStorage.set({ imageGenModel: model });
                                  setShowImageModelPicker(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-[11.5px] flex items-center justify-between hover:bg-slate-50 transition-colors ${imageGenModel === model ? 'bg-blue-50/70 text-blue-600 font-medium' : 'text-slate-700'}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Sparkles className={`w-3 h-3 shrink-0 ${imageGenModel === model ? 'text-blue-500' : 'text-slate-400'}`} />
                                  <span className="truncate">{model}</span>
                                </div>
                                {imageGenModel === model && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Data Analysis */}
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-blue-500">
                          <Code2 className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700">Data Analysis</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={dataAnalysis} 
                          onChange={(e) => { 
                            setDataAnalysis(e.target.checked); 
                            AppStorage.set({ dataAnalysis: e.target.checked }); 
                          }} 
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Section: Personalization */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100/90 mt-3">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Personalization
                    </div>

                    {/* Custom Instructions */}
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-purple-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700 truncate">Custom Instructions</span>
                        <button 
                          type="button"
                          onClick={() => {
                            setTempCustomInstruction(customInstruction);
                            setShowCustomInstructionModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Custom Instructions"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={customInstructionsEnabled} 
                          onChange={(e) => { 
                            setCustomInstructionsEnabled(e.target.checked); 
                            AppStorage.set({ customInstructionsEnabled: e.target.checked }); 
                          }} 
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Response language */}
                    <div className="flex items-center justify-between py-0.5 relative">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-indigo-500 shrink-0">
                          <Languages className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] font-medium text-slate-700 truncate">Response language</span>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowLanguagePicker(!showLanguagePicker);
                          setShowImageModelPicker(false);
                        }}
                        className="flex items-center gap-1 text-[12px] text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded-md transition-colors font-medium cursor-pointer shrink-0"
                      >
                        <span>{responseLanguage}</span>
                        {showLanguagePicker ? (
                          <ChevronUp className="w-3 h-3 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {/* Language Selection Flyout */}
                      {showLanguagePicker && (
                        <div 
                          className="absolute right-0 top-full mt-1.5 w-[150px] bg-white border border-slate-200/90 rounded-xl shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 border-b border-slate-100 bg-slate-50/70">
                            Response Language
                          </div>
                          <div className="py-1 max-h-[160px] overflow-y-auto no-scrollbar">
                            {[
                              'Auto',
                              'English',
                              'Bengali',
                              'Spanish',
                              'French',
                              'German',
                              'Chinese',
                              'Japanese'
                            ].map(lang => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => {
                                  setResponseLanguage(lang);
                                  AppStorage.set({ responseLanguage: lang });
                                  setShowLanguagePicker(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-[11.5px] flex items-center justify-between hover:bg-slate-50 transition-colors ${responseLanguage === lang ? 'bg-blue-50/70 text-blue-600 font-medium' : 'text-slate-700'}`}
                              >
                                <span>{lang}</span>
                                {responseLanguage === lang && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Link to Settings */}
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <button 
                      type="button"
                      onClick={() => {
                        setShowChatControls(false);
                        setShowSettings(true);
                      }}
                      className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>All settings & API keys</span>
                    </button>
                  </div>
                </div>
              </>
            )}
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
                    <button type="button" onClick={() => file.rows && setCapabilityDrawer({ kind: 'data', ...file })} className="flex h-full w-full flex-col items-center justify-center text-slate-400" title={file.rows ? 'Open local data tools' : file.name}>
                      <FileText className="w-5 h-5 mb-0.5" />
                      <span className="text-[8px] font-medium uppercase truncate w-10 text-center">{file.name.split('.').pop()}</span>
                    </button>
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
              <button 
                onClick={handleSummarizePage}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-40" 
                title="Summarize Page"
              >
                <BookOpen className="w-4 h-4" />
              </button>
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

      {/* Custom Instructions Edit Modal */}
      {showCustomInstructionModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-4 space-y-3 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SquarePen className="w-4 h-4 text-purple-600" />
                <h4 className="text-[14px] font-semibold text-slate-800">Custom Instructions</h4>
              </div>
              <button 
                onClick={() => setShowCustomInstructionModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Define how you'd like the AI to behave, format responses, or enforce personality rules across all chats.
            </p>
            <textarea
              value={tempCustomInstruction}
              onChange={(e) => setTempCustomInstruction(e.target.value)}
              className="w-full h-28 border border-slate-200 rounded-xl p-3 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              placeholder="e.g. Always format with markdown, provide concise technical bullet points..."
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button 
                onClick={() => setShowCustomInstructionModal(false)}
                className="px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setCustomInstruction(tempCustomInstruction);
                  AppStorage.set({ customInstruction: tempCustomInstruction });
                  setShowCustomInstructionModal(false);
                }}
                className="px-3.5 py-1.5 text-[12px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      </aside>
      <ActionConfirmationDialog confirmation={pendingConfirmation} onDecision={handleActionDecision} />
      {showVaultDialog && <CredentialVaultDialog
        mode={credentialMode}
        error={vaultError}
        onSessionOnly={migrateVaultSessionOnly}
        onEncrypt={migrateVaultEncrypted}
        onUnlock={unlockCredentialVault}
        onClose={credentialMode === 'encrypted' ? () => setShowVaultDialog(false) : null}
      />}
      <CapabilityDrawer item={capabilityDrawer} onClose={() => setCapabilityDrawer(null)} />
    </div>
  );
}
