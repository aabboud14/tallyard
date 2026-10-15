// The frame for sign in, sign up, password reset and invites: the form on the left and, from 1024 px, a drawing
// sheet on the right: a reclaimed steel member drawn from its survey record, with a title block.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PRODUCT_NAME } from '../../domain/constants'
import { cx, Logo, MaterialIllustration, SANDBOX_LINE, SectionDrawing } from '../../ui'
import { SAMPLE_MATERIALS } from '../../ui/samples'

export function AuthHeading({ title, text, className }: { title: ReactNode; text?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-8', className)}>
      <h1 className="m-0 text-2xl font-semibold text-ink sm:text-[26px] sm:leading-8">{title}</h1>
      {text ? <p className="m-0 mt-2 text-md text-muted">{text}</p> : null}
    </div>
  )
}

/** The member the sheet draws: the first sample steel section, at its recorded length. */
const SHEET = { designation: 'UB 457x191x67', lengthM: 7.5, pieces: '48 pieces', location: 'Central London' } as const

/**
 * The brand panel: a straight drawing sheet on paper. A large axonometric of a reclaimed steel member at its
 * recorded length, its dimensioned section beside it, and a title block in a 1 px ink frame. No rotation,
 * gradient, glass or shadow. Steps aside below 1024 px.
 */
export function BrandPanel() {
  const steel = SAMPLE_MATERIALS[0]
  return (
    <div className="relative hidden min-w-0 flex-col justify-center gap-10 border-l border-line bg-paper px-10 py-12 lg:flex xl:px-14" data-testid="auth-sheet">
      <div aria-hidden="true" className="flex min-w-0 items-center justify-center gap-6">
        <MaterialIllustration spec={steel.spec} publicId={steel.publicId} view="detail" className="block aspect-[4/3] w-full min-w-0 max-w-[560px] border border-line" />
        <SectionDrawing designation={SHEET.designation} lengthM={SHEET.lengthM} caption={false} className="hidden h-auto w-[132px] shrink-0 xl:block" idPrefix="auth" />
      </div>
      <div className="flex flex-col items-end gap-5">
        <dl className="m-0 grid w-[300px] border border-ink text-sm" data-testid="title-block">
          <div className="border-b border-ink px-3 py-2">
            <dt className="text-2xs text-muted">Member</dt>
            <dd className="m-0 font-semibold text-ink">
              {SHEET.designation}, {SHEET.lengthM.toFixed(1)} m
            </dd>
          </div>
          <div className="border-b border-ink px-3 py-2">
            <dt className="text-2xs text-muted">Lot</dt>
            <dd className="m-0 text-ink">
              {SHEET.pieces}, {SHEET.location}
            </dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-2xs text-muted">Source</dt>
            <dd className="m-0 text-ink">Illustration from the survey record</dd>
          </div>
        </dl>
        <p className="m-0 max-w-[440px] text-right text-xl font-semibold leading-7 tracking-[-0.015em] text-ink">Every material shows when it comes out, and whether it arrives in time for your start on site.</p>
      </div>
    </div>
  )
}

/** `footer` replaces the sandbox line at the bottom; pass false to leave it out (the sign-in page says it beside the sample accounts). */
export function AuthLayout({ children, footer, wide = false }: { children: ReactNode; footer?: ReactNode | false; wide?: boolean }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-page text-md lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" data-testid="auth-layout">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:min-h-0 lg:px-14 lg:py-8">
        <header>
          <Link to="/" className="inline-flex items-center rounded-md max-sm:min-h-11" aria-label={`${PRODUCT_NAME} home`}>
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className={cx('w-full', wide ? 'max-w-[460px]' : 'max-w-[400px]')}>{children}</div>
        </main>
        {footer === false ? null : (
          <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>{footer ?? `Sandbox. ${SANDBOX_LINE}`}</span>
          </footer>
        )}
      </div>
      <BrandPanel />
    </div>
  )
}
