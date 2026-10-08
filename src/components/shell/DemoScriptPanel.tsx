// The demo script panel: twelve steps, each with "Go" and "Set up to here" (02 section 5), on the version 1.0 routes
// and personas (09 section 3.6). Each step names the persona it switches to.
import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { DEMO_STEPS, runDemoSteps } from '../../store/demo'
import { Button } from '../ui'
import { topControl } from './styles'

export function DemoScriptPanel() {
  const navigate = useNavigate()
  const setPersona = useStore((s) => s.setPersona)
  const personas = useStore((s) => s.world.personas)
  const [busy, setBusy] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const go = (n: number) => {
    const step = DEMO_STEPS[n - 1]
    setPersona(step.personaId)
    navigate(step.route)
    setOpen(false)
  }
  const setUp = async (n: number) => {
    setBusy(n)
    try {
      await runDemoSteps(1, n - 1)
      go(n)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={topControl} data-testid="open-demo-script">
          Demo script
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-sm border border-rule bg-panel p-5 shadow-lg focus:outline-none"
          data-testid="demo-script-panel"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">Demo script</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="quiet" size="lg">
                Close
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mb-3 text-sm text-mill-text">
            For presenters. Twelve steps, about ten minutes. "Go" switches persona and opens the screen. "Set up to here" resets the data, replays the earlier steps, then opens the screen.
          </Dialog.Description>
          <ol className="flex flex-col divide-y divide-rule-soft">
            {DEMO_STEPS.map((s) => (
              <li key={s.n} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-7 shrink-0 font-display text-xl text-mill-text">{s.n}</span>
                <div className="min-w-[16rem] flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-xs text-mill-text" data-testid={`demo-persona-${s.n}`}>
                      {personas[s.personaId]?.name ?? ''}
                      {s.width ? ', phone width' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-ink-soft">{s.line}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  <Button size="lg" onClick={() => go(s.n)} data-testid={`demo-go-${s.n}`}>
                    Go
                  </Button>
                  <Button size="lg" onClick={() => setUp(s.n)} disabled={busy !== null} data-testid={`demo-setup-${s.n}`}>
                    {busy === s.n ? 'Setting up' : 'Set up to here'}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
