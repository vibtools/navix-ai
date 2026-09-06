export function isPrimaryModelConfig(config, settings = {}) {
  if (!config || config.provider !== settings.selectedModel) return false;
  const selected = config.provider === 'gemini' ? settings.geminiModel
    : config.provider === 'openai' ? settings.openAiModel
      : config.provider === 'huggingface' ? settings.hfModel
        : settings.ollamaModel;
  return config.model === selected;
}

export function toggleModelConfig(configs, configId) {
  return (Array.isArray(configs) ? configs : []).map((config) => config.id === configId
    ? { ...config, isActive: !config.isActive }
    : { ...config });
}

export function selectPrimaryModelConfig(configs, configId) {
  return (Array.isArray(configs) ? configs : []).map((config) => config.id === configId
    ? { ...config, isActive: true }
    : { ...config });
}

export function enabledModelConfigs(configs) {
  return (Array.isArray(configs) ? configs : []).filter((config) => config?.isActive);
}

export function providerSelectionUpdates(config) {
  if (!config) return { selectedModel: '' };
  const updates = { selectedModel: config.provider };
  if (config.provider === 'gemini') updates.geminiModel = config.model;
  else if (config.provider === 'openai') updates.openAiModel = config.model;
  else if (config.provider === 'huggingface') updates.hfModel = config.model;
  else if (config.provider === 'ollama') {
    updates.ollamaModel = config.model;
    updates.ollamaUrl = config.url;
  }
  return updates;
}
