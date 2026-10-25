// Photo blobs live in IndexedDB under the app's own database, with a memory fallback when IndexedDB is not
// available (adapted from the demo's src/store/photoDb.ts). The world holds only references.
import { STORAGE_PREFIX } from './storage'

export const PHOTO_DB_NAME = `${STORAGE_PREFIX}-photos`
const STORE = 'photos'
const memory = new Map<string, Blob>()

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(PHOTO_DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

/** A new photo reference, for example pho_6f1c2a9e-0b7d. */
export function newPhotoId(): string {
  const bytes = new Uint8Array(8)
  globalThis.crypto.getRandomValues(bytes)
  const h = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `pho_${h.slice(0, 8)}-${h.slice(8, 12)}`
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob)
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
  db.close()
}

export async function getPhoto(id: string): Promise<Blob | null> {
  const db = await openDb()
  if (db) {
    const found = await new Promise<Blob | null>((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(id)
        req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
    db.close()
    if (found) return found
  }
  return memory.get(id) ?? null
}

export async function clearPhotos(): Promise<void> {
  memory.clear()
  await new Promise<void>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve()
      const req = indexedDB.deleteDatabase(PHOTO_DB_NAME)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
      req.onblocked = () => resolve()
    } catch {
      resolve()
    }
  })
}

/** Re-encodes an image through a canvas: applies rotation, strips metadata, caps the long edge at 1,600 px. */
export async function reencodePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const long = Math.max(bitmap.width, bitmap.height)
  const scale = long > 1600 ? 1600 / long : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', 0.82)
  })
}
