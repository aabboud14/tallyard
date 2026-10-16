// Help, Methodology and the open questions speak of a three-month window, as the rest of the product does, never
// of a quarter (recording audit note 14).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parameterRows } from './assumptions'
import { OPEN_QUESTIONS } from './openQuestions'

describe('methodology wording', () => {
  it('has no quarter in any parameter row or open question', () => {
    for (const r of parameterRows()) expect(`${r.label} ${r.value} ${r.unit} ${r.source}`, r.id).not.toMatch(/\bquarters?\b|\bQ[1-4]\b/i)
    for (const g of OPEN_QUESTIONS) for (const q of g.items) expect(q).not.toMatch(/\bquarters?\b|\bQ[1-4]\b/i)
  })

  it('names the timing disclosure as a three-month window or a month', () => {
    expect(parameterRows().find((r) => r.id === 'disclosure')!.value).toContain('Timing three-month window 5 or month 15.')
  })
})

// The quarter helpers that remain (formatQuarter, format.quarter) are kept only for their existing tests and for the
// programme axis, which its own package is changing. Nothing new may call them, so a quarter label cannot come back
// on a screen through a fresh import (recording audit note 14).
describe('quarter helpers stay out of the product', () => {
  const SRC = path.resolve(__dirname, '../..')
  const ALLOWED: Record<string, string> = {
    'domain/dates.ts': 'defines formatQuarter',
    'domain/format.ts': 'defines quarter(), marked not for display',
    'domain/engines/programme.ts': 'programme axis, owned by the programme package',
    'domain/privacy/publicListing.ts': 'availability.label, which no screen renders',
  }

  function sources(dir = SRC, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name)
      if (statSync(p).isDirectory()) sources(p, out)
      else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p)
    }
    return out
  }

  it('calls formatQuarter or format.quarter only where it is allowed today', () => {
    const found: string[] = []
    for (const file of sources()) {
      const rel = path.relative(SRC, file).split(path.sep).join('/')
      if (ALLOWED[rel]) continue
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\bformatQuarter\b|\b(f|format)\.quarter\b|\bquarter\s*\(/.test(line)) found.push(`${rel}:${i + 1}`)
        })
    }
    expect(found).toEqual([])
  })

  it('renders no public availability label (the quarter-level one) on any screen', () => {
    const found: string[] = []
    for (const file of sources()) {
      const rel = path.relative(SRC, file).split(path.sep).join('/')
      if (!/^(features|ui|app)\//.test(rel)) continue
      if (/availability\??\.label\b/.test(readFileSync(file, 'utf8'))) found.push(rel)
    }
    expect(found).toEqual([])
  })
})
