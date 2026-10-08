// One-click sign in to the five sample accounts. Presentational: the caller passes the accounts and signs in.
import { ChevronRight, LoaderCircle } from 'lucide-react'
import { Avatar, type AvatarColourName } from '../../ui'

export type SampleAccount = {
  email: string
  name: string
  orgName: string
  /** For example "Architect". */
  roleLabel: string
  /** The avatar colour from the person's profile. */
  colour?: AvatarColourName
}

export const SAMPLE_ACCOUNTS_LINE = 'Sandbox data stays in this browser. Every sample account uses the password sandbox.'

export function SampleAccounts({ accounts, onSignIn, pendingEmail = null, title = 'Or continue with a sample account' }: { accounts: SampleAccount[]; onSignIn: (email: string) => void; pendingEmail?: string | null; title?: string }) {
  return (
    <section aria-labelledby="sample-accounts-h" data-testid="sample-accounts">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <h2 id="sample-accounts-h" className="m-0 text-sm font-medium text-muted">
          {title}
        </h2>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <ul className="m-0 mt-5 flex list-none flex-col overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-sm">
        {accounts.map((a) => {
          const pending = pendingEmail === a.email
          return (
            <li key={a.email} className="border-b border-line-soft last:border-b-0">
              <button
                type="button"
                onClick={() => onSignIn(a.email)}
                disabled={pendingEmail !== null}
                aria-label={`Sign in as ${a.name}, ${a.roleLabel} at ${a.orgName}`}
                data-testid={`sample-${a.email}`}
                className="group flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-page focus-visible:relative focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 disabled:cursor-default disabled:opacity-60"
              >
                <Avatar name={a.name} colour={a.colour} size="md" decorative />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-medium text-ink">{a.name}</span>
                  <span className="truncate text-sm text-muted">
                    {a.roleLabel}, {a.orgName}
                  </span>
                </span>
                {pending ? (
                  <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted" />
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-faint transition-colors group-hover:text-ink">
                    <span className="max-sm:hidden">Sign in</span>
                    <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="m-0 mt-3 text-center text-sm text-muted">{SAMPLE_ACCOUNTS_LINE}</p>
    </section>
  )
}
