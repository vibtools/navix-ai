import { AppError, ErrorCode, toErrorPayload } from './errorContract.js';

const DATABASE_NAME = 'AICopilotDB';
const STORE_NAME = 'settings';
const LOCAL_PREFIX = 'copilot_';

function storageError(code, message, cause) {
  const normalizedMessage = String(message || '').toLowerCase();
  if (normalizedMessage.includes('quota')) {
    return new AppError(ErrorCode.STORAGE_QUOTA_EXCEEDED, 'Local storage quota was exceeded.', { cause });
  }
  return new AppError(code, message, { cause });
}

function createStorageEvent(environment, detail) {
  if (typeof environment.CustomEvent === 'function') {
    return new environment.CustomEvent('app-storage-changed', { detail });
  }
  return { type: 'app-storage-changed', detail };
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted.'));
  });
}

export function createAppStorage(environment = globalThis) {
  let writeQueue = Promise.resolve();
  let databasePromise;

  const dispatchError = (error) => {
    environment.dispatchEvent?.(createStorageEvent(environment, {
      __storageError: toErrorPayload(error)
    }));
  };

  const openDatabase = () => {
    if (databasePromise !== undefined) return databasePromise;
    const indexedDb = environment.indexedDB;
    if (!indexedDb?.open) {
      databasePromise = Promise.resolve(null);
      return databasePromise;
    }

    databasePromise = new Promise((resolve) => {
      try {
        const request = indexedDb.open(DATABASE_NAME, 1);
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return databasePromise;
  };

  const chromeStorage = () => environment.chrome?.storage?.local;

  const chromeGet = (keys) => new Promise((resolve, reject) => {
    chromeStorage().get(keys, (result) => {
      const error = environment.chrome?.runtime?.lastError;
      if (error) {
        reject(storageError(ErrorCode.STORAGE_READ_FAILED, error.message || 'Chrome storage read failed.', error));
        return;
      }
      resolve(result || {});
    });
  });

  const chromeSet = (data) => new Promise((resolve, reject) => {
    chromeStorage().set(data, () => {
      const error = environment.chrome?.runtime?.lastError;
      if (error) {
        reject(storageError(ErrorCode.STORAGE_WRITE_FAILED, error.message || 'Chrome storage write failed.', error));
        return;
      }
      resolve();
    });
  });

  const localGet = (keys) => {
    if (typeof environment.localStorage?.getItem !== 'function') {
      throw new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Local storage is unavailable.');
    }
    const result = {};
    for (const key of keys) {
      const value = environment.localStorage?.getItem(`${LOCAL_PREFIX}${key}`);
      if (value !== null && value !== undefined) {
        try {
          result[key] = JSON.parse(value);
        } catch (cause) {
          throw new AppError(ErrorCode.STORAGE_DATA_INVALID, 'Stored data is invalid and was ignored.', { cause });
        }
      }
    }
    return result;
  };

  const localSet = (data) => {
    if (typeof environment.localStorage?.setItem !== 'function') {
      throw new AppError(ErrorCode.STORAGE_UNAVAILABLE, 'Local storage is unavailable.');
    }
    for (const [key, value] of Object.entries(data)) {
      environment.localStorage?.setItem(`${LOCAL_PREFIX}${key}`, JSON.stringify(value));
    }
  };

  const idbGet = async (database, keys) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const result = {};
    await Promise.all(keys.map((key) => new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result !== undefined) result[key] = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error || new Error(`Failed to read ${key}.`));
    })));
    await done;
    return result;
  };

  const idbSet = async (database, data) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const done = transactionDone(transaction);
    const store = transaction.objectStore(STORE_NAME);
    for (const [key, value] of Object.entries(data)) store.put(value, key);
    await done;
  };

  const persist = async (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new AppError(ErrorCode.STORAGE_WRITE_FAILED, 'Storage update must be an object.');
    }

    if (chromeStorage()) {
      await chromeSet(data);
    } else {
      const database = await openDatabase();
      if (database) await idbSet(database, data);
      else localSet(data);
      environment.dispatchEvent?.(createStorageEvent(environment, data));
    }
    return { ok: true };
  };

  return {
    async get(keys) {
      const normalizedKeys = Array.isArray(keys) ? keys : [keys];
      try {
        if (chromeStorage()) return await chromeGet(normalizedKeys);
        const database = await openDatabase();
        return database ? await idbGet(database, normalizedKeys) : localGet(normalizedKeys);
      } catch (cause) {
        const error = cause instanceof AppError
          ? cause
          : new AppError(ErrorCode.STORAGE_READ_FAILED, 'Unable to read local settings.', { cause });
        dispatchError(error);
        return {};
      }
    },

    set(data) {
      const operation = writeQueue.then(() => persist(data));
      writeQueue = operation.catch(() => undefined);
      return operation.catch((cause) => {
        const error = cause instanceof AppError
          ? cause
          : storageError(ErrorCode.STORAGE_WRITE_FAILED, 'Unable to save local settings.', cause);
        dispatchError(error);
        return { ok: false, error: toErrorPayload(error) };
      });
    },

    listen(callback) {
      const chromeListener = (changes, area) => {
        if (area !== 'local') return;
        const parsed = {};
        for (const [key, value] of Object.entries(changes)) parsed[key] = value.newValue;
        callback(parsed);
      };
      const localListener = (event) => callback(event.detail || {});

      environment.chrome?.storage?.onChanged?.addListener?.(chromeListener);
      environment.addEventListener?.('app-storage-changed', localListener);

      return () => {
        environment.chrome?.storage?.onChanged?.removeListener?.(chromeListener);
        environment.removeEventListener?.('app-storage-changed', localListener);
      };
    }
  };
}

export const AppStorage = createAppStorage();
