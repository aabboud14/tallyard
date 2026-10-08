// A public photo's address: the stored source, or the image the surveyor captured into this browser's photo store.
import { useEffect, useState } from 'react'
import { getPhoto } from '../../store'

export function usePhotoSrc(photo: { id: string; src: string | null } | null | undefined): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null)
  const id = photo?.id ?? null
  const direct = photo?.src ?? null
  useEffect(() => {
    if (!id || direct) return
    let cancelled = false
    let made: string | null = null
    getPhoto(id)
      .then((blob) => {
        if (cancelled || !blob) return
        made = URL.createObjectURL(blob)
        setLoaded({ id, url: made })
      })
      .catch(() => {
        // no photo store in this browser: the illustration stands in
      })
    return () => {
      cancelled = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [id, direct])
  if (direct) return direct
  return loaded && loaded.id === id ? loaded.url : null
}
