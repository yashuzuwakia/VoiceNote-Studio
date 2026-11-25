import type { Project } from '../types/project';
let db: Promise<IDBDatabase> | undefined;
function connect() {
  return (db ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('voicenote-studio', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('project');
      request.result.createObjectStore('assets');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Local storage is blocked by another tab.'));
  }));
}
async function transaction<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await connect();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(store, mode);
    const request = run(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () =>
      reject(tx.error ?? new Error('Local storage transaction failed.'));
  });
}
export const loadProject = () =>
  transaction<Project | undefined>('project', 'readonly', (s) =>
    s.get('active'),
  );
export const saveProject = (project: Project) =>
  transaction('project', 'readwrite', (s) => s.put(project, 'active'));
export const loadAsset = (id: string) =>
  transaction<Blob | undefined>('assets', 'readonly', (s) => s.get(id));
export const saveAsset = (id: string, blob: Blob) =>
  transaction('assets', 'readwrite', (s) => s.put(blob, id));
