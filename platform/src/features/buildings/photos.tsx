// Photos: data URIs from the seed show as they are; photos taken in the product live in IndexedDB and load here
// as object URLs, cached for the session so a list never flickers.
import type { ReactNode } from 'react'
import type { Spec } from '../../domain/types'
import { usePhotoUrl } from './usePhotoUrl'
import { cx, MaterialImage, type MaterialImageProps } from '../../ui'

/** A material's picture: its first photo when there is one, otherwise the illustration from the record. `className` sizes the frame. */
export function MaterialPicture({ spec, publicId, photo, className, ...rest }: Omit<MaterialImageProps, 'photo' | 'spec' | 'publicId'> & { spec: Spec; publicId: string; photo: { id: string; src: string | null } | null | undefined }) {
  const url = usePhotoUrl(photo)
  return (
    <div className={cx('min-w-0', className)}>
      <MaterialImage spec={spec} publicId={publicId} photo={url} {...rest} />
    </div>
  )
}

/** A square photo tile for an item's own photos. */
export function PhotoTile({ photo, alt, size = 'md', className, children }: { photo: { id: string; src: string | null }; alt: string; size?: 'sm' | 'md' | 'lg'; className?: string; children?: ReactNode }) {
  const url = usePhotoUrl(photo)
  const dims = size === 'sm' ? 'size-10' : size === 'lg' ? 'size-28' : 'size-20'
  return (
    <div className={cx('relative shrink-0 overflow-hidden rounded-lg bg-subtle ring-1 ring-inset ring-black/[0.06]', dims, className)}>
      {url ? <img src={url} alt={alt} className="absolute inset-0 size-full object-cover" /> : <div aria-hidden="true" className="skeleton absolute inset-0" />}
      {children}
    </div>
  )
}
