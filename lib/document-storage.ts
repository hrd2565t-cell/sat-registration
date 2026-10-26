/**
 * Client-side IndexedDB document storage.
 * Allows storing full-resolution PDFs and applicant photos (10MB+) without
 * hitting browser localStorage limits.
 */

const DB_NAME = "sat-documents-db";
const DB_VERSION = 1;
const STORE_NAME = "documents";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredDocumentRecord {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl: string;
  savedAt: string;
}

export async function saveDocumentToStorage(record: StoredDocumentRecord): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Failed to save document to IndexedDB:", error);
  }
}

export async function getDocumentFromStorage(id: string): Promise<StoredDocumentRecord | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as StoredDocumentRecord | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Failed to get document from IndexedDB:", error);
    return undefined;
  }
}

export async function deleteDocumentFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn("Failed to delete document from IndexedDB:", error);
  }
}
