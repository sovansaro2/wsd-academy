import { getEssayLengthMetrics } from '../data/essayPresets';

const STORAGE_PREFIX = 'wsd_saved_essays_';
const IDB_NAME = 'wsd_offline_db';
const IDB_VERSION = 1;
const IDB_STORE = 'saved_essays';

function getUserKey(user) {
  const rawId = user?.student_id || user?.email || 'guest';
  return String(rawId).trim().toLowerCase();
}

function getUserStorageKey(user) {
  return `${STORAGE_PREFIX}${getUserKey(user)}`;
}

function sortSavedList(list) {
  return [...list].sort((a, b) => {
    const tA = new Date(a.updatedAt || a.savedAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.savedAt || 0).getTime();
    return tB - tA;
  });
}

function openOfflineDB() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
          store.createIndex('userKey', 'userKey', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGetAllForUser(userKey) {
  const db = await openOfflineDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const index = store.index('userKey');
      const req = index.getAll(userKey);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutItem(userKey, item) {
  const db = await openOfflineDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ ...item, userKey });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDeleteItem(id) {
  const db = await openOfflineDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function buildEssaySignature(result, grade) {
  const topic = (result?.detected_topic || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const typeCode = (result?.essay_type_code || '').trim().toLowerCase();
  return `${String(grade || '12')}::${typeCode}::${topic}`;
}

export function getSavedEssays(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortSavedList(parsed);
  } catch {
    return [];
  }
}

export async function hydrateSavedEssaysFromOfflineDB(user) {
  const userKey = getUserKey(user);
  const idbList = await idbGetAllForUser(userKey);
  const lsList = getSavedEssays(user);

  if (!idbList) return lsList;

  // Merge both stores by id (latest updatedAt wins) so neither is lost offline
  const map = new Map();
  for (const item of lsList) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of idbList) {
    if (!item?.id) continue;
    const { userKey: _omit, ...cleanItem } = item;
    const existing = map.get(cleanItem.id);
    if (!existing) {
      map.set(cleanItem.id, cleanItem);
    } else {
      const tNew = new Date(cleanItem.updatedAt || cleanItem.savedAt || 0).getTime();
      const tOld = new Date(existing.updatedAt || existing.savedAt || 0).getTime();
      if (tNew >= tOld) map.set(cleanItem.id, cleanItem);
    }
  }

  // Ensure any localStorage-only items are mirrored into IndexedDB
  const idbIds = new Set(idbList.map((i) => i.id));
  for (const item of lsList) {
    if (item?.id && !idbIds.has(item.id)) {
      idbPutItem(userKey, item);
    }
  }

  const merged = sortSavedList(Array.from(map.values()));
  if (merged.length !== lsList.length) {
    try {
      localStorage.setItem(getUserStorageKey(user), JSON.stringify(merged));
    } catch {
      // Ignore quota exceeded; IndexedDB still holds everything safely
    }
    window.dispatchEvent(new CustomEvent('wsd:saved-essays-updated'));
  }
  return merged;
}

function writeLocalCache(user, list) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(getUserStorageKey(user), JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('wsd:saved-essays-updated'));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent('wsd:saved-essays-updated'));
    return false;
  }
}

export function findSavedEssayByResult(user, result, grade) {
  if (!result || !result.detected_topic) return null;
  const sig = buildEssaySignature(result, grade);
  const list = getSavedEssays(user);
  return list.find((item) => item.signature === sig) || null;
}

export function saveEssayItem(user, { result, grade, note = '', existingId = null }) {
  if (!result || !result.is_valid_topic) {
    return { success: false, error: 'Cannot save an invalid essay result.' };
  }

  const userKey = getUserKey(user);
  const list = getSavedEssays(user);
  const nowIso = new Date().toISOString();
  const sig = buildEssaySignature(result, grade);
  const metrics = getEssayLengthMetrics(result);

  const matchIndex = existingId
    ? list.findIndex((item) => item.id === existingId)
    : list.findIndex((item) => item.signature === sig);

  if (matchIndex >= 0) {
    const updatedItem = {
      ...list[matchIndex],
      grade: String(grade || list[matchIndex].grade || '12'),
      note: String(note || '').trim(),
      wordCount: metrics.wordCount,
      estimatedPages: metrics.estimatedPages,
      essay: result,
      updatedAt: nowIso,
    };
    const nextList = [updatedItem, ...list.filter((_, idx) => idx !== matchIndex)];
    writeLocalCache(user, nextList);
    idbPutItem(userKey, updatedItem);
    return { success: true, item: updatedItem, isUpdate: true };
  }

  const newItem = {
    id: `essay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    signature: sig,
    savedAt: nowIso,
    updatedAt: nowIso,
    grade: String(grade || '12'),
    note: String(note || '').trim(),
    wordCount: metrics.wordCount,
    estimatedPages: metrics.estimatedPages,
    essay: result,
  };

  const nextList = [newItem, ...list];
  writeLocalCache(user, nextList);
  idbPutItem(userKey, newItem);
  return { success: true, item: newItem, isUpdate: false };
}

export function updateSavedEssayNote(user, id, note) {
  const userKey = getUserKey(user);
  const list = getSavedEssays(user);
  const idx = list.findIndex((item) => item.id === id);
  if (idx < 0) return { success: false };

  const updatedItem = {
    ...list[idx],
    note: String(note || '').trim(),
    updatedAt: new Date().toISOString(),
  };
  const nextList = list.map((item) => (item.id === id ? updatedItem : item));
  writeLocalCache(user, nextList);
  idbPutItem(userKey, updatedItem);
  return { success: true, item: updatedItem };
}

export function deleteSavedEssay(user, id) {
  const list = getSavedEssays(user);
  const nextList = list.filter((item) => item.id !== id);
  writeLocalCache(user, nextList);
  idbDeleteItem(id);
  return { success: true, list: nextList };
}
