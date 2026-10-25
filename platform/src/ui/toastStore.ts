// The toast queue: call toast() from anywhere; <Toaster /> renders it.
export type ToastTone = 'default' | 'success' | 'error' | 'info'

export type ToastInput = {
  title: string
  description?: string
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
  /** Milliseconds. Defaults to 5000, or 8000 with an action. */
  duration?: number
}

type ToastItem = ToastInput & { id: number; open: boolean }

let items: ToastItem[] = []
let counter = 0
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export function snapshot() {
  return items
}

/** Shows a toast and returns its id. */
export function toast(input: ToastInput | string): number {
  counter += 1
  const id = counter
  const t: ToastInput = typeof input === 'string' ? { title: input } : input
  items = [...items, { ...t, id, open: true }].slice(-4)
  emit()
  return id
}

toast.success = (title: string, rest: Omit<ToastInput, 'title' | 'tone'> = {}) => toast({ ...rest, title, tone: 'success' })
toast.error = (title: string, rest: Omit<ToastInput, 'title' | 'tone'> = {}) => toast({ ...rest, title, tone: 'error' })

export function dismissToast(id: number) {
  items = items.map((t) => (t.id === id ? { ...t, open: false } : t))
  emit()
  setTimeout(() => {
    items = items.filter((t) => t.id !== id)
    emit()
  }, 250)
}

