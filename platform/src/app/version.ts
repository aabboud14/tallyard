// Which build a page is running, read from its entry script. The production build names the entry after a hash
// of its content, so a different name in the served index page means a newer build has been deployed.

/** The entry module's address in an HTML page, or null when it has none. */
export function entryScriptOf(html: string): string | null {
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = m[1]
    if (!/\btype\s*=\s*["']module["']/i.test(attrs)) continue
    const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs)
    if (src) return src[1]
  }
  return null
}

/** Whether the served page runs another build than this one. Unknown on either side reads as the same. */
export function isNewerBuild(current: string | null, served: string | null): boolean {
  return current !== null && served !== null && current !== served
}
