// The public landing page: what the product is, who it is for, how it works, and the way in. Technical drawing
// and real product views, never decoration: no glows, masks, halos, blur or floating cards. Every figure on the
// page is a fixed sample from the fictional world, labelled as such.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Bookmark, Building2, Camera, ChevronDown, CircleHelp, ClipboardCheck, Compass, FolderClosed, FolderOpen, Hourglass, House, Leaf, Lock, Search, Settings, Store, Users } from 'lucide-react'
import { PRODUCT_NAME } from '../../domain/constants'
import { buildingSketch, projectSketch } from '../../domain/sketch'
import {
  Avatar,
  Badge,
  BuildingThumbnail,
  Button,
  cx,
  Donut,
  FitPill,
  Kbd,
  Legend,
  Logo,
  MARK,
  MaterialImage,
  MetricTile,
  Pill,
  ProgressRing,
  ProjectThumbnail,
  RibaStageStrip,
  StatusPill,
  SustainabilityBand,
  TargetMeter,
} from '../../ui'
import { BANDS, SAMPLE_DASHBOARD, SAMPLE_MATERIALS } from '../../ui/samples'
import { LandingScene } from './LandingScene'
import { HERO, LANDING_CTA, LANDING_FACTS, LANDING_PRINCIPLES, LANDING_ROLES, LANDING_STEPS, type LandingRoleKey } from './landingContent'

const ROLE_ICON: Record<LandingRoleKey, typeof Compass> = { architect: Compass, client: ClipboardCheck, owner: Building2, surveyor: Camera, consultant: Leaf }

