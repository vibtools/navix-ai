import { AppError, ErrorCode } from './errorContract.js';

export const CREDENTIAL_MODE_KEY = 'credentialStorageMode';
export const ENCRYPTED_VAULT_KEY = 'encryptedCredentialVault';
export const SESSION_VAULT_KEY = 'navixSessionCredentials';
export const LEGACY_CREDENTIAL_KEYS = Object.freeze(['geminiApiKey', 'openAiApiKey', 'hfApiKey']);
const CURRENT_VERSION = 1;

function bytesToBase64(bytes, environment = globalThis) {
  if (typeof environment.btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return environment.btoa(binary);
  }
  return globalThis.Buffer.from(bytes).toString('base64');
}

function base64ToBytes(value, environment = globalThis) {
  if (typeof environment.atob === 'function') {
    const binary = environment.atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return new Uint8Array(globalThis.Buffer.from(value, 'base64'));
}

export function publicProviderConfigs(configs) {
  return (Array.isArray(configs) ? configs : []).map(({ apiKey, ...config }) => ({ ...config, credentialRef: apiKey ? config.id : config.credentialRef }));
}

export function credentialsFromConfigs(configs) {
  return Object.fromEntries((Array.isArray(configs) ? configs : []).flatMap((config) =>
    config?.id && typeof config.apiKey === 'string' && config.apiKey ? [[config.id, config.apiKey]] : []
  ));
}

export function hydrateProviderConfigs(configs, credentials) {
  return (Array.isArray(configs) ? configs : []).map((config) => ({
    ...config,
    ...(credentials?.[config.id] ? { apiKey: credentials[config.id] } : {})
  }));
}

export function collectLegacyCredentials(configs, settings = {}) {
  const credentials = credentialsFromConfigs(configs);
  const byProvider = {
    gemini: settings.geminiApiKey,
    openai: settings.openAiApiKey,
    huggingface: settings.hfApiKey
  };
  for (const config of Array.isArray(configs) ? configs : []) {
    if (!credentials[config.id] && byProvider[config.provider]) credentials[config.id] = byProvider[config.provider];
  }
  return credentials;
}

export async function encryptCredentials(credentials, passphrase, { cryptoObject = globalThis.crypto, environment = globalThis, iterations = 310_000 } = {}) {
  if (typeof passphrase !== 'string' || passphrase.length < 10) throw new AppError(ErrorCode.INVALID_REQUEST, 'Vault passphrase must contain at least 10 characters.');
  const encoder = new globalThis.TextEncoder();
  const salt = cryptoObject.getRandomValues(new Uint8Array(16));
  const iv = cryptoObject.getRandomValues(new Uint8Array(12));
  const material = await cryptoObject.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await cryptoObject.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ciphertext = await cryptoObject.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(credentials || {})));
  return { version: CURRENT_VERSION, algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA-256', iterations, salt: bytesToBase64(salt, environment), iv: bytesToBase64(iv, environment), ciphertext: bytesToBase64(new Uint8Array(ciphertext), environment) };
}

export async function decryptCredentials(record, passphrase, { cryptoObject = globalThis.crypto, environment = globalThis } = {}) {
  try {
    if (!record || record.version !== CURRENT_VERSION || record.algorithm !== 'AES-GCM') throw new Error('Unsupported vault format');
    const encoder = new globalThis.TextEncoder();
    const material = await cryptoObject.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await cryptoObject.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(record.salt, environment), iterations: record.iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await cryptoObject.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(record.iv, environment) }, key, base64ToBytes(record.ciphertext, environment));
    const parsed = JSON.parse(new globalThis.TextDecoder().decode(plaintext));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid credential map');
    return parsed;
  } catch (cause) {
    throw new AppError(ErrorCode.PROVIDER_AUTH_FAILED, 'Unable to unlock the credential vault. Check the passphrase.', { cause });
  }
}

function storageCall(area, method, value, environment) {
  return new Promise((resolve, reject) => {
    area[method](value, (result) => {
      const error = environment.chrome?.runtime?.lastError;
      if (error) reject(new AppError(ErrorCode.STORAGE_WRITE_FAILED, error.message || 'Credential storage failed.', { cause: error }));
      else resolve(result);
    });
  });
}

export function createCredentialVault(environment = globalThis) {
  let memorySession = {};
  const local = () => environment.chrome?.storage?.local;
  const session = () => environment.chrome?.storage?.session;
  const get = async (area, keys) => area ? storageCall(area, 'get', keys, environment) : {};
  const set = async (area, data) => area ? storageCall(area, 'set', data, environment) : undefined;
  const remove = async (area, keys) => area ? storageCall(area, 'remove', keys, environment) : undefined;

  return {
    async initialize() {
      if (local()?.setAccessLevel) await local().setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
      const state = await get(local(), [CREDENTIAL_MODE_KEY, ENCRYPTED_VAULT_KEY]);
      const sessionState = await this.readSession();
      return { mode: state[CREDENTIAL_MODE_KEY] || 'legacy', encrypted: state[ENCRYPTED_VAULT_KEY] || null, credentials: sessionState };
    },
    async readSession() {
      if (!session()) return { ...memorySession };
      const result = await get(session(), [SESSION_VAULT_KEY]);
      return result[SESSION_VAULT_KEY] || {};
    },
    async writeSession(credentials) {
      memorySession = { ...(credentials || {}) };
      await set(session(), { [SESSION_VAULT_KEY]: memorySession });
      return memorySession;
    },
    async migrateSessionOnly(credentials) {
      await this.writeSession(credentials);
      await set(local(), { [CREDENTIAL_MODE_KEY]: 'session' });
      await remove(local(), [ENCRYPTED_VAULT_KEY, ...LEGACY_CREDENTIAL_KEYS]);
      return { mode: 'session', credentials };
    },
    async persistEncrypted(credentials, passphrase, options) {
      const encrypted = await encryptCredentials(credentials, passphrase, { environment, ...options });
      await set(local(), { [CREDENTIAL_MODE_KEY]: 'encrypted', [ENCRYPTED_VAULT_KEY]: encrypted });
      await this.writeSession(credentials);
      await remove(local(), LEGACY_CREDENTIAL_KEYS);
      return { mode: 'encrypted', encrypted, credentials };
    },
    async unlock(passphrase) {
      const state = await get(local(), [ENCRYPTED_VAULT_KEY]);
      const credentials = await decryptCredentials(state[ENCRYPTED_VAULT_KEY], passphrase, { environment });
      await this.writeSession(credentials);
      return credentials;
    },
    async relock() {
      memorySession = {};
      await remove(session(), [SESSION_VAULT_KEY]);
    },
    async clear() {
      await this.relock();
      await remove(local(), [ENCRYPTED_VAULT_KEY, ...LEGACY_CREDENTIAL_KEYS]);
      await set(local(), { [CREDENTIAL_MODE_KEY]: 'session' });
    }
  };
}

export const CredentialVault = createCredentialVault();
