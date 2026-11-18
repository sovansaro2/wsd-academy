const CACHE_NAME = 'wsd-library-pdfs-v1';
const COVER_CACHE_NAME = 'wsd-library-covers-v1';
const IDB_NAME = 'wsd_library_offline_db';
const IDB_VERSION = 1;
const IDB_STORE = 'offline_books';
const BOOKMARKS_PREFIX = 'wsd_library_bookmarks_';

function openLibraryDB() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'r2_key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getOfflineBooksMetadata() {
  const db = await openLibraryDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function putOfflineMetadata(book, cachedSize) {
  const db = await openLibraryDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({
        ...book,
        file_size: cachedSize || book.file_size || 0,
        savedOfflineAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function deleteOfflineMetadata(r2Key) {
  const db = await openLibraryDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(r2Key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function getCacheKeyUrl(r2Key) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
  return `${origin}/__offline_library__/${encodeURIComponent(r2Key)}`;
}

function getCoverCacheKeyUrl(r2Key) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
  return `${origin}/__offline_library_cover__/${encodeURIComponent(r2Key)}`;
}

async function fetchPdfWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentLength = Number(response.headers.get('Content-Length') || 0);
  if (!response.body || typeof response.body.getReader !== 'function') {
    const blob = await response.blob();
    if (onProgress) onProgress(100);
    return blob;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress && contentLength > 0) {
      onProgress(Math.min(99, Math.round((received / contentLength) * 100)));
    }
  }

  if (onProgress) onProgress(100);
  return new Blob(chunks, { type: 'application/pdf' });
}

export async function saveBookOffline(book, onProgress) {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('Browser does not support Cache Storage.');
  }

  const proxyUrl = `/api/library/pdf-proxy?key=${encodeURIComponent(book.r2_key)}`;
  let blob;

  // Try direct R2 public URL first (zero server bandwidth); fallback to server proxy if CORS blocks
  if (book.pdf_url && !book.pdf_url.startsWith('/api/')) {
    try {
      blob = await fetchPdfWithProgress(book.pdf_url, onProgress);
    } catch {
      blob = await fetchPdfWithProgress(proxyUrl, onProgress);
    }
  } else {
    blob = await fetchPdfWithProgress(proxyUrl, onProgress);
  }

  const cache = await window.caches.open(CACHE_NAME);
  const cacheResponse = new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(blob.size),
    },
  });
  await cache.put(getCacheKeyUrl(book.r2_key), cacheResponse);
  await putOfflineMetadata(book, blob.size);
  window.dispatchEvent(new CustomEvent('wsd:library-offline-updated'));
  return blob.size;
}

export async function removeBookOffline(r2Key) {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open(CACHE_NAME);
      await cache.delete(getCacheKeyUrl(r2Key));
    } catch {
      // Ignore cache delete errors
    }
  }
  await deleteOfflineMetadata(r2Key);
  window.dispatchEvent(new CustomEvent('wsd:library-offline-updated'));
}

export async function getOfflineBookBlobUrl(r2Key) {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(getCacheKeyUrl(r2Key));
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function getOfflineBookArrayBuffer(r2Key) {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const match = await cache.match(getCacheKeyUrl(r2Key));
    if (!match) return null;
    return await match.arrayBuffer();
  } catch {
    return null;
  }
}

export async function getCachedCoverBlobUrl(r2Key) {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await window.caches.open(COVER_CACHE_NAME);
    const match = await cache.match(getCoverCacheKeyUrl(r2Key));
    if (!match) return null;
    const blob = await match.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function saveCoverToLocalCache(r2Key, blob) {
  if (typeof window === 'undefined' || !('caches' in window) || !blob) return;
  try {
    const cache = await window.caches.open(COVER_CACHE_NAME);
    await cache.put(
      getCoverCacheKeyUrl(r2Key),
      new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': blob.type || 'image/jpeg',
          'Content-Length': String(blob.size),
        },
      })
    );
  } catch {
    // Ignore cache write errors
  }
}

export function getBookmarkedKeys(user) {
  if (typeof window === 'undefined') return [];
  try {
    const userKey = String(user?.student_id || user?.email || 'guest').trim().toLowerCase();
    const raw = localStorage.getItem(`${BOOKMARKS_PREFIX}${userKey}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleBookBookmark(user, r2Key) {
  if (typeof window === 'undefined') return [];
  const userKey = String(user?.student_id || user?.email || 'guest').trim().toLowerCase();
  const current = getBookmarkedKeys(user);
  const exists = current.includes(r2Key);
  const next = exists ? current.filter((k) => k !== r2Key) : [r2Key, ...current];
  try {
    localStorage.setItem(`${BOOKMARKS_PREFIX}${userKey}`, JSON.stringify(next));
  } catch {
    // Ignore storage error
  }
  window.dispatchEvent(new CustomEvent('wsd:library-bookmarks-updated'));
  return next;
}
