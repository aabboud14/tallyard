// Photos: data URIs from the seed show as they are; photos taken in the product live in IndexedDB and load here
// as object URLs, cached for the session so a list never flickers.
import { useEffect, useState } from 'react'
import { getPhoto } from '../../store'

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

function load(id: string): Promise<string | null> {
  const hit = cache.get(id)
  if (hit) return Promise.resolve(hit)
  const inflight = pending.get(id)
  if (inflight) return inflight
  const p = getPhoto(id)
    .then((blob) => {
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      cache.set(id, url)
      return url
    })
    .catch(() => null)
    .finally(() => pending.delete(id))
  pending.set(id, p)
  return p
}

/** The address of a photo: its data URI, or an object URL for a photo stored in this browser. */
export function usePhotoUrl(photo: { id: string; src: string | null } | null | undefined): string | null {
  const id = photo?.id ?? null
  const src = photo?.src ?? null
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null)
  useEffect(() => {
    if (!id || src) return
    let live = true
    void load(id).then((url) => {
      if (live) setLoaded({ id, url })
    })
    return () => {
      live = false
    }
  }, [id, src])
  if (src) return src
  if (!id) return null
  return cache.get(id) ?? (loaded?.id === id ? loaded.url : null)
}

