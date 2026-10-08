// The public landing page: what the product is, who it is for, how it works, and the way in.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  CalendarCheck,
  Camera,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Compass,
  FolderClosed,
  FolderOpen,
  House,
  LayoutGrid,
  Leaf,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { PRODUCT_NAME } from '../../domain/constants'
import { Avatar, AvatarStack, Badge, Button, cx, FitPill, Kbd, Logo, MaterialCard, MaterialImage, Pill, SegmentedBar, StatusPill, SustainabilityBand } from '../../ui'
import { BANDS, SAMPLE_MATERIALS } from '../../ui/samples'

const ROLES: { icon: typeof Compass; role: string; line: string; tools: string[] }[] = [
  { icon: Compass, role: 'Architects', line: 'Browse a curated showroom of reclaimed stock, shortlist it per project and export the specification.', tools: ['Discover', 'Shortlist', 'Specification'] },
  { icon: ClipboardCheck, role: 'Clients and developers', line: 'Approve what your architect proposes and reserve it, with an indicative package for storage, testing and transport.', tools: ['Approvals', 'Reservations'] },
  { icon: Building2, role: 'Asset owners', line: 'Know what your buildings hold and decide what is visible, to whom and from when.', tools: ['Inventory', 'Priorities', 'Sharing'] },
  { icon: Camera, role: 'Site surveyors', line: 'Capture each item on site from a phone: photos, grades, quantities and when it comes out.', tools: ['Capture', 'Inventory'] },
  { icon: Leaf, role: 'Sustainability consultants', line: 'Prove the avoided carbon and reused content, and export the compliance workbook.', tools: ['Carbon', 'Compliance'] },
]

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
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
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(28_25_23/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(28_25_23/0.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-280px] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(31_107_83/0.13),transparent)]" />
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
        <Link
          to="/signin"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-sm max-sm:min-h-11 max-sm:pl-1.5 text-ink-soft shadow-xs backdrop-blur transition-colors hover:border-line-strong hover:text-ink"
        >
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">Sandbox</span>
          Try it with sample accounts
          <ArrowRight aria-hidden="true" className="size-3.5 text-faint transition-transform group-hover:translate-x-0.5" />
        </Link>
        <h1 className="m-0 mt-7 max-w-[880px] text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-6xl lg:text-[68px] lg:leading-[1.02]">
          Reuse the buildings coming down in the buildings going up
        </h1>
        <p className="m-0 mt-6 max-w-[620px] text-lg leading-7 text-ink-soft sm:text-xl sm:leading-8">
          {PRODUCT_NAME} is the workspace for reclaimed structural and facade materials. Owners list what their buildings hold, architects shortlist and specify it, clients approve and reserve it.
        </p>
        <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild variant="primary" size="lg" trailingIcon={ArrowRight}>
            <Link to="/signup">Get started</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
        <p className="m-0 mt-4 text-sm text-muted">Free sandbox with sample data. Nothing leaves your browser.</p>
      </div>
    </section>
  )
}

function NavItem({ icon: Icon, label, active = false, count, depth = 0 }: { icon?: typeof House; label: string; active?: boolean; count?: number; depth?: number }) {
  return (
    <div className={cx('flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px]', active ? 'bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(28_25_23/0.06),0_0_0_1px_rgb(28_25_23/0.05)]' : 'text-ink-soft', depth ? 'ml-4' : '')}>
      {Icon ? <Icon aria-hidden="true" className={cx('size-4 shrink-0', active ? 'text-ink' : 'text-faint')} /> : <span className="size-4 shrink-0" />}
      <span className="truncate">{label}</span>
      {count !== undefined ? <span className="ml-auto text-xs tabular-nums text-muted">{count}</span> : null}
    </div>
  )
}

