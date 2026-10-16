// Spotting a newer deployment from the served index page's entry script.
import { describe, expect, it } from 'vitest'
import { entryScriptOf, isNewerBuild } from './version'

const built = (hash: string) => `<!doctype html><html><head><script type="module" crossorigin src="/assets/index-${hash}.js"></script><link rel="stylesheet" crossorigin href="/assets/index-x.css"></head><body><div id="root"></div></body></html>`

describe('entryScriptOf', () => {
  it('reads the entry module of a production build, whatever the attribute order', () => {
    expect(entryScriptOf(built('Bq3x9Z'))).toBe('/assets/index-Bq3x9Z.js')
    expect(entryScriptOf(`<script src='/assets/index-A1.js' type='module'></script>`)).toBe('/assets/index-A1.js')
  })

  it('skips classic and inline scripts, and reads nothing from a page without a module', () => {
    expect(entryScriptOf('<script src="/legacy.js"></script><script type="module">import "/x.js"</script><script type="module" src="/src/main.tsx"></script>')).toBe('/src/main.tsx')
    expect(entryScriptOf('<p>Not a page</p>')).toBeNull()
    expect(entryScriptOf('')).toBeNull()
  })
})

describe('isNewerBuild', () => {
  it('is true only when both entries are known and differ', () => {
    expect(isNewerBuild('/assets/index-a.js', '/assets/index-b.js')).toBe(true)
    expect(isNewerBuild('/assets/index-a.js', '/assets/index-a.js')).toBe(false)
    expect(isNewerBuild('/assets/index-a.js', null)).toBe(false)
    expect(isNewerBuild(null, '/assets/index-b.js')).toBe(false)
  })
})
