// Scrolling the Marketplace to its New for your projects row, clear of the sticky top bar and toolbar, for the
// home's link (#new-for-projects) and the jump link at the top of the landing.
import { NEW_FOR_PROJECTS_ANCHOR } from '../../store/paths'

/** How much of the scroll area's top the sticky bars cover: the top bar on phones, the Marketplace toolbar above. */
function coveredTop(): number {
  let covered = 0
  for (const el of document.querySelectorAll<HTMLElement>('[data-testid="top-bar"], [data-testid="discover-toolbar"]')) {
    const style = getComputedStyle(el)
    if (style.position !== 'sticky') continue
    covered = Math.max(covered, (parseFloat(style.top) || 0) + el.getBoundingClientRect().height)
  }
  return covered
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** Scrolls the row to the top of the page, clear of the sticky bars. False when the row is not on the page. */
export function scrollToNewForProjects(opts: { smooth?: boolean; focus?: boolean } = {}): boolean {
  const el = document.getElementById(NEW_FOR_PROJECTS_ANCHOR)
  if (!el) return false
  el.style.scrollMarginTop = `${Math.round(coveredTop()) + 16}px`
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start', behavior: opts.smooth && !prefersReducedMotion() ? 'smooth' : 'auto' })
  if (opts.focus) el.focus({ preventScroll: true })
  return true
}

