// The frame for sign in, sign up, password reset and invites: the form on the left, a calm brand panel on the
// right with a collage of material illustrations. The panel steps aside below 1024 px.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PRODUCT_NAME } from '../../domain/constants'
import { cx, FitPill, Logo, LogoMark, MaterialImage, SANDBOX_LINE, SustainabilityBand } from '../../ui'
import { BANDS, SAMPLE_MATERIALS } from '../../ui/samples'

export function AuthHeading({ title, text, className }: { title: ReactNode; text?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-8', className)}>
      <h1 className="m-0 text-2xl font-semibold text-ink sm:text-[26px] sm:leading-8">{title}</h1>
      {text ? <p className="m-0 mt-2 text-md text-muted">{text}</p> : null}
    </div>
  )
}

function Collage() {
  const [steel, brick, stone, glass, precast, floor, timber, column] = SAMPLE_MATERIALS
  const tile = 'overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgb(28_25_23/0.06),0_24px_48px_-24px_rgb(28_25_23/0.45)]'
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 grid w-[136%] -translate-x-1/2 -translate-y-[56%] rotate-[-8deg] grid-cols-3 gap-5">
        <div className="mt-24 flex flex-col gap-5">
          <MaterialImage spec={stone.spec} publicId={stone.publicId} aspect="3/2" className={tile} />
          <MaterialImage spec={steel.spec} publicId={steel.publicId} aspect="1/1" className={tile} />
          <MaterialImage spec={timber.spec} publicId={timber.publicId} aspect="3/2" className={tile} />
        </div>
        <div className="flex flex-col gap-5">
          <MaterialImage spec={glass.spec} publicId={glass.publicId} aspect="1/1" className={tile} />
          <MaterialImage spec={brick.spec} publicId={brick.publicId} aspect="3/2" className={tile} />
          <MaterialImage spec={floor.spec} publicId={floor.publicId} aspect="1/1" className={tile} />
        </div>
        <div className="mt-12 flex flex-col gap-5">
          <MaterialImage spec={precast.spec} publicId={precast.publicId} aspect="3/2" className={tile} />
          <MaterialImage spec={column.spec} publicId={column.publicId} aspect="1/1" className={tile} />
          <MaterialImage spec={brick.spec} publicId="L-5RC3DR" aspect="3/2" className={tile} />
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(13_51_40/0.10)_0%,rgb(13_51_40/0)_30%,rgb(13_51_40/0.55)_70%,rgb(13_51_40/0.92)_100%)]" />
    </div>
  )
}

export function BrandPanel() {
  const stone = SAMPLE_MATERIALS[2]
  return (
    <div className="relative hidden overflow-hidden rounded-[20px] bg-brand-900 lg:block">
      <Collage />
      <div className="absolute right-8 top-8 w-[260px] rounded-xl border border-white/40 bg-white/85 p-3 shadow-pop backdrop-blur-md">
        <div className="flex items-center gap-3">
          <MaterialImage spec={stone.spec} publicId={stone.publicId} aspect="1/1" rounded="md" className="size-11! shrink-0" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">{stone.title}</div>
            <div className="text-xs text-muted">{stone.quantity}, {stone.location}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <FitPill fit="in_time" size="sm" />
          <SustainabilityBand band={BANDS.medium} size="sm" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-10 text-white">
        <LogoMark size={28} tone="white" />
        <p className="m-0 mt-5 max-w-[440px] text-2xl font-semibold leading-8 tracking-[-0.015em]">Every material shows when it comes out, and whether it arrives in time for your start on site.</p>
        <p className="m-0 mt-3 max-w-[420px] text-md text-white/70">Owners, architects, clients, surveyors and consultants, working from one record.</p>
      </div>
    </div>
  )
}

/** `footer` replaces the sandbox line at the bottom; pass false to leave it out (the sign-in page says it beside the sample accounts). */
export function AuthLayout({ children, footer, wide = false }: { children: ReactNode; footer?: ReactNode | false; wide?: boolean }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-page text-md lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:p-3" data-testid="auth-layout">
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
