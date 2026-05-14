export interface SnipHistoryItem {
  id: string;
  imageBase64: string;
  result: string | null;
  model: string;
  prompt: string;
  createdAt: string;
}

export interface SaveSnipHistoryInput {
  imageBase64: string;
  result?: string | null;
  model: string;
  prompt: string;
}

const DB_NAME = "snippai-history";
const STORE_NAME = "snips";
const DB_VERSION = 1;
const MAX_HISTORY_ITEMS = 50;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const openHistoryDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("History storage is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const createHistoryId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getAllHistoryItems = async (
  db: IDBDatabase
): Promise<SnipHistoryItem[]> => {
  const transaction = db.transaction(STORE_NAME, "readonly");
  const items = await requestToPromise<SnipHistoryItem[]>(
    transaction.objectStore(STORE_NAME).getAll()
  );
  await transactionDone(transaction);
  return items;
};

const pruneHistory = async (db: IDBDatabase): Promise<void> => {
  const overflow = (await getAllHistoryItems(db))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(MAX_HISTORY_ITEMS);

  if (overflow.length === 0) {
    return;
  }

  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  overflow.forEach((item) => store.delete(item.id));
  await transactionDone(transaction);
};

export const saveSnipHistory = async (
  input: SaveSnipHistoryInput
): Promise<SnipHistoryItem | null> => {
  if (!input.imageBase64) {
    return null;
  }

  const db = await openHistoryDb();
  const item: SnipHistoryItem = {
    id: createHistoryId(),
    imageBase64: input.imageBase64,
    result: input.result ?? null,
    model: input.model,
    prompt: input.prompt,
    createdAt: new Date().toISOString(),
  };

  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put(item);
  await transactionDone(transaction);
  await pruneHistory(db);
  db.close();

  return item;
};

export const fetchSnipHistory = async (
  limit = 30
): Promise<SnipHistoryItem[]> => {
  const db = await openHistoryDb();
  const items = await getAllHistoryItems(db);
  db.close();

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
};

export const deleteSnipHistoryItem = async (id: string): Promise<void> => {
  const db = await openHistoryDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  await transactionDone(transaction);
  db.close();
};

export const clearSnipHistory = async (): Promise<void> => {
  const db = await openHistoryDb();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).clear();
  await transactionDone(transaction);
  db.close();
};
