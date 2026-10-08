// The confidentiality terms for one project (L7, the wording from version 0.5). Accepting counts for the project.
import { useState } from 'react'
import { Dialog } from 'radix-ui'
import { Button } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'

export function TermsDialog({ projectName, onAccept, triggerTestId }: { projectName: string; onAccept: () => string | null; triggerTestId: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        setError(null)
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="primary" size="lg" className="text-panel" data-testid={triggerTestId}>
          Accept the confidentiality terms
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-rule bg-panel p-5 shadow-lg focus:outline-none" data-testid="terms-dialog">
          <Dialog.Title className="text-lg font-semibold">Confidentiality terms</Dialog.Title>
          <p className="mt-1 text-sm text-mill-text">For {projectName}</p>
          <Dialog.Description className="mt-3 text-sm" data-testid="label-L7">
            {LABELS.L7}
          </Dialog.Description>
          {error ? (
            <p className="mt-3 rounded-sm border-l-2 border-oxide bg-oxide-tint px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Dialog.Close asChild>
              <Button size="lg">Not now</Button>
            </Dialog.Close>
            <Button
              variant="primary"
              size="lg"
              className="text-panel"
              data-testid="accept-terms"
              onClick={() => {
                const err = onAccept()
                if (err) setError(err)
                else setOpen(false)
              }}
            >
              Accept
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
