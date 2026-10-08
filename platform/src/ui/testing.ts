// Small helpers for component tests in jsdom: render into the document inside a router, type, click, press keys,
// and read every visible string and accessible name.
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Dashes, arrows, ticks and comparison signs that must never reach the screen (P6). */
export const FORBIDDEN = /[\u2013\u2014\u2190-\u21FF\u2794\u27A1\u2B05-\u2B07\u2713\u2714\u2717\u2718\u2264\u2265<>]|->|=>/

/** Stand-ins for browser APIs that jsdom leaves out and the radix primitives use. */
export function installDomShims(): void {
  const g = globalThis as unknown as Record<string, unknown>
  if (!g.ResizeObserver) {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  const proto = Element.prototype as unknown as Record<string, unknown>
  if (!proto.scrollIntoView) proto.scrollIntoView = () => {}
  if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false
  if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {}
  if (!window.matchMedia) {
    ;(window as unknown as Record<string, unknown>).matchMedia = (q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })
  }
}

let roots: { root: Root; host: HTMLElement }[] = []

export function render(ui: ReactNode, { router = true, path = '/' }: { router?: boolean; path?: string } = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  roots.push({ root, host })
  act(() => root.render(router ? createElement(MemoryRouter, { initialEntries: [path] }, ui) : ui))
  return host
}

export function cleanup(): void {
  for (const { root, host } of roots) {
    act(() => root.unmount())
    host.remove()
  }
  roots = []
  document.body.innerHTML = ''
}

export function byTestId(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error('No element with test id ' + id)
  return el
}

/** The first element with this role whose accessible name (label, aria-label or text) contains `name`. */
export function byRole(role: string, name?: string | RegExp): HTMLElement {
  const all = allByRole(role)
  const found = name === undefined ? all[0] : all.find((el) => (typeof name === 'string' ? accessibleName(el).includes(name) : name.test(accessibleName(el))))
  if (!found) throw new Error(`No ${role} named ${String(name)}. Found: ${all.map(accessibleName).join(' | ')}`)
  return found
}

const IMPLICIT: Record<string, string> = { button: 'button', a: 'link', h1: 'heading', h2: 'heading', h3: 'heading', nav: 'navigation', table: 'table', textarea: 'textbox', select: 'combobox', img: 'img', form: 'form', dialog: 'dialog' }

function roleOf(el: Element): string | null {
  const explicit = el.getAttribute('role')
  if (explicit) return explicit
  const tag = el.tagName.toLowerCase()
  if (tag === 'a') return el.hasAttribute('href') ? 'link' : null
  if (tag === 'input') {
    const t = (el.getAttribute('type') ?? 'text').toLowerCase()
    if (t === 'checkbox') return 'checkbox'
    if (t === 'radio') return 'radio'
    if (t === 'hidden') return null
    return 'textbox'
  }
  return IMPLICIT[tag] ?? null
}

export function allByRole(role: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('*')).filter((el) => roleOf(el) === role && !el.closest('[aria-hidden="true"]'))
}

/** A simplified accessible name: aria-labelledby, aria-label, a label element, alt, then text. */
export function accessibleName(el: Element): string {
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const text = by
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (text) return text
  }
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.trim()
  const id = el.getAttribute('id')
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)
    if (label?.textContent?.trim()) return label.textContent.trim()
  }
  const wrapping = el.closest('label')
  if (wrapping?.textContent?.trim()) return wrapping.textContent.trim()
  const alt = el.getAttribute('alt')
  if (alt) return alt
  return (el.textContent ?? '').trim()
}

/** Every visible string and every accessible name, title, placeholder and alt in the document. */
export function allText(): string {
  const attrs = ['aria-label', 'title', 'placeholder', 'alt', 'aria-valuetext']
  const values = attrs.flatMap((a) => Array.from(document.querySelectorAll(`[${a}]`)).map((e) => e.getAttribute(a) ?? ''))
  return [document.body.textContent ?? '', ...values].join('\n')
}

export function click(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    ;(el as HTMLElement).focus?.()
    el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0 }))
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
  })
}

export function typeInto(el: Element, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export function press(key: string, target: Element | null = document.activeElement, init: KeyboardEventInit = {}): void {
  act(() => {
    ;(target ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  })
}

export function submit(form: Element): void {
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}
