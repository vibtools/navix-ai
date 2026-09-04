const KEYS = {
  provider: 'ai_provider',
  apiKey: 'ai_api_key'
};

export function saveAISettings(settings) {
  return chrome.storage.local.set({
    [KEYS.provider]: settings.provider,
    [KEYS.apiKey]: settings.apiKey
  });
}

export function loadAISettings() {
  return chrome.storage.local.get(Object.values(KEYS));
}
