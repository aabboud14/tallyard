// A tab left open while a new build is deployed keeps running the old one. When the person comes back to the tab
// (or every ten minutes while it is in view), the served index page is checked; if its entry script differs, a
// bar offers to reload. Production builds only: the development server has no hashed entry.
import { useEffect, useState } from 'react'
import { RotateCw, X } from 'lucide-react'
import { PRODUCT_NAME } from '../domain/constants'
import { Button, IconButton } from '../ui'
import { entryScriptOf, isNewerBuild } from './version'

const EVERY_MS = 10 * 60 * 1000
const AT_MOST_MS = 30 * 1000

function currentEntry(): string | null {
  const el = document.querySelector('script[type="module"][src]')
  return el ? el.getAttribute('src') : null
}

async function servedEntry(): Promise<string | null> {
  try {
    const res = await fetch(import.meta.env.BASE_URL, { cache: 'no-store', headers: { Accept: 'text/html' } })
    if (!res.ok) return null
    return entryScriptOf(await res.text())
  } catch {
    return null
  }
}

/** Whether a newer build is being served than the one this tab runs. */
function useNewerBuild(enabled: boolean): boolean {
  const [newer, setNewer] = useState(false)
  useEffect(() => {
    if (!enabled || newer || typeof document === 'undefined') return
    const mine = currentEntry()
    if (!mine) return
    // The first check may run as soon as the person returns to the tab.
    let last = -AT_MOST_MS
    let stopped = false
    const check = async () => {
      if (document.visibilityState !== 'visible') return
      const t = performance.now()
      if (t - last < AT_MOST_MS) return
      last = t
      const served = await servedEntry()
      if (!stopped && isNewerBuild(mine, served)) setNewer(true)
    }
    const onVisible = () => void check()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = window.setInterval(onVisible, EVERY_MS)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.clearInterval(timer)
    }
  }, [enabled, newer])
  return newer
}

export function NewVersionPrompt() {
  const newer = useNewerBuild(import.meta.env.PROD)
  const [closed, setClosed] = useState(false)
  if (!newer || closed) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 print:hidden">
      <div role="status" className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-line bg-surface py-2 pl-4 pr-2 shadow-pop" data-testid="new-version">
        <p className="m-0 min-w-0 flex-1 text-base text-ink">A new version of {PRODUCT_NAME} is available.</p>
        <Button variant="primary" size="sm" icon={RotateCw} onClick={() => window.location.reload()} data-testid="new-version-reload">
          Reload
        </Button>
        <IconButton icon={X} label="Not now" size="sm" tooltip={false} onClick={() => setClosed(true)} />
      </div>
    </div>
  )
}
