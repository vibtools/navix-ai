// AI Provider Settings Manager
// Stores provider configuration using Chrome storage.

export async function saveAISettings(settings) {
  await chrome.storage.local.set({ aiSettings: settings });
}

export async function getAISettings() {
  const data = await chrome.storage.local.get(['aiSettings']);
  return data.aiSettings || {
    provider: 'gemini',
    model: '',
    apiKey: ''
  };
}
