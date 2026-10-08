// The heading shared by the client's project screens: the project or screen name above, the page title, one line below.
import type { ReactNode } from 'react'

export function ClientHeader({ eyebrow, title, sub, right, testId }: { eyebrow: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; testId?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3" data-testid={testId}>
      <div className="min-w-0">
        <p className="m-0 text-xs font-medium uppercase tracking-[0.08em] text-mill-text">{eyebrow}</p>
        <h1 className="m-0 mt-1 text-2xl font-semibold leading-tight">{title}</h1>
        {sub ? <p className="m-0 mt-1 text-sm text-ink-soft">{sub}</p> : null}
      </div>
      {right}
    </header>
  )
}
