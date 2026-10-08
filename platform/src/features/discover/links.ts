// Addresses inside the architect workspace.

/** A material page, checked against a project when one is given. */
export function listingHref(publicId: string, projectId: string | null = null): string {
  return projectId ? `/app/discover/${publicId}?project=${projectId}` : `/app/discover/${publicId}`
}

/** Discover, checking against a project when one is given. */
export function discoverHref(projectId: string | null = null): string {
  return projectId ? `/app/discover?project=${projectId}` : '/app/discover'
}
