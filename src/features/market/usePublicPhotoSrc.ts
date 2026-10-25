// Loads a public photo for display: its data URI, or a blob URL from this browser's photo store.
import { useEffect, useState } from 'react'
import { getPhoto } from '../../store/photoDb'

/** A public photo's displayable source: its data URI, or a blob URL loaded from this browser's photo store. */
export function usePublicPhotoSrc(photo: { id: string; src: string | null } | undefined): string | null {
  const id = photo?.id ?? null
  const inline = photo?.src ?? null
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!id || inline) return
    let url: string | null = null
    let live = true
    getPhoto(id).then((blob) => {
      if (!live || !blob) return
      url = URL.createObjectURL(blob)
      setBlobSrc(url)
    })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
      setBlobSrc(null)
    }
  }, [id, inline])
  return inline ?? blobSrc
}
