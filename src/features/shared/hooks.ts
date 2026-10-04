import { useEffect, useState } from 'react'
import { useStore } from '../../store/store'
import type { Photo } from '../../domain/types'
import { getPhoto } from '../../store/photoDb'

export function useWorld() {
  return useStore((s) => s.world)
}

export function usePersona() {
  const personaId = useStore((s) => s.personaId)
  const world = useStore((s) => s.world)
  const persona = world.personas[personaId]
  return { persona, org: world.orgs[persona.orgId] }
}

/** A photo's displayable source: the data URI, or a blob URL loaded from IndexedDB. */
export function usePhotoSrc(photo: Photo | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(photo?.kind === 'data' ? photo.src : null)
  useEffect(() => {
    let url: string | null = null
    let live = true
    if (!photo) {
      setSrc(null)
      return
    }
    if (photo.kind === 'data') {
      setSrc(photo.src)
      return
    }
    getPhoto(photo.id).then((blob) => {
      if (!live || !blob) return
      url = URL.createObjectURL(blob)
      setSrc(url)
    })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo])
  return src
}
