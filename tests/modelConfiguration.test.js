import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledModelConfigs, isPrimaryModelConfig, selectPrimaryModelConfig, toggleModelConfig } from '../src/core/modelConfiguration.js';

const configs = [
  { id: 'one', provider: 'gemini', model: 'gemini-a', isActive: true },
  { id: 'two', provider: 'openai', model: 'gpt-a', isActive: false },
  { id: 'three', provider: 'gemini', model: 'gemini-b', isActive: true }
];

test('enabling a model preserves every other enabled model', () => {
  const updated = toggleModelConfig(configs, 'two');
  assert.deepEqual(enabledModelConfigs(updated).map((config) => config.id), ['one', 'two', 'three']);
  assert.equal(configs[1].isActive, false);
});

test('selecting a primary model enables it without disabling fallbacks', () => {
  const updated = selectPrimaryModelConfig(configs, 'two');
  assert.deepEqual(enabledModelConfigs(updated).map((config) => config.id), ['one', 'two', 'three']);
  assert.equal(isPrimaryModelConfig(updated[1], { selectedModel: 'openai', openAiModel: 'gpt-a' }), true);
});
