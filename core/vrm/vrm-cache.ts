import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'voxie-vrm-cache';
const STORE_NAME = 'models';
const VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function fetchVrmWithCache(url: string, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
  try {
    const db = await getDb();
    
    // Check if we have it in cache
    const cachedBuffer = await db.get(STORE_NAME, url);
    if (cachedBuffer) {
      console.log(`[VRMCache] Cache hit for ${url}`);
      if (onProgress) onProgress(1); // 100%
      return cachedBuffer as ArrayBuffer;
    }

    console.log(`[VRMCache] Cache miss for ${url}, downloading...`);
    
    // Download if not in cache
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch VRM: ${response.statusText}`);

    // If progress callback is provided, we can read stream
    if (onProgress && response.body && response.headers.has('content-length')) {
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          if (contentLength > 0) {
            onProgress(receivedLength / contentLength);
          }
        }
      }

      const combined = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        combined.set(chunk, position);
        position += chunk.length;
      }
      
      const buffer = combined.buffer;
      
      // Save to cache asynchronously
      db.put(STORE_NAME, buffer, url).catch(e => console.warn('[VRMCache] Failed to cache model:', e));
      return buffer;
    } else {
      const buffer = await response.arrayBuffer();
      if (onProgress) onProgress(1);
      
      // Save to cache asynchronously
      db.put(STORE_NAME, buffer, url).catch(e => console.warn('[VRMCache] Failed to cache model:', e));
      return buffer;
    }
  } catch (error) {
    console.error('[VRMCache] Error:', error);
    // Fallback to normal fetch without cache if indexedDB fails
    const res = await fetch(url);
    return await res.arrayBuffer();
  }
}

export async function clearVrmCache(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
    console.log('[VRMCache] Cache cleared successfully');
  } catch (error) {
    console.error('[VRMCache] Failed to clear cache:', error);
  }
}
