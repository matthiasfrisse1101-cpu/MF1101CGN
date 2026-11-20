// Speicher auf dem Gerät (IndexedDB).
// Grundsatz: Jede Änderung wird sofort geschrieben. Schreibvorgänge für denselben Datensatz
// werden zusammengefasst, damit immer der neueste Stand gespeichert ist.

const DB_NAME = 'beckenbuch';
const DB_VERSION = 1;
export const STORES = ['einstellungen', 'vorlagen', 'buecher', 'fotos', 'skizzen'];

let dbPromise = null;

export function oeffneDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Die Datenbank ist durch ein anderes Fenster blockiert.'));
  });
  return dbPromise;
}

function tx(db, store, modus) {
  // „strict“: Der Browser meldet erst Erfolg, wenn die Daten dauerhaft geschrieben sind.
  try {
    return db.transaction(store, modus, { durability: 'strict' });
  } catch {
    return db.transaction(store, modus);
  }
}

export async function lese(store, id) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    const r = tx(db, store, 'readonly').objectStore(store).get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function alle(store) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    const r = tx(db, store, 'readonly').objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function schreibeJetzt(store, obj) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, store, 'readwrite');
    t.objectStore(store).put(obj);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Speichern abgebrochen'));
  });
}

export async function loesche(store, id) {
  const db = await oeffneDb();
  return new Promise((resolve, reject) => {
    const t = tx(db, store, 'readwrite');
    t.objectStore(store).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// ---------- Warteschlange je Datensatz ----------
const laufend = new Map(); // key -> Promise
const wartend = new Map(); // key -> neuester Stand
let fehlerMelder = () => {};
let zustandMelder = () => {};

export function beiSpeicherFehler(fn) { fehlerMelder = fn; }
export function beiSpeicherZustand(fn) { zustandMelder = fn; }

export function anzahlOffen() {
  return laufend.size + wartend.size;
}

// Speichert obj. Kopie wird sofort angefertigt, damit spätere Änderungen am Objekt nicht stören.
export function speichere(store, obj) {
  const key = `${store}:${obj.id}`;
  const kopie = structuredClone(obj);
  if (laufend.has(key)) {
    wartend.set(key, { store, obj: kopie });
    zustandMelder(anzahlOffen());
    return laufend.get(key);
  }
  const p = (async () => {
    let aktuell = { store, obj: kopie };
    while (aktuell) {
      try {
        await schreibeJetzt(aktuell.store, aktuell.obj);
      } catch (e) {
        fehlerMelder(e);
      }
      aktuell = wartend.get(key);
      wartend.delete(key);
    }
    laufend.delete(key);
    zustandMelder(anzahlOffen());
  })();
  laufend.set(key, p);
  zustandMelder(anzahlOffen());
  return p;
}

export async function allesGespeichert() {
  while (laufend.size) await Promise.all([...laufend.values()]);
}

// ---------- Dauerhafter Speicher ----------
export async function speicherStatus() {
  const s = { dauerhaft: null, belegtMB: null, verfuegbarMB: null };
  if (navigator.storage) {
    if (navigator.storage.persisted) s.dauerhaft = await navigator.storage.persisted();
    if (navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      s.belegtMB = Math.round((e.usage || 0) / 1e5) / 10;
      s.verfuegbarMB = Math.round((e.quota || 0) / 1e6);
    }
  }
  return s;
}

export async function dauerhaftBeantragen() {
  if (navigator.storage && navigator.storage.persist) return navigator.storage.persist();
  return false;
}
