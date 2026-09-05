import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppStorage } from '../src/core/appStorage.js';

function chromeEnvironment({ writeError = null } = {}) {
  const data = {};
  const storageListeners = new Set();
  const localListeners = new Map();
  const environment = {
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: {
          get(keys, callback) {
            setTimeout(() => callback(Object.fromEntries(keys.flatMap((key) => key in data ? [[key, data[key]]] : []))), 0);
          },
          set(update, callback) {
            setTimeout(() => {
              environment.chrome.runtime.lastError = writeError ? { message: writeError } : null;
              if (!writeError) Object.assign(data, update);
              callback();
              environment.chrome.runtime.lastError = null;
            }, 0);
          },
          remove(keys, callback) {
            setTimeout(() => {
              environment.chrome.runtime.lastError = writeError ? { message: writeError } : null;
              if (!writeError) keys.forEach((key) => delete data[key]);
              callback();
              environment.chrome.runtime.lastError = null;
            }, 0);
          }
        },
        onChanged: {
          addListener: (listener) => storageListeners.add(listener),
          removeListener: (listener) => storageListeners.delete(listener)
        }
      }
    },
    CustomEvent: class {
      constructor(type, options) { this.type = type; this.detail = options.detail; }
    },
    dispatchEvent(event) {
      for (const listener of localListeners.get(event.type) || []) listener(event);
    },
    addEventListener(type, listener) {
      if (!localListeners.has(type)) localListeners.set(type, new Set());
      localListeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { localListeners.get(type)?.delete(listener); }
  };
  return { environment, data, storageListeners };
}

test('Chrome writes resolve only after callback completion and can be read back', async () => {
  const { environment, data } = chromeEnvironment();
  const storage = createAppStorage(environment);
  const result = await storage.set({ selectedModel: 'gemini' });
  assert.deepEqual(result, { ok: true });
  assert.equal(data.selectedModel, 'gemini');
  assert.deepEqual(await storage.get(['selectedModel']), { selectedModel: 'gemini' });
});

test('Chrome storage failures return a stable error result', async () => {
  const { environment } = chromeEnvironment({ writeError: 'quota exceeded' });
  const storage = createAppStorage(environment);
  const result = await storage.set({ selectedModel: 'gemini' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'STORAGE_QUOTA_EXCEEDED');
  assert.equal(result.error.message, 'Local storage quota was exceeded.');
});

test('credential scrubbing reports completion and storage failures accurately', async () => {
  const successEnvironment = chromeEnvironment();
  const successStorage = createAppStorage(successEnvironment.environment);
  await successStorage.set({ geminiApiKey: 'legacy' });
  assert.deepEqual(await successStorage.remove(['geminiApiKey']), { ok: true });
  assert.equal(successEnvironment.data.geminiApiKey, undefined);

  const failedEnvironment = chromeEnvironment({ writeError: 'quota exceeded' });
  const failedStorage = createAppStorage(failedEnvironment.environment);
  const failed = await failedStorage.remove(['geminiApiKey']);
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, 'STORAGE_QUOTA_EXCEEDED');
});

test('storage listeners are removable', () => {
  const { environment, storageListeners } = chromeEnvironment();
  const storage = createAppStorage(environment);
  const unsubscribe = storage.listen(() => {});
  assert.equal(storageListeners.size, 1);
  unsubscribe();
  assert.equal(storageListeners.size, 0);
});

test('legacy localStorage keys remain readable and writes keep the same prefix', async () => {
  const data = new Map([['copilot_chatHistory', JSON.stringify([{ role: 'user', text: 'legacy' }])]]);
  const environment = {
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key)
    },
    dispatchEvent: () => {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const storage = createAppStorage(environment);
  assert.deepEqual(await storage.get(['chatHistory']), {
    chatHistory: [{ role: 'user', text: 'legacy' }]
  });
  assert.deepEqual(await storage.set({ selectedModel: 'openai' }), { ok: true });
  assert.equal(data.get('copilot_selectedModel'), JSON.stringify('openai'));
});

test('corrupt fallback data is quarantined as an empty read result', async () => {
  const errors = [];
  const environment = {
    localStorage: {
      getItem: () => '{broken-json',
      setItem: () => {}
    },
    CustomEvent: class {
      constructor(type, options) { this.type = type; this.detail = options.detail; }
    },
    dispatchEvent: (event) => errors.push(event.detail),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const storage = createAppStorage(environment);
  assert.deepEqual(await storage.get(['chatHistory']), {});
  assert.equal(errors[0].__storageError.code, 'STORAGE_DATA_INVALID');
});

test('missing storage backend never reports a successful write', async () => {
  const storage = createAppStorage({});
  const result = await storage.set({ selectedModel: 'gemini' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'STORAGE_UNAVAILABLE');
  assert.deepEqual(await storage.get(['selectedModel']), {});
});
