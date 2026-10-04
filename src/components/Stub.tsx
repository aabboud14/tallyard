// The three labelled stubs: a control that opens a short panel saying what the real feature would do.
import { Dialog } from 'radix-ui'
import { Button } from './ui'
import { LABELS } from '../domain/reference/labels'

export function Stub({ name, would, testId }: { name: string; would: string; testId: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button data-testid={testId}>{name}</Button>
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
