// Addresses inside the architect workspace, built on the store's Marketplace paths.
import { materialHref } from '../../store/paths'

export { marketplaceHref } from '../../store/paths'

/** A material page, checked against a project when one is given. */
export function listingHref(publicId: string, projectId: string | null = null): string {
  return materialHref(publicId, projectId)
}
