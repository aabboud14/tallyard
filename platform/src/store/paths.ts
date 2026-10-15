// Addresses of the Marketplace and its material pages, built in one place so the store, the seed, the selectors
// and the screens agree. The Marketplace used to live at /app/discover: those addresses still open, through a
// redirect that keeps the query string, so links already stored in a sandbox keep working.

export const MARKETPLACE_PATH = '/app/marketplace'

/** The old address of the Marketplace. */
export const LEGACY_MARKETPLACE_PATH = '/app/discover'

function withQuery(path: string, params: [string, string][]): string {
  if (params.length === 0) return path
  return `${path}?${new URLSearchParams(params).toString()}`
}

/** The Marketplace, checked against a project when one is given, with any further parameters in insertion order. */
export function marketplaceHref(projectId: string | null = null, extra: Record<string, string> = {}): string {
  const params: [string, string][] = []
  if (projectId) params.push(['project', projectId])
  for (const [k, v] of Object.entries(extra)) params.push([k, v])
  return withQuery(MARKETPLACE_PATH, params)
}

/** A material page, checked against a project when one is given. */
export function materialHref(publicId: string, projectId: string | null = null): string {
  return withQuery(`${MARKETPLACE_PATH}/${encodeURIComponent(publicId)}`, projectId ? [['project', projectId]] : [])
}

/** The lots shared in confidence with one project, on the Marketplace's Shared with you tab. */
export function sharedWithProjectHref(projectId: string): string {
  return withQuery(MARKETPLACE_PATH, [
    ['tab', 'shared'],
    ['project', projectId],
  ])
}

/** The new address for an old Marketplace path; any other path comes back unchanged. */
export function marketplacePathFor(legacyPath: string): string {
  if (legacyPath === LEGACY_MARKETPLACE_PATH || legacyPath === `${LEGACY_MARKETPLACE_PATH}/`) return MARKETPLACE_PATH
  if (legacyPath.startsWith(`${LEGACY_MARKETPLACE_PATH}/`)) return MARKETPLACE_PATH + legacyPath.slice(LEGACY_MARKETPLACE_PATH.length)
  return legacyPath
}
