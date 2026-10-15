// The validated data colours are pinned: a later edit cannot drift them without changing this test.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
const token = (name: string): string | null => new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1]?.toLowerCase() ?? null

describe('design tokens', () => {
  it('keeps the six categorical colours exactly as validated', () => {
    expect(['viz-1', 'viz-2', 'viz-3', 'viz-4', 'viz-5', 'viz-6'].map((n) => token(`color-${n}`))).toEqual(['#2f6db5', '#c4562c', '#16917a', '#b07d00', '#8a56b8', '#d0688f'])
  })

  it('keeps the five status marks exactly as validated', () => {
    expect(['neutral', 'info', 'good', 'warning', 'critical'].map((n) => token(`color-mark-${n}`))).toEqual(['#a8a29e', '#2563eb', '#2d8064', '#d97706', '#b91c1c'])
  })

  it('keeps the brand action colour and the neutrals the tests and screens rely on', () => {
    expect(token('color-brand-600')).toBe('#1f6b53')
    expect(token('color-paper')).toBe('#f7f6f3')
    expect(token('color-canvas')).toBe('#f4f3f1')
    expect(css).toMatch(/--text-2xs:\s*0\.6875rem/)
    expect(css).toMatch(/--text-2xl:\s*1\.5rem/)
  })

  it('has no dash characters in the stylesheet', () => {
    expect(css).not.toMatch(/[\u2013\u2014]/)
  })
})
