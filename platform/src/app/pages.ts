// Route modules load on demand, so the first screen stays small. A page module may export its component by the
// file's name or as the default.
import type { ComponentType } from 'react'

export type PageModule = Record<string, unknown>

/** The page component in a module: the export named after the file, the default, or its one component export. */
export function pickComponent(m: PageModule, name: string): ComponentType {
  const named = m[name] ?? m.default
  if (typeof named === 'function' || (typeof named === 'object' && named !== null)) return named as ComponentType
  const components = Object.entries(m).filter(([k, v]) => /^[A-Z]/.test(k) && (typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v)))
  if (components.length === 1) return components[0][1] as ComponentType
  throw new Error(`The page ${name} could not be loaded.`)
}

/** A lazy route definition for react-router: loads the module, then renders its page component. */
export function lazyPage(load: () => Promise<PageModule>, name: string) {
  return async () => ({ Component: pickComponent(await load(), name) })
}
