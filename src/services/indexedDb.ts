/*
 * Simple IndexedDB wrapper for async operations
 */

const DB_NAME = 'coagrisan-db'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      const stores = [
        'productos',
        'socios',
        'fincas',
        'tecnicos',
        'abonos',
        'offline_albaranes'
      ]
      stores.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name)
        }
      })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function get(storeName: string, key: IDBValidKey): Promise<any | undefined> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function set(storeName: string, key: IDBValidKey, value: any): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    req.onerror = () => reject(req.error)
  })
}

export async function clear(storeName: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.clear()
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll(storeName: string): Promise<any[]> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}