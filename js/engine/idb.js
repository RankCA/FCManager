/* IndexedDB autosave. Far larger quota than localStorage, so a long career
   always has a safety net even when a quick save would not fit. */
(function (FCM) {
  'use strict';

  const IDB = {};
  const DB_NAME = 'fcmanager';
  const DB_VERSION = 1;
  const STORE = 'saves';
  const AUTOSAVE_KEY = 'autosave';

  let dbPromise = null;

  IDB.supported = function () {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  };

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!IDB.supported()) { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB open failed')); };
      req.onblocked = function () { reject(new Error('IndexedDB blocked by another tab')); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        try { result = fn(store); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(result && result.result !== undefined ? result.result : result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error('Transaction aborted')); };
      });
    });
  }

  IDB.put = function (key, value) {
    return tx('readwrite', function (store) { return store.put(value, key); });
  };
  IDB.get = function (key) {
    return tx('readonly', function (store) { return store.get(key); });
  };
  IDB.del = function (key) {
    return tx('readwrite', function (store) { return store.delete(key); });
  };

  // ---- Autosave --------------------------------------------------------
  /** Write the current career to the autosave slot. */
  IDB.autosave = async function () {
    const data = FCM.S.serialize();
    data.savedAt = Date.now();
    data.appVersion = FCM.VERSION;
    const club = FCM.DB.clubById[data.userClubId];
    const record = {
      data: data,
      meta: {
        club: club ? club.name : '?', manager: data.managerName,
        season: data.season, day: data.day, saved: Date.now(),
        version: FCM.VERSION, format: FCM.SAVE_FORMAT
      }
    };
    await IDB.put(AUTOSAVE_KEY, record);
    return record.meta;
  };

  IDB.autosaveMeta = async function () {
    try {
      const rec = await IDB.get(AUTOSAVE_KEY);
      return rec ? rec.meta : null;
    } catch (e) { return null; }
  };

  IDB.loadAutosave = async function () {
    const rec = await IDB.get(AUTOSAVE_KEY);
    if (!rec || !rec.data) throw new Error('No autosave found.');
    if (rec.data.v && rec.data.v > FCM.SAVE_FORMAT) {
      throw new Error('That autosave was made in a newer version of the game.');
    }
    return FCM.S.hydrate(rec.data);
  };

  IDB.clearAutosave = function () { return IDB.del(AUTOSAVE_KEY).catch(function () {}); };

  /** Roughly how much room the browser will give us. */
  IDB.quota = async function () {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      return { usage: est.usage || 0, quota: est.quota || 0 };
    } catch (e) { return null; }
  };

  FCM.IDB = IDB;
})(window.FCM = window.FCM || {});