function ProductShot() {
  const cards = SAMPLE_MATERIALS.slice(0, 4)
  return (
    <section id="product" aria-label="The product" className="relative mx-auto max-w-[1200px] scroll-mt-20 px-4 sm:px-6">
      <div className="relative">
        <div aria-hidden="true" className="absolute -inset-x-6 -bottom-10 top-16 rounded-[32px] bg-gradient-to-b from-brand-100/40 via-brand-50/30 to-transparent blur-2xl" />
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_0_0_1px_rgb(28_25_23/0.03),0_30px_80px_-30px_rgb(28_25_23/0.35),0_12px_24px_-12px_rgb(28_25_23/0.12)]" aria-hidden="true" inert>
          <div className="flex">
            <aside className="hidden w-[232px] shrink-0 flex-col gap-5 border-r border-line-soft bg-page px-3 py-3.5 md:flex">
              <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
                <Avatar name="Studio Oriel" shape="square" size="md" hue={200} decorative />
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[13px] font-semibold text-ink">Studio Oriel</div>
                  <div className="truncate text-xs text-muted">Architecture practice</div>
                </div>
                <ChevronDown aria-hidden="true" className="size-3.5 text-faint" />
              </div>
              <div className="flex flex-col gap-0.5">
                <NavItem icon={House} label="Home" />
                <NavItem icon={LayoutGrid} label="Discover" active />
                <NavItem icon={Bookmark} label="Saved" count={3} />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="px-2 pb-1 text-left text-[11px] font-medium text-muted">Projects</div>
                <NavItem icon={FolderOpen} label="Merrowgate Wharf" />
                <NavItem label="Overview" depth={1} />
                <NavItem label="Shortlist" depth={1} count={14} />
                <NavItem label="Specification" depth={1} />
                <NavItem label="Carbon" depth={1} />
                <NavItem icon={FolderClosed} label="Sallow Court" />
                <NavItem icon={FolderClosed} label="Ferrymoor Yard" />
              </div>
              <div className="mt-auto flex flex-col gap-0.5">
                <NavItem icon={CircleHelp} label="Help" />
                <NavItem icon={Settings} label="Settings" />
              </div>
            </aside>
            <div className="min-w-0 flex-1">
              <div className="flex h-12 items-center gap-3 border-b border-line-soft px-4">
                <span className="text-[13px] font-medium text-ink">Discover</span>
                <div className="mx-auto hidden h-8 w-full max-w-[340px] items-center gap-2 rounded-lg border border-line bg-page px-2.5 text-[13px] text-faint sm:flex">
                  <Search aria-hidden="true" className="size-3.5" />
                  Search materials, projects and buildings
                  <Kbd className="ml-auto">Ctrl K</Kbd>
                </div>
                <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
                  <span className="relative inline-flex size-8 items-center justify-center rounded-md text-muted">
                    <Bell aria-hidden="true" className="size-4" />
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-600 ring-2 ring-surface" />
                  </span>
                  <Avatar name="Priya Nair" size="sm" decorative />
                </div>
              </div>
              <div className="px-4 pb-6 pt-5 sm:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="text-left">
                    <div className="text-[19px] font-semibold tracking-[-0.015em] text-ink">Discover</div>
                    <div className="mt-0.5 text-[13px] text-muted">Reclaimed materials from buildings coming down</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink-soft shadow-xs">
                      <span className="text-muted max-sm:hidden">Checking against</span>
                      <span className="font-medium text-ink">Merrowgate Wharf</span>
                      <ChevronDown aria-hidden="true" className="size-3.5 text-faint" />
                    </span>
                    <span className="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink-soft shadow-xs sm:inline-flex">
                      <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                      Filters
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-5 border-b border-line text-[13px]">
                  {[
                    ['All', '312', true],
                    ['Structure', '128', false],
                    ['Envelope', '104', false],
                    ['Finishes', '80', false],
                  ].map(([l, c, a]) => (
                    <span key={l as string} className={cx('relative flex h-9 items-center gap-1.5', a ? 'font-medium text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink' : 'text-muted', l === 'Finishes' && 'max-sm:hidden')}>
                      {l}
                      <span className="text-xs tabular-nums text-faint">{c}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
                  {cards.map((m, i) => (
                    <MaterialCard
                      key={m.publicId}
                      href="/signin"
                      title={m.title}
                      eyebrow={m.eyebrow}
                      image={<MaterialImage spec={m.spec} publicId={m.publicId} eager />}
                      facts={[m.quantity, m.location]}
                      fit={m.fit}
                      band={m.band}
                      className={cx(i > 1 && 'max-lg:hidden')}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-6 right-6 hidden w-[300px] rounded-xl border border-line bg-surface p-4 text-left shadow-pop lg:block xl:-right-8">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Merrowgate Wharf</span>
            <span className="text-xs text-muted">Shortlist</span>
          </div>
          <SegmentedBar
            className="mt-3"
            label="Shortlist"
            size="sm"
            legend={false}
            segments={[
              { key: 's', label: 'Shortlisted', count: 6, tone: 'neutral' },
              { key: 'n', label: 'Sent', count: 3, tone: 'info' },
              { key: 'a', label: 'Approved', count: 4, tone: 'brand' },
              { key: 'd', label: 'Declined', count: 1, tone: 'danger' },
            ]}
          />
          <div className="mt-3 flex flex-col gap-2.5">
            {[
              [SAMPLE_MATERIALS[0], 'approved'],
              [SAMPLE_MATERIALS[2], 'sent'],
              [SAMPLE_MATERIALS[1], 'shortlisted'],
            ].map(([m, s]) => {
              const mat = m as (typeof SAMPLE_MATERIALS)[number]
              return (
                <div key={mat.publicId} className="flex items-center gap-2.5">
                  <MaterialImage spec={mat.spec} publicId={mat.publicId} aspect="1/1" rounded="md" className="size-9! shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{mat.title}</div>
                    <div className="text-xs text-muted">{mat.quantity}</div>
                  </div>
                  <StatusPill status={s as 'approved' | 'sent' | 'shortlisted'} size="sm" />
                </div>
              )
            })}
          </div>
        </div>
        <div aria-hidden="true" className="absolute -bottom-7 left-[248px] hidden items-center gap-3 rounded-xl border border-line bg-surface py-3 pl-3.5 pr-4 text-left shadow-pop lg:flex">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
            <Bookmark aria-hidden="true" className="size-4" />
          </span>
          <div>
            <div className="text-[13px] font-medium text-ink">Saved to Merrowgate Wharf</div>
            <div className="text-xs text-muted">Available in time for the start on site</div>
          </div>
          <span className="ml-2 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-soft">Undo</span>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, text, className }: { eyebrow: string; title: ReactNode; text?: ReactNode; className?: string }) {
  return (
    <div className={cx('max-w-[640px]', className)}>
      <p className="m-0 text-sm font-semibold text-brand-700">{eyebrow}</p>
      <h2 className="m-0 mt-3 text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">{title}</h2>
      {text ? <p className="m-0 mt-4 text-lg leading-7 text-ink-soft">{text}</p> : null}
    </div>
  )
}

function RoleVisual({ role }: { role: string }) {
  if (role === 'Architects') {
    return (
      <div className="grid w-full max-w-[360px] grid-cols-3 gap-2.5">
        {[SAMPLE_MATERIALS[2], SAMPLE_MATERIALS[0], SAMPLE_MATERIALS[3]].map((m) => (
          <div key={m.publicId} className="flex flex-col gap-1.5">
            <MaterialImage spec={m.spec} publicId={m.publicId} aspect="1/1" rounded="lg" />
            <FitPill fit={m.fit} size="sm" className="self-start" />
          </div>
        ))}
      </div>
    )
  }
  if (role === 'Clients and developers') {
    const m = SAMPLE_MATERIALS[1]
    return (
      <div className="flex w-full max-w-[360px] flex-col gap-3 rounded-lg border border-line bg-surface p-3 shadow-sm">
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
  if (role === 'Asset owners') {
    return (
      <div className="flex flex-col items-start gap-2">
        <Pill tone="neutral" icon={Lock} size="sm">
          Private
        </Pill>
        <Pill tone="info" dot size="sm">
          Shared with selected projects
        </Pill>
        <Pill tone="brand" dot size="sm">
          Published
        </Pill>
      </div>
    )
  }
  if (role === 'Site surveyors') {
    return (
      <div className="w-full max-w-[240px] rounded-lg border border-line bg-surface p-2.5 shadow-sm">
        <div className="rounded-md border border-brand-600 px-2 py-1.5 text-xs text-ink shadow-[0_0_0_3px_rgb(31_107_83/0.12)]">48 UB 457x191x67, 7.5 m, light rust</div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
          <span className="rounded bg-subtle px-1.5 py-1 text-muted">Condition B</span>
          <span className="rounded bg-subtle px-1.5 py-1 text-muted">48 pieces</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="text-xs text-muted">Avoided carbon, approved</span>
      <span className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums text-ink">41.0</span>
        <span className="text-sm text-muted">tCO2e</span>
        <span className="ml-1.5 text-xs text-muted underline decoration-line-strong decoration-dotted underline-offset-[3px]">Indicative</span>
      </span>
      <SustainabilityBand band={BANDS.high} size="sm" />
    </div>
  )
}

function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-28 sm:px-6 sm:pt-36">
      <SectionHeading eyebrow="Who it is for" title="One workspace, five ways in" text="Your organisation's type decides your workspace. Each role sees what it needs to decide, and nothing private crosses before it should." />
      <ul className="m-0 mt-12 grid list-none gap-4 p-0 md:grid-cols-6">
        {ROLES.map(({ icon: Icon, role, line, tools }, i) => (
          <li key={role} className={cx('flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm', i < 2 ? 'md:col-span-3' : 'md:col-span-2')}>
            <div aria-hidden="true" inert className="relative flex h-40 items-center justify-center border-b border-line-soft bg-page px-6 md:h-48">
              <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(28_25_23/0.07)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_80%)]" />
              <div className="relative flex w-full justify-center">
                <RoleVisual role={role} />
              </div>
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
        ))}
      </ul>
    </section>
  )
}

function Step({ n, title, text, children }: { n: string; title: string; text: string; children: ReactNode }) {
  return (
    <li className="flex flex-col">
      <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-xl border border-line bg-gradient-to-b from-surface to-page p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(28_25_23/0.07)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
        <div className="relative w-full" aria-hidden="true" inert>
          {children}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-ink text-sm font-semibold tabular-nums text-white">{n}</span>
        <h3 className="m-0 text-lg font-semibold text-ink">{title}</h3>
      </div>
      <p className="m-0 mt-2.5 text-base leading-6 text-ink-soft">{text}</p>
    </li>
  )
}

function HowItWorks() {
  const steel = SAMPLE_MATERIALS[0]
  const stone = SAMPLE_MATERIALS[2]
  return (
    <section id="how" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-28 sm:px-6 sm:pt-36">
      <SectionHeading eyebrow="How it works" title="From survey to reservation in three steps" />
      <ol className="m-0 mt-12 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-6">
        <Step n="1" title="Capture and decide" text="Surveyors capture each item on site. Owners rank what to recover and choose what is private, shared with selected projects or published.">
          <div className="mx-auto flex max-w-[300px] flex-col gap-2">
            {[
              [SAMPLE_MATERIALS[0], 'Published', 'brand'],
              [SAMPLE_MATERIALS[3], 'Shared', 'info'],
              [SAMPLE_MATERIALS[5], 'Private', 'neutral'],
            ].map(([m, label, tone]) => {
              const mat = m as (typeof SAMPLE_MATERIALS)[number]
              return (
                <div key={mat.publicId} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2 pr-3 shadow-sm">
                  <MaterialImage spec={mat.spec} publicId={mat.publicId} aspect="1/1" rounded="md" className="size-10! shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">{mat.title}</div>
                    <div className="text-xs text-muted">{mat.quantity}</div>
                  </div>
                  <Pill size="sm" tone={tone as 'brand' | 'info' | 'neutral'} icon={label === 'Private' ? Lock : undefined} dot={label !== 'Private'}>
                    {label as string}
                  </Pill>
                </div>
              )
            })}
          </div>
        </Step>
        <Step n="2" title="Find and shortlist" text="Architects browse real stock, see at a glance whether it arrives in time for the start on site, and shortlist it to the project.">
          <div className="mx-auto max-w-[260px] overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
            <MaterialImage spec={stone.spec} publicId={stone.publicId} aspect="16/10" />
            <div className="flex flex-col gap-2 p-3">
              <div className="truncate text-[13px] font-semibold text-ink">{stone.title}</div>
              <div className="flex items-center justify-between gap-2">
                <FitPill fit="in_time" size="sm" />
                <SustainabilityBand band={BANDS.medium} size="sm" />
              </div>
            </div>
          </div>
        </Step>
        <Step n="3" title="Approve and reserve" text="Clients approve what the architect sends and request a reservation. The owner sees a blind request, and names are shared only once it is accepted.">
          <div className="mx-auto flex max-w-[300px] flex-col gap-3 rounded-lg border border-line bg-surface p-3.5 shadow-sm">
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
            <div className="inline-flex h-8 items-center justify-center rounded-md bg-brand-600 text-[13px] font-medium text-white shadow-sm">Request reservation</div>
          </div>
        </Step>
      </ol>
    </section>
  )
}

function Principles() {
  const items = [
    { icon: CalendarCheck, title: 'Timing first', text: 'Every material shows when it comes out and whether that fits your start on site: in time, tight or late.' },
    { icon: ShieldCheck, title: 'Private by default', text: 'Owners choose who sees what. Buyers and sellers see each other only once a reservation is accepted.' },
    { icon: Leaf, title: 'Honest numbers', text: 'Avoided carbon and price guides are marked indicative, with every factor and its source in the methodology.' },
  ]
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-28 sm:px-6 sm:pt-36">
      <div className="relative overflow-hidden rounded-2xl bg-brand-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_100%_0%,#000,transparent_70%)]" />
        <div className="relative">
          <h2 className="m-0 max-w-[560px] text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Built for decisions you can stand behind</h2>
          <ul className="m-0 mt-10 grid list-none gap-8 p-0 md:grid-cols-3">
            {items.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                  <Icon aria-hidden="true" className="size-[18px] text-brand-200" />
                </span>
                <h3 className="m-0 mt-4 text-lg font-semibold">{title}</h3>
                <p className="m-0 mt-1.5 text-base leading-6 text-white/70">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-28 sm:px-6 sm:py-36">
      <div className="flex flex-col items-center text-center">
        <AvatarStack size="md" people={[{ name: 'Priya Nair' }, { name: 'Isla Brennan' }, { name: 'Tom Ashby' }, { name: 'Dana Kowalski' }, { name: 'Marcus Lindqvist' }]} max={5} />
        <h2 className="m-0 mt-6 max-w-[640px] text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">Step into the sandbox</h2>
        <p className="m-0 mt-4 max-w-[540px] text-lg leading-7 text-ink-soft">Sign in as an architect, a client, an asset owner, a surveyor or a consultant in one click, and follow a material from survey to reservation.</p>
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
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
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
        <p className="m-0 mx-auto max-w-[1200px] px-4 py-5 text-xs text-muted sm:px-6">Sandbox. Organisations, people and buildings are fictional, and sample data stays in this browser.</p>
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
