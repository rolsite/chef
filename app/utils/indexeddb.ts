/**
 * Use IndexedDB for what it's really good for: a KV store for Chrome browsers
 * that sticks around for quite a while.
 */

class KeyValueStore {
  dbPromise: Promise<IDBDatabase>;
  storeName: string;

  constructor(dbName: string, storeName: string) {
    this.storeName = storeName;
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const dbRequest = indexedDB.open(dbName, 1);
      dbRequest.onerror = () => reject(dbRequest.error);
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onupgradeneeded = () => {
        dbRequest.result.createObjectStore(storeName);
      };
    });
  }

  get(key: string): Promise<any> {
    return this.dbPromise.then(
      (db) =>
        new Promise<any>((resolve, reject) => {
          const transaction = db.transaction(this.storeName, 'readonly');
          const req = transaction.objectStore(this.storeName).get(key);
          transaction.oncomplete = () => resolve(req.result);
          transaction.onabort = transaction.onerror = () => {
            reject(transaction.error);
          };
        }),
    );
  }

  set(key: string, value: any): Promise<any> {
    return this.dbPromise.then(
      (db) =>
        new Promise<any>((resolve, reject) => {
          const transaction = db.transaction(this.storeName, 'readwrite');
          const req = transaction.objectStore(this.storeName).put(value, key);
          transaction.oncomplete = () => resolve(req.result);
          transaction.onabort = transaction.onerror = () => {
            reject(transaction.error);
          };
        }),
    );
  }
}

const kvstore = new KeyValueStore('data', 'store');

/**
 * Caches a single version of a resource
 */
export class CachedResource {
  private resourceUrl: string;
  private cacheKey: string;

  constructor(resourceUrl: string, key: string) {
    this.resourceUrl = resourceUrl;
    this.cacheKey = key;
  }

  async get(version?: string): Promise<ArrayBuffer> {
    const cachedData = await kvstore.get(this.cacheKey);
    const cachedVersion = await kvstore.get(this.cacheKey + '-version');

    if (cachedData && version === cachedVersion) {
      return cachedData;
    }

    if (cachedData && version !== cachedVersion) {
      console.log('Out of date resource', this.cacheKey, 'so redownloading from', this.resourceUrl);
      console.log('required version', version, 'but had version', cachedVersion, 'stored');
    }

    const response = await fetch(this.resourceUrl);
    const data = await response.arrayBuffer();

    try {
      await kvstore.set(this.cacheKey, data);
      await kvstore.set(this.cacheKey + '-version', version);
    } catch (e) {
      console.log('Failure writing to IndexedDB, maybe private browsing / incognito mode or low on disk space: ', e);
    }

    return data;
  }
}

export async function cachedLargeDownload(url: string, cacheKey?: string): Promise<ArrayBuffer> {
  if (cacheKey) {
    const resp = await fetch(url, { method: 'HEAD' });
    if (!resp.ok) {
      throw new Error(`Failed to download ${cacheKey} (${resp.statusText}): ${resp.statusText}`);
    }
    const version = resp.headers.get('etag') || undefined;
    return await new CachedResource(url, cacheKey).get(version);
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download (${resp.statusText}): ${resp.statusText}`);
  }
  return await resp.arrayBuffer();
}
