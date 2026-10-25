// 04 section 1 and 09 section 13.14: buyer-side feature folders (including the version 1.0 architect and client folders) never import private supply types; the supply folder never imports private project types.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

function files(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...files(p))
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

function importedNames(src: string): string[] {
  const names: string[] = []
  for (const m of src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
    for (const n of m[1].split(',')) names.push(n.replace(/^\s*type\s+/, '').trim().split(/\s+as\s+/)[0])
  }
  return names.filter(Boolean)
}

const PRIVATE_SUPPLY_TYPES = ['InventoryItem', 'SourceBuilding', 'Lot']
const PRIVATE_PROJECT_TYPES = ['Project', 'Requirement', 'PlanItem', 'Negotiation', 'MatchResult', 'BillLine']

describe('feature folder boundaries', () => {
  const root = path.resolve('src/features')
  it('market, project, compliance, architect and client never import private supply types or the supply folder', () => {
    for (const folder of ['market', 'project', 'compliance', 'architect', 'client']) {
      for (const f of files(path.join(root, folder))) {
        const src = readFileSync(f, 'utf8')
        expect(src, f).not.toMatch(/from '[^']*features\/supply/)
        expect(src, f).not.toMatch(/from '\.\.\/supply/)
        const names = importedNames(src)
        for (const t of PRIVATE_SUPPLY_TYPES) expect(names, `${f} imports ${t}`).not.toContain(t)
        expect(src, f).not.toMatch(/world\.(items|buildings|lots)\b/)
      }
    }
  })
  it('supply never imports private project types or the project folder', () => {
    for (const f of files(path.join(root, 'supply'))) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/from '[^']*features\/project/)
      expect(src, f).not.toMatch(/from '\.\.\/project/)
      const names = importedNames(src)
      for (const t of PRIVATE_PROJECT_TYPES) expect(names, `${f} imports ${t}`).not.toContain(t)
      expect(src, f).not.toMatch(/world\.projects\b/)
    }
  })
})
