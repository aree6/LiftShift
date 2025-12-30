const SECRET_PREFIX = 'hevy_analytics_secret:';
const PLAIN_FALLBACK_PREFIX = 'hevy_analytics_secret_plain:';

const DB_NAME = 'hevy_analytics_secure_credentials';
const DB_VERSION = 1;
const KEY_STORE = 'keys';
const KEY_ID = 'aes-gcm-v1';

const isBrowser = (): boolean => typeof window !== 'undefined';

const supportsSecureStorage = (): boolean => {
  try {
    if (!isBrowser()) return false;
    if (window.isSecureContext !== true) return false;
    return Boolean(window.crypto?.subtle) && typeof window.indexedDB !== 'undefined';
  } catch {
    return false;
  }
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (b64: string): Uint8Array => {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) {
        db.createObjectStore(KEY_STORE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
};

const getStoredKey = (db: IDBDatabase): Promise<CryptoKey | null> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const store = tx.objectStore(KEY_STORE);
    const req = store.get(KEY_ID);

    req.onsuccess = () => {
      const row = req.result as { id: string; key: CryptoKey } | undefined;
      resolve(row?.key ?? null);
    };

    req.onerror = () => reject(req.error ?? new Error('Failed to read crypto key'));
  });
};

const putStoredKey = (db: IDBDatabase, key: CryptoKey): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    const store = tx.objectStore(KEY_STORE);
    const req = store.put({ id: KEY_ID, key });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to store crypto key'));
  });
};

const getOrCreateAesKey = async (): Promise<CryptoKey> => {
  const db = await openDb();
  const existing = await getStoredKey(db);
  if (existing) return existing;

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  await putStoredKey(db, key);
  return key;
};

const encryptString = async (plaintext: string): Promise<string> => {
  const key = await getOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const payload = {
    v: 1,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(ciphertext)),
  };

  return JSON.stringify(payload);
};

const decryptString = async (payload: string): Promise<string> => {
  const parsed = JSON.parse(payload) as { v?: number; iv?: string; data?: string };
  if (parsed?.v !== 1 || !parsed.iv || !parsed.data) throw new Error('Invalid encrypted payload');

  const key = await getOrCreateAesKey();
  const iv = fromBase64(parsed.iv);
  const data = fromBase64(parsed.data);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plaintext);
};

const buildEncryptedStorageKey = (key: string): string => `${SECRET_PREFIX}${key}`;
const buildPlainFallbackKey = (key: string): string => `${PLAIN_FALLBACK_PREFIX}${key}`;

export const hasEncryptedCredential = (key: string): boolean => {
  try {
    if (!isBrowser()) return false;
    return localStorage.getItem(buildEncryptedStorageKey(key)) != null || sessionStorage.getItem(buildPlainFallbackKey(key)) != null;
  } catch {
    return false;
  }
};

export const clearEncryptedCredential = (key: string): void => {
  try {
    if (!isBrowser()) return;
    localStorage.removeItem(buildEncryptedStorageKey(key));
    sessionStorage.removeItem(buildPlainFallbackKey(key));
  } catch {
  }
};

export const saveEncryptedCredential = async (key: string, value: string): Promise<void> => {
  try {
    if (!isBrowser()) return;

    if (!supportsSecureStorage()) {
      sessionStorage.setItem(buildPlainFallbackKey(key), value);
      return;
    }

    const encrypted = await encryptString(value);
    localStorage.setItem(buildEncryptedStorageKey(key), encrypted);
    sessionStorage.removeItem(buildPlainFallbackKey(key));
  } catch {
    try {
      if (!isBrowser()) return;
      sessionStorage.setItem(buildPlainFallbackKey(key), value);
    } catch {
    }
  }
};

export const getEncryptedCredential = async (key: string): Promise<string | null> => {
  try {
    if (!isBrowser()) return null;

    const plainFallback = sessionStorage.getItem(buildPlainFallbackKey(key));
    if (plainFallback != null) return plainFallback;

    const payload = localStorage.getItem(buildEncryptedStorageKey(key));
    if (!payload) return null;

    if (!supportsSecureStorage()) return null;

    return await decryptString(payload);
  } catch {
    return null;
  }
};
