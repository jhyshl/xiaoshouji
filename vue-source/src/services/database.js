const DB_NAME = "linephone-db";
const DB_VERSION = 1;
const STORE_NAME = "app";
const STATE_KEY = "state";
const LEGACY_OWNER_KEY = "legacy-state-owner";

function userStateKey(ownerId) {
  return `${STATE_KEY}:${ownerId}`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readState(ownerId) {
  if (!ownerId) return null;
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const userRequest = store.get(userStateKey(ownerId));
      let result = null;

      userRequest.onsuccess = () => {
        if (userRequest.result) {
          result = userRequest.result;
          return;
        }

        const ownerRequest = store.get(LEGACY_OWNER_KEY);
        ownerRequest.onsuccess = () => {
          if (ownerRequest.result && ownerRequest.result !== ownerId) return;
          const legacyRequest = store.get(STATE_KEY);
          legacyRequest.onsuccess = () => {
            if (!legacyRequest.result) return;
            result = legacyRequest.result;
            store.put(legacyRequest.result, userStateKey(ownerId));
            store.put(ownerId, LEGACY_OWNER_KEY);
          };
        };
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("IndexedDB read failed", error);
    return null;
  }
}

export async function writeState(nextState, ownerId) {
  if (!ownerId) return;
  try {
    const serializableState = JSON.parse(JSON.stringify(nextState));
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction
        .objectStore(STORE_NAME)
        .put(serializableState, userStateKey(ownerId));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch (error) {
    console.warn("IndexedDB save failed", error);
  }
}
