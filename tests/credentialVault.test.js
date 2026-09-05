import test from 'node:test';
import assert from 'node:assert/strict';
import { createCredentialVault, decryptCredentials, encryptCredentials, publicProviderConfigs } from '../src/core/credentialVault.js';
import { ErrorCode } from '../src/core/errorContract.js';

function storageArea(initial = {}) {
  const state = { ...initial };
  return {
    state,
    get(keys, callback) { callback(Object.fromEntries(keys.filter((key) => Object.hasOwn(state, key)).map((key) => [key, state[key]]))); },
    set(values, callback) { Object.assign(state, values); callback?.(); },
    remove(keys, callback) { for (const key of keys) delete state[key]; callback?.(); },
    async setAccessLevel() {}
  };
}

test('provider metadata never persists plaintext API keys', () => {
  assert.deepEqual(publicProviderConfigs([{ id: 'gemini_1', provider: 'gemini', apiKey: 'secret', model: 'x' }]), [
    { id: 'gemini_1', provider: 'gemini', model: 'x', credentialRef: 'gemini_1' }
  ]);
});

test('encrypted credential records round-trip and reject a wrong passphrase', async () => {
  const encrypted = await encryptCredentials({ gemini_1: 'secret' }, 'correct horse battery', { iterations: 100 });
  assert.doesNotMatch(JSON.stringify(encrypted), /secret/);
  assert.deepEqual(await decryptCredentials(encrypted, 'correct horse battery'), { gemini_1: 'secret' });
  await assert.rejects(decryptCredentials(encrypted, 'wrong passphrase'), (error) => error.code === ErrorCode.PROVIDER_AUTH_FAILED);
});

test('session migration scrubs legacy local keys and relock clears runtime secrets', async () => {
  const local = storageArea({ geminiApiKey: 'legacy', openAiApiKey: 'legacy-2' });
  const session = storageArea();
  const environment = { crypto: globalThis.crypto, chrome: { runtime: { lastError: null }, storage: { local, session } } };
  const vault = createCredentialVault(environment);
  await vault.migrateSessionOnly({ gemini_1: 'secret' });
  assert.equal(local.state.geminiApiKey, undefined);
  assert.equal(local.state.openAiApiKey, undefined);
  assert.deepEqual(await vault.readSession(), { gemini_1: 'secret' });
  await vault.relock();
  assert.deepEqual(await vault.readSession(), {});
});