/** The page's one content width and gutters. */
const WRAP = 'mx-auto w-full max-w-[1200px] px-4 sm:px-6'

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <div className={cx(WRAP, 'flex h-16 items-center justify-between gap-4')}>
        <Link to="/" className="inline-flex items-center rounded-md max-sm:min-h-11" aria-label={`${PRODUCT_NAME} home`}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {[
            ['#product', 'Product'],
            ['#roles', 'Who it is for'],
            ['#how', 'How it works'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-2 text-base text-ink-soft transition-colors hover:bg-hover hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="max-sm:hidden">
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="primary">
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className={cx(WRAP, 'grid items-center gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-12 lg:pb-20 lg:pt-20')}>
      <div className="min-w-0 lg:col-span-6">
        <h1 className="m-0 text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">{HERO.title}</h1>
        <p className="m-0 mt-6 max-w-[560px] text-lg leading-7 text-ink-soft">
          {PRODUCT_NAME} {HERO.text}
        </p>
        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild variant="primary" size="lg" trailingIcon={ArrowRight}>
            <Link to="/signup">Get started</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
        <p className="m-0 mt-4 text-sm text-muted">{HERO.sandbox}</p>
      </div>
      <figure className="m-0 min-w-0 lg:col-span-6">
        <div className="overflow-hidden rounded-lg border border-line bg-paper">
          <LandingScene />
        </div>
        <figcaption className="mt-2 text-2xs text-muted">Illustration, not to scale</figcaption>
      </figure>
    </section>
  )
}

function Facts() {
  return (
    <section aria-label="In numbers" className={WRAP}>
      <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden border-y border-line bg-line lg:grid-cols-4">
        {LANDING_FACTS.map((f) => (
          <div key={f.key} data-testid={`fact-${f.key}`} className="flex min-w-0 flex-col-reverse justify-end gap-1.5 bg-page px-3 py-6 sm:px-6">
            <dd className="m-0 text-sm leading-5 text-muted">{f.line}</dd>
            <dt className="text-lg font-semibold tracking-[-0.01em] text-ink sm:text-xl">{f.figure}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}

function SectionHeading({ id, eyebrow, title, text, className }: { id?: string; eyebrow: string; title: ReactNode; text?: ReactNode; className?: string }) {
  return (
    <div className={cx('max-w-[640px]', className)}>
      <p className="m-0 text-sm font-semibold text-brand-700">{eyebrow}</p>
      <h2 id={id} className="m-0 mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">
        {title}
      </h2>
      {text ? <p className="m-0 mt-4 text-lg leading-7 text-ink-soft">{text}</p> : null}
    </div>
  )
}

// ---------- Product shot: the architect home, drawn with the product's own components ----------

function NavItem({ icon: Icon, label, active = false, count }: { icon?: typeof House; label: string; active?: boolean; count?: number }) {
  return (
    <div className={cx('flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px]', active ? 'bg-surface font-medium text-ink ring-1 ring-line' : 'text-ink-soft')}>
      {Icon ? <Icon aria-hidden="true" className={cx('size-4 shrink-0', active ? 'text-ink' : 'text-faint')} /> : <span className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
      {count !== undefined ? <span className="ml-auto text-xs tabular-nums text-muted">{count}</span> : null}
    </div>
  )
}

const NAV_ICON = { home: House, marketplace: Store, saved: Bookmark } as const

function DashboardShot() {
  const d = SAMPLE_DASHBOARD
  const m = d.metrics
  const segments = m.shortlisted.segments.map((s) => ({ key: s.key, label: s.label, value: s.value, colour: MARK[s.tone] }))
  return (
    <div className="flex min-w-0">
      <aside className="hidden w-[208px] shrink-0 flex-col gap-5 border-r border-line-soft bg-canvas px-3 py-3.5 md:flex">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <Avatar name={d.org.name} shape="square" size="md" hue={200} decorative />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{d.org.name}</div>
            <div className="truncate text-xs text-muted">{d.org.type}</div>
          </div>
          <ChevronDown aria-hidden="true" className="size-3.5 text-faint" />
        </div>
        <div className="flex flex-col gap-0.5">
          {d.nav.main.map((n) => (
            <NavItem key={n.key} icon={NAV_ICON[n.key]} label={n.label} active={n.active} count={'count' in n ? n.count : undefined} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="px-2 pb-1 text-2xs font-medium text-muted">Projects</div>
          {d.nav.projects.map((p) => (
            <NavItem key={p} icon={FolderClosed} label={p} />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-0.5">
          <NavItem icon={CircleHelp} label="Help" />
          <NavItem icon={Settings} label="Settings" />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-12 items-center gap-3 border-b border-line-soft px-4">
          <span className="text-[13px] font-medium text-ink">Home</span>
          <div className="mx-auto hidden h-8 w-full max-w-[320px] items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-page px-2.5 text-[13px] text-faint sm:flex">
            <Search aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">Search materials, projects and buildings</span>
            <Kbd className="ml-auto">Ctrl K</Kbd>
          </div>
          <Avatar name={d.person} size="sm" decorative className="ml-auto sm:ml-0" />
        </div>
        <div className="flex flex-col gap-6 px-3 pb-6 pt-5 sm:px-6">
          <div>
            <div className="text-xl font-semibold tracking-[-0.015em] text-ink">{d.greeting}</div>
            <div className="mt-0.5 text-[13px] text-muted">{d.dateText}</div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <MetricTile icon={FolderOpen} label={m.active.label} value={m.active.value} sub={m.active.sub} />
            <MetricTile
              icon={Bookmark}
              label={m.shortlisted.label}
              value={m.shortlisted.value}
              chart={<Donut segments={segments} label={m.shortlisted.label} />}
              footer={<Legend items={segments.map((s) => ({ key: s.key, label: s.label, colour: s.colour, valueText: String(s.value) }))} className="text-xs" />}
            />
            <MetricTile
              icon={Leaf}
              label={m.carbon.label}
              value={m.carbon.value}
              unit={m.carbon.unit}
              chart={<ProgressRing value={m.carbon.ring.value} max={m.carbon.ring.max} label={m.carbon.label} valueText={m.carbon.ring.valueText} centre={m.carbon.ring.centre} />}
              sub={m.carbon.ring.valueText}
              indicative
            />
            <MetricTile icon={Hourglass} label={m.waiting.label} value={m.waiting.value} state={m.waiting.state} stateLabel={m.waiting.stateLabel} sub={m.waiting.sub} />
          </div>
          <div>
            <div className="text-base font-semibold text-ink">Your projects</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.projects.map((p, i) => (
                <div key={p.id} className={cx(i > 0 && 'max-sm:hidden', i === 2 && 'sm:max-lg:hidden', 'min-w-0 overflow-hidden rounded-lg border border-line bg-surface')}>
                  <ProjectThumbnail
                    rounded="top"
                    sketch={projectSketch({ id: p.id, name: p.name, projectType: p.projectType }, [...p.families])}
                    materials={p.materials.map((i) => ({ publicId: SAMPLE_MATERIALS[i].publicId, spec: SAMPLE_MATERIALS[i].spec }))}
                  />
                  <div className="flex flex-col gap-2 p-4">
                    <div>
                      <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                      <div className="truncate text-xs text-muted">
                        {p.client}, {p.typeText.toLowerCase()}
                      </div>
                    </div>
                    <RibaStageStrip stage={p.stage} showLabel size="sm" />
                    <div className="text-xs font-medium text-brand-700">{p.newFits}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductShot() {
  return (
    <section id="product" aria-labelledby="product-h" className={cx(WRAP, 'scroll-mt-20 pt-24 sm:pt-32')}>
      <SectionHeading
        id="product-h"
        eyebrow="The product"
        title="Every project, figure and decision in one view"
        text="The architect home: what is shortlisted, what waits for approval, the avoided carbon so far, and each project drawn from its materials."
      />
      <div className="mt-10 overflow-hidden rounded-lg border border-line bg-surface shadow-xs" aria-hidden="true" inert data-testid="product-shot">
        <div className="flex h-9 items-center gap-2 border-b border-line px-3.5">
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
        </div>
        <DashboardShot />
      </div>
      <p className="m-0 mt-3 text-sm text-muted">Sample data in the sandbox.</p>
    </section>
  )
}

// ---------- Who it is for ----------

function RoleVisual({ role }: { role: LandingRoleKey }) {
  if (role === 'architect') {
    return (
      <div className="grid w-full max-w-[360px] grid-cols-3 gap-2.5">
        {[SAMPLE_MATERIALS[2], SAMPLE_MATERIALS[0], SAMPLE_MATERIALS[3]].map((m) => (
          <div key={m.publicId} className="flex flex-col gap-1.5">
            <MaterialImage spec={m.spec} publicId={m.publicId} aspect="1/1" rounded="md" />
            <FitPill fit={m.fit} size="sm" className="self-start" />
          </div>
        ))}
      </div>
    )
  }
  if (role === 'client') {
    const m = SAMPLE_MATERIALS[1]
    return (
      <div className="flex w-full max-w-[360px] flex-col gap-3 rounded-lg border border-line bg-surface p-3">
        <div className="flex items-center gap-3">
          <MaterialImage spec={m.spec} publicId={m.publicId} aspect="1/1" rounded="md" className="size-10! shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{m.title}</div>
            <div className="text-xs text-muted">Sent by Priya Nair</div>
          </div>
          <StatusPill status="sent" size="sm" />
        </div>
        <div className="flex gap-2">
          <span className="inline-flex h-7 flex-1 items-center justify-center rounded-md bg-brand-600 text-xs font-medium text-white">Approve</span>
          <span className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-line text-xs font-medium text-ink-soft">Decline</span>
        </div>
      </div>
    )
  }
  if (role === 'owner') {
    return (
      <div className="flex w-full max-w-[320px] items-center gap-4">
        <BuildingThumbnail
          rounded="md"
          aspect="1/1"
          className="w-[128px] shrink-0"
          sketch={buildingSketch({ id: 'landing-owner', storeys: 7, structureType: 'Steel frame', use: 'office' }, ['stone_cladding', 'precast_cladding'])}
        />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Pill tone="neutral" icon={Lock} size="sm">
            Private
          </Pill>
          <Pill tone="info" dot size="sm">
            Shared
          </Pill>
          <Pill tone="brand" dot size="sm">
            Published
          </Pill>
        </div>
      </div>
    )
  }
  if (role === 'surveyor') {
    return (
      <div className="w-full max-w-[240px] rounded-lg border border-line bg-surface p-2.5">
        <div className="rounded-md border border-brand-600 px-2 py-1.5 text-xs text-ink">48 UB 457x191x67, 7.5 m, light rust</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-2xs">
          <span className="rounded bg-subtle px-1.5 py-1 text-muted">Condition B</span>
          <span className="rounded bg-subtle px-1.5 py-1 text-muted">48 pieces</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full max-w-[300px] items-center gap-4 rounded-lg border border-line bg-surface p-3">
      <ProgressRing value={41} max={96.4} label="Avoided carbon, approved" valueText="41.0 of 96.4 tCO2e" centre="43%" />
      <TargetMeter label="Reused content" value={19.91} max={40} target={20} valueText="19.91%" targetText="Aim at least 20%" state="warning" size="sm" className="min-w-0 flex-1 text-xs" />
    </div>
  )
}

function Roles() {
  return (
    <section id="roles" className={cx(WRAP, 'scroll-mt-20 pt-24 sm:pt-32')}>
      <SectionHeading eyebrow="Who it is for" title="One workspace, five ways in" text="Your organisation's type decides your workspace. Each role sees what it needs to decide, and nothing private crosses before it should." />
      <ul className="m-0 mt-12 grid list-none gap-4 p-0 md:grid-cols-6">
        {LANDING_ROLES.map(({ key, role, line, tools }, i) => {
          const Icon = ROLE_ICON[key]
          return (
            <li key={key} data-testid={`role-${key}`} className={cx('flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface', i < 2 ? 'md:col-span-3' : 'md:col-span-2')}>
              <div aria-hidden="true" inert className="flex h-40 items-center justify-center border-b border-line-soft bg-subtle px-5 md:h-48">
                <RoleVisual role={key} />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <Icon aria-hidden="true" className="size-[18px] text-brand-600" />
                  <h3 className="m-0 text-md font-semibold text-ink">{role}</h3>
                </div>
                <p className="m-0 mt-2 flex-1 text-base leading-6 text-ink-soft">{line}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tools.map((t) => (
                    <Badge key={t} tone="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------- How it works: three drawing sheets with title blocks ----------

function Sheet({ n, index, title, text, children }: { n: string; index: number; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 flex-col">
      <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface" data-testid={`sheet-${n}`}>
        <div className="flex h-64 items-center justify-center bg-paper p-6" aria-hidden="true" inert>
          <div className="w-full">{children}</div>
        </div>
        <div className="flex min-h-9 items-center gap-3 border-t border-line px-3.5 py-1.5 text-xs">
          <span className="tabular-nums text-muted">{n}</span>
          <h3 className="m-0 min-w-0 flex-1 text-sm font-semibold text-ink">{title}</h3>
          <span className="shrink-0 tabular-nums text-muted">
            Sheet {index} of {LANDING_STEPS.length}
          </span>
        </div>
      </div>
      <p className="m-0 mt-4 text-base leading-6 text-ink-soft">{text}</p>
    </li>
  )
}

function LotRow({ i, label, tone }: { i: number; label: string; tone: 'brand' | 'info' | 'neutral' }) {
  const mat = SAMPLE_MATERIALS[i]
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-2 pr-3">
      <MaterialImage spec={mat.spec} publicId={mat.publicId} aspect="1/1" rounded="md" className="size-9! shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{mat.title}</div>
        <div className="text-xs text-muted">{mat.quantity}</div>
      </div>
      <Pill size="sm" tone={tone} icon={label === 'Private' ? Lock : undefined} dot={label !== 'Private'}>
        {label}
      </Pill>
    </div>
  )
}

function HowItWorks() {
  const steel = SAMPLE_MATERIALS[0]
  const stone = SAMPLE_MATERIALS[2]
  const [capture, find, approve] = LANDING_STEPS
  return (
    <section id="how" className={cx(WRAP, 'scroll-mt-20 pt-24 sm:pt-32')}>
      <SectionHeading eyebrow="How it works" title="From survey to reservation in three steps" />
      <ol className="m-0 mt-12 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-6">
        <Sheet n={capture.n} index={1} title={capture.title} text={capture.text}>
          <div className="mx-auto flex max-w-[300px] flex-col gap-2">
            <LotRow i={0} label="Published" tone="brand" />
            <LotRow i={3} label="Shared" tone="info" />
            <LotRow i={5} label="Private" tone="neutral" />
          </div>
        </Sheet>
        <Sheet n={find.n} index={2} title={find.title} text={find.text}>
          <div className="mx-auto max-w-[240px] overflow-hidden rounded-md border border-line bg-surface">
            <MaterialImage spec={stone.spec} publicId={stone.publicId} aspect="16/10" />
            <div className="flex flex-col gap-2 p-3">
              <div className="truncate text-[13px] font-semibold text-ink">{stone.title}</div>
              <div className="flex items-center justify-between gap-2">
                <FitPill fit="in_time" size="sm" />
                <SustainabilityBand band={BANDS.medium} size="sm" />
              </div>
            </div>
          </div>
        </Sheet>
        <Sheet n={approve.n} index={3} title={approve.title} text={approve.text}>
          <div className="mx-auto flex max-w-[300px] flex-col gap-3 rounded-md border border-line bg-surface p-3.5">
            <div className="flex items-center gap-3">
              <MaterialImage spec={steel.spec} publicId={steel.publicId} aspect="1/1" rounded="md" className="size-10! shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">{steel.title}</div>
                <div className="text-xs text-muted">{steel.quantity}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <StatusPill status="approved" size="sm" />
              <span className="text-xs text-muted">by Isla Brennan</span>
            </div>
            <div className="inline-flex h-8 items-center justify-center rounded-md bg-brand-600 text-[13px] font-medium text-white">Request reservation</div>
          </div>
        </Sheet>
      </ol>
    </section>
  )
}

function Principles() {
  return (
    <section className={cx(WRAP, 'pt-24 sm:pt-32')}>
      <div className="rounded-lg bg-night px-6 py-12 text-white sm:px-12 sm:py-16" data-testid="principles">
        <h2 className="m-0 max-w-[560px] text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Built for decisions you can stand behind</h2>
        <ul className="m-0 mt-10 grid list-none gap-8 p-0 md:grid-cols-3">
          {LANDING_PRINCIPLES.map(({ key, title, text }) => (
            <li key={key} className="border-t border-night-line pt-5">
              <h3 className="m-0 text-lg font-semibold">{title}</h3>
              <p className="m-0 mt-1.5 text-base leading-6 text-white/70">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className={cx(WRAP, 'py-24 sm:py-32')}>
      <div className="flex flex-col items-center text-center">
        <h2 className="m-0 max-w-[640px] text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">{LANDING_CTA.title}</h2>
        <p className="m-0 mt-4 max-w-[540px] text-lg leading-7 text-ink-soft">{LANDING_CTA.text}</p>
        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild variant="primary" size="lg" icon={Users}>
            <Link to="/signin">Open a sample account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/signup">Create your organisation</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className={cx(WRAP, 'flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between')}>
        <div className="max-w-[320px]">
          <Logo size="sm" />
          <p className="m-0 mt-3 text-sm text-muted">The workspace for reclaimed structural and facade materials.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-12 text-sm max-sm:[&_a]:inline-flex max-sm:[&_a]:min-h-11 max-sm:[&_a]:items-center">
          <div className="flex flex-col gap-2.5">
            <span className="font-medium text-ink">Product</span>
            <a href="#roles" className="text-muted hover:text-ink">
              Who it is for
            </a>
            <a href="#how" className="text-muted hover:text-ink">
              How it works
            </a>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="font-medium text-ink">Account</span>
            <Link to="/signin" className="text-muted hover:text-ink">
              Sign in
            </Link>
            <Link to="/signup" className="text-muted hover:text-ink">
              Get started
            </Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-line-soft">
        <p className={cx(WRAP, 'm-0 py-5 text-xs text-muted')}>Sandbox. Organisations, people and buildings are fictional, and sample data stays in this browser.</p>
      </div>
    </footer>
  )
}

export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-page text-md" data-testid="landing">
      <Header />
      <main>
        <Hero />
        <Facts />
        <ProductShot />
        <Roles />
        <HowItWorks />
        <Principles />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
