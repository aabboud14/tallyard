// The three labelled stubs: a control that opens a short panel saying what the real feature would do.
import { Dialog } from 'radix-ui'
import { Button } from './ui'
import { LABELS } from '../domain/reference/labels'

/** The trigger is greyed and dashed so it never reads as a live feature; it opens only the explanation. `v2` adds the V2 tag. */
export function Stub({ name, would, testId, v2 = false }: { name: string; would: string; testId: string; v2?: boolean }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button data-testid={testId} className="gap-2 border-dashed border-mill! bg-paper! text-mill-text! hover:bg-rule-soft!">
          {name}
          {v2 ? <span className="rounded-sm border border-mill px-1 font-display text-xs leading-tight tracking-wide text-mill-text">V2</span> : null}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-rule bg-panel p-5 shadow-lg focus:outline-none" data-testid={`${testId}-panel`}>
          <Dialog.Title className="text-lg font-semibold">{name}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm">{would}</Dialog.Description>
          <p className="mt-2 text-sm font-medium" data-testid={`${testId}-label`}>
            {LABELS.L33}
          </p>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <Button>Close</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
