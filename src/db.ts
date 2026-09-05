import type { CatchRecord } from './types';

const REAL_DB_NAME = 'catch-photo-log';
const STORE = 'catches';

// Demo data must never share a database with a visitor's real log. The app
// selects this before any read or write happens.
let databaseName = REAL_DB_NAME;

export function useStorageNamespace(namespace?: 'demo'): void {
  databaseName = namespace === 'demo' ? `demo:${REAL_DB_NAME}` : REAL_DB_NAME;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('caughtAt', 'caughtAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the private log.'));
  });
}

export async function listCatches(): Promise<CatchRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as CatchRecord[]).sort((a, b) => b.caughtAt.localeCompare(a.caughtAt)));
    request.onerror = () => reject(request.error ?? new Error('Could not read catches.'));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveCatch(record: CatchRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(record);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error('The catch was not saved.'));
  });
}

export async function removeCatch(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error('The catch was not removed.'));
  });
}

export async function replaceAllCatches(records: CatchRecord[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    store.clear();
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error('The backup was not imported.'));
  });
}

export async function clearCatches(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).clear();
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error('The log could not be reset.'));
  });
}
