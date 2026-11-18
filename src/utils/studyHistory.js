const STORAGE_PREFIX = 'wsd_study_history_';
const IDB_NAME = 'wsd_study_history_db';
const IDB_VERSION = 1;
const IDB_STORE = 'study_history';
const MAX_HISTORY_ITEMS = 80;

function getUserKey(user) {
  const rawId = user?.student_id || user?.email || 'guest';
  return String(rawId).trim().toLowerCase();
}

function getUserStorageKey(user) {
  return `${STORAGE_PREFIX}${getUserKey(user)}`;
}

function sortHistoryList(list) {
  return [...list].sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
}

function openHistoryDB() {
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
  const db = await openHistoryDB();
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
  const db = await openHistoryDB();
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
  const db = await openHistoryDB();
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

async function idbClearForUser(userKey) {
  const db = await openHistoryDB();
  if (!db) return false;
  const items = await idbGetAllForUser(userKey);
  if (!Array.isArray(items) || items.length === 0) return true;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      for (const it of items) {
        if (it?.id) store.delete(it.id);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function writeLocalCache(user, list) {
  if (typeof window === 'undefined') return;
  const trimmed = sortHistoryList(list).slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(getUserStorageKey(user), JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors; IndexedDB stores full items
  }
  window.dispatchEvent(new CustomEvent('wsd:study-history-updated'));
}

export function getStudyHistory(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getUserStorageKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortHistoryList(parsed);
  } catch {
    return [];
  }
}

export async function hydrateStudyHistoryFromOfflineDB(user) {
  const userKey = getUserKey(user);
  const idbList = await idbGetAllForUser(userKey);
  const lsList = getStudyHistory(user);

  if (!idbList) return lsList;

  const map = new Map();
  for (const item of lsList) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of idbList) {
    if (!item?.id) continue;
    const { userKey: _omit, ...cleanItem } = item;
    if (!map.has(cleanItem.id)) {
      map.set(cleanItem.id, cleanItem);
    }
  }

  const idbIds = new Set(idbList.map((i) => i.id));
  for (const item of lsList) {
    if (item?.id && !idbIds.has(item.id)) {
      idbPutItem(userKey, item);
    }
  }

  const merged = sortHistoryList(Array.from(map.values())).slice(0, MAX_HISTORY_ITEMS);
  if (merged.length !== lsList.length) {
    try {
      localStorage.setItem(getUserStorageKey(user), JSON.stringify(merged));
    } catch {
      // Ignore quota exceeded
    }
    window.dispatchEvent(new CustomEvent('wsd:study-history-updated'));
  }
  return merged;
}

export function addSolverHistoryItem(user, { promptText, hasImage = false, result }) {
  if (!result || !result.is_problem) return null;
  const userKey = getUserKey(user);
  const current = getStudyHistory(user);
  const item = {
    id: `hist_solver_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'solver',
    createdAt: new Date().toISOString(),
    promptText: String(promptText || '').trim(),
    hasImage: Boolean(hasImage),
    result: {
      short_answer: result.short_answer || '',
      detailed_answer: result.detailed_answer || '',
      formulas_used: result.formulas_used || '',
    },
  };
  writeLocalCache(user, [item, ...current]);
  idbPutItem(userKey, item);
  return item;
}

export function addEssayHistoryItem(user, { promptText, hasImage = false, grade, result }) {
  if (!result || !result.is_valid_topic) return null;
  const userKey = getUserKey(user);
  const current = getStudyHistory(user);
  const item = {
    id: `hist_essay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: 'essay',
    createdAt: new Date().toISOString(),
    promptText: String(promptText || result.detected_topic || '').trim(),
    hasImage: Boolean(hasImage),
    grade: String(grade || '12'),
    result,
  };
  writeLocalCache(user, [item, ...current]);
  idbPutItem(userKey, item);
  return item;
}

export function deleteStudyHistoryItem(user, id) {
  const current = getStudyHistory(user);
  const next = current.filter((item) => item.id !== id);
  writeLocalCache(user, next);
  idbDeleteItem(id);
  return next;
}

export function clearStudyHistory(user) {
  const userKey = getUserKey(user);
  writeLocalCache(user, []);
  idbClearForUser(userKey);
}
