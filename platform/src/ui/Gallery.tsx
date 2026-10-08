// The design system on one page: every component in its states. Mounted at /__ui in development.
import { useState, type ReactNode } from 'react'
import {
  Archive,
  Bell,
  Bookmark,
  Building2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Leaf,
  List,
  LogOut,
  Mail,
  MapPin,
  Package,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { cx } from './cx'
import { Button, IconButton } from './Button'
import { Checkbox, Field, Input, RadioCards, Select, Switch, Textarea } from './form'
import { Badge, FitPill, IndicativeMarker, Pill, StatusPill } from './Badge'
import { Avatar, AvatarStack } from './Avatar'
import { Callout, Card, CardBody, CardFooter, CardHeader, DescriptionList, Stat } from './Card'
import { SegmentedControl, Tabs } from './Tabs'
import { Table, TBody, TD, TH, THead, TR, type SortDirection } from './Table'
import { Dialog, Sheet } from './Dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './DropdownMenu'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { Tooltip } from './Tooltip'
import { toast } from './toastStore'
import { CommandPalette } from './CommandPalette'
import { EmptyState } from './EmptyState'
import { Skeleton, SkeletonCard, SkeletonText } from './Skeleton'
import { Breadcrumbs } from './Breadcrumbs'
import { PageHeader } from './PageHeader'
import { Kbd } from './Kbd'
import { ProgressBar, SegmentedBar } from './Progress'
import { TimelineStrip } from './TimelineStrip'
import { SustainabilityBand } from './SustainabilityBand'
import { MaterialImage } from './MaterialImage'
import { MaterialDrawing } from './illustration/drawings'
import { MaterialCard } from './MaterialCard'
import { Logo, LogoMark } from './Logo'
import { SandboxBadge } from './SandboxBadge'
import { BANDS, SAMPLE_MATERIALS } from './samples'

const SECTIONS = [
  ['foundations', 'Foundations'],
  ['buttons', 'Buttons'],
  ['inputs', 'Inputs'],
  ['labels', 'Badges and pills'],
  ['people', 'Avatars'],
  ['surfaces', 'Cards and stats'],
  ['navigation', 'Navigation'],
  ['table', 'Table'],
  ['overlays', 'Overlays'],
  ['feedback', 'Feedback'],
  ['materials', 'Materials'],
  ['programme', 'Programme'],
  ['brand', 'Brand'],
] as const

function Section({ id, title, children, text }: { id: string; title: string; children: ReactNode; text?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-line pt-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-h`} className="m-0 text-xl font-semibold text-ink">
        {title}
      </h2>
      {text ? <p className="m-0 mt-1 max-w-2xl text-base text-muted">{text}</p> : null}
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  )
}

function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={className ?? 'flex flex-wrap items-center gap-3'}>{children}</div>
    </div>
  )
}

const COLOURS: [string, string][] = [
  ['page', 'bg-page'],
  ['surface', 'bg-surface'],
  ['subtle', 'bg-subtle'],
  ['line', 'bg-line'],
  ['line strong', 'bg-line-strong'],
  ['faint', 'bg-faint'],
  ['muted', 'bg-muted'],
  ['ink soft', 'bg-ink-soft'],
  ['ink', 'bg-ink'],
  ['brand 50', 'bg-brand-50'],
  ['brand 100', 'bg-brand-100'],
  ['brand 400', 'bg-brand-400'],
  ['brand 600', 'bg-brand-600'],
  ['brand 700', 'bg-brand-700'],
  ['info', 'bg-info'],
  ['warning', 'bg-warning'],
  ['warning soft', 'bg-warning-soft'],
  ['danger', 'bg-danger'],
  ['danger soft', 'bg-danger-soft'],
]

type Row3 = { id: string; name: string; material: string; qty: number; qtyText: string; status: 'shortlisted' | 'sent' | 'approved' | 'declined' }

const ROWS: Row3[] = [
  { id: 'a', name: 'UB 457x191x67, 7.5 m', material: 'Steel section', qty: 48, qtyText: '48 pieces', status: 'approved' },
  { id: 'b', name: 'Portland stone cladding, 50 mm', material: 'Stone cladding', qty: 600, qtyText: '600 m2', status: 'sent' },
  { id: 'c', name: 'Clay London stock bricks, lime mortar', material: 'Clay brick', qty: 20000, qtyText: '20,000 bricks', status: 'shortlisted' },
  { id: 'd', name: 'Unitised curtain wall panels, 1.5 m by 3.6 m', material: 'Curtain wall', qty: 120, qtyText: '120 panels', status: 'declined' },
]

export function Gallery() {
  const [dialog, setDialog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [bottom, setBottom] = useState(false)
  const [palette, setPalette] = useState(false)
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState<{ key: 'name' | 'qty'; dir: SortDirection }>({ key: 'name', dir: 'asc' })
  const [orgType, setOrgType] = useState('architect')
  const [notify, setNotify] = useState(true)
  const [agree, setAgree] = useState(false)
  const rows = [...ROWS].sort((a, b) => {
    const d = sort.key === 'qty' ? (a.qty === b.qty ? 0 : a.qty > b.qty ? 1 : -1) : a.name.localeCompare(b.name)
    return sort.dir === 'desc' ? -d : d
  })
  const flip = (key: 'name' | 'qty') => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))
  const steel = SAMPLE_MATERIALS[0]

  return (
    <div className="min-h-dvh bg-page" data-testid="ui-gallery">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-sm text-faint" aria-hidden="true">
              /
            </span>
            <span className="text-base font-medium text-ink">Design system</span>
          </div>
          <SandboxBadge />
        </div>
      </header>
      <div className="mx-auto flex max-w-[1280px] gap-10 px-4 py-10 sm:px-6">
        <nav aria-label="Sections" className="sticky top-24 hidden h-fit w-44 shrink-0 lg:block">
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-md px-2.5 py-1.5 text-base text-muted transition-colors hover:bg-hover hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex min-w-0 flex-1 flex-col gap-12">
          <div>
            <h1 className="m-0 text-3xl font-semibold text-ink">Design system</h1>
            <p className="m-0 mt-2 max-w-2xl text-md text-muted">Calm, precise and quiet, so the materials and the decisions stand out. Every component here is built on accessible primitives with a visible focus ring.</p>
          </div>

          <Section id="foundations" title="Foundations" text="Warm stone neutrals, one forest green, and three signal colours used only for status.">
            <Row label="Colour">
              <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                {COLOURS.map(([name, cls]) => (
                  <div key={name} className="flex flex-col gap-1.5">
                    <div className={cx('h-12 rounded-lg ring-1 ring-inset ring-black/5', cls)} />
                    <span className="text-xs text-muted">{name}</span>
                  </div>
                ))}
              </div>
            </Row>
            <Row label="Type" className="flex flex-col items-start gap-2">
              <p className="m-0 text-4xl font-semibold text-ink">Reclaimed, specified, reserved</p>
              <p className="m-0 text-2xl font-semibold text-ink">Merrowgate Wharf</p>
              <p className="m-0 text-lg font-medium text-ink">Your projects</p>
              <p className="m-0 text-base text-ink">Body text at 14 px for the app. Tabular figures for numbers: 1,234.56 t.</p>
              <p className="m-0 text-sm text-muted">Secondary text at 13 px for hints and metadata.</p>
            </Row>
            <Row label="Depth">
              <div className="h-16 w-28 rounded-lg border border-line bg-surface shadow-xs" />
              <div className="h-16 w-28 rounded-lg border border-line bg-surface shadow-sm" />
              <div className="h-16 w-28 rounded-lg border border-line bg-surface shadow-raised" />
              <div className="h-16 w-28 rounded-lg bg-surface shadow-pop" />
            </Row>
          </Section>

          <Section id="buttons" title="Buttons">
            <Row label="Variants">
              <Button variant="primary">Save to project</Button>
              <Button>Download DXF</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Remove</Button>
              <Button variant="link">View methodology</Button>
            </Row>
            <Row label="Sizes and icons">
              <Button variant="primary" size="sm" icon={Plus}>
                New project
              </Button>
              <Button variant="primary" icon={Send}>
                Send to client
              </Button>
              <Button variant="primary" size="lg" trailingIcon={ChevronDown}>
                Get started
              </Button>
              <Button icon={Download}>Download 2D</Button>
              <Button size="sm" icon={Share2}>
                Share
              </Button>
            </Row>
            <Row label="States">
              <Button variant="primary" loading>
                Saving
              </Button>
              <Button disabled>Disabled</Button>
              <Button asChild variant="secondary">
                <a href="#buttons">A link styled as a button</a>
              </Button>
            </Row>
            <Row label="Icon buttons">
              <IconButton icon={Bell} label="Notifications" />
              <IconButton icon={Settings} label="Settings" variant="secondary" />
              <IconButton icon={Bookmark} label="Save" variant="secondary" size="sm" />
              <IconButton icon={Trash2} label="Delete" variant="danger" />
            </Row>
          </Section>

          <Section id="inputs" title="Inputs">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Project name" hint="You can change this later.">
                <Input placeholder="Merrowgate Wharf" />
              </Field>
              <Field label="Email" error="Enter an email address like name@practice.example">
                <Input type="email" defaultValue="priya.nair@" />
              </Field>
              <Field label="Search">
                <Input icon={Search} placeholder="Search materials" trailing={<Kbd>/</Kbd>} />
              </Field>
              <Field label="Type">
                <Select
                  defaultValue="office"
                  options={[
                    { value: 'office', label: 'Office' },
                    { value: 'hotel', label: 'Hotel' },
                    { value: 'residential', label: 'Residential' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </Field>
              <Field label="Note for the client" optional className="md:col-span-2">
                <Textarea placeholder="Why this material suits the scheme" rows={3} />
              </Field>
              <Field label="Disabled">
                <Input disabled defaultValue="Studio Oriel" />
              </Field>
              <Field label="Read only">
                <Input readOnly defaultValue="priya.nair@studiooriel.example" />
              </Field>
            </div>
            <Row label="Checkbox and switch" className="flex flex-wrap items-start gap-8">
              <div className="flex flex-col gap-3">
                <Checkbox label="Remember me" checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
                <Checkbox label="Include shortlisted items" description="Draft mode shows items not yet approved." defaultChecked />
                <Checkbox label="Mixed selection" checked="indeterminate" />
                <Checkbox label="Unavailable" disabled />
              </div>
              <div className="flex w-72 flex-col gap-4">
                <Switch label="Email me about new materials" checked={notify} onCheckedChange={setNotify} />
                <Switch label="Published to the marketplace" description="Anyone signed in can see the public fields." />
                <Switch label="Disabled" disabled />
              </div>
            </Row>
            <Row label="Radio cards" className="block">
              <RadioCards
                aria-label="Organisation type"
                value={orgType}
                onValueChange={setOrgType}
                columns={2}
                options={[
                  { value: 'architect', label: 'Architecture practice', description: 'Find, shortlist and specify', icon: LayoutGrid },
                  { value: 'owner', label: 'Asset owner', description: 'List what your buildings hold', icon: Building2 },
                  { value: 'consultant', label: 'Sustainability consultancy', description: 'Prove the avoided carbon', icon: Leaf },
                  { value: 'surveyor', label: 'Surveying firm', description: 'Capture items on site', icon: MapPin, disabled: true },
                ]}
              />
            </Row>
          </Section>

          <Section id="labels" title="Badges and pills">
            <Row label="Badge">
              <Badge>Draft</Badge>
              <Badge tone="brand">Published</Badge>
              <Badge tone="info">3 new</Badge>
              <Badge tone="warning">Tight</Badge>
              <Badge tone="danger">Declined</Badge>
              <Badge tone="outline">RIBA stage 3</Badge>
              <Badge tone="solid">12</Badge>
            </Row>
            <Row label="Pill">
              <Pill>Private</Pill>
              <Pill tone="brand" dot>
                Shared with 2 projects
              </Pill>
              <Pill tone="info" icon={Mail}>
                Invite sent
              </Pill>
              <Pill size="sm">Soon</Pill>
            </Row>
            <Row label="Shortlist status">
              <StatusPill status="shortlisted" />
              <StatusPill status="sent" />
              <StatusPill status="approved" />
              <StatusPill status="declined" />
            </Row>
            <Row label="Timeline fit">
              <FitPill fit="in_time" />
              <FitPill fit="tight" />
              <FitPill fit="late" />
              <FitPill fit="now" />
              <FitPill fit="in_time" size="sm" />
            </Row>
            <Row label="Markers">
              <IndicativeMarker />
              <SandboxBadge />
            </Row>
          </Section>

          <Section id="people" title="Avatars">
            <Row label="People and organisations">
              <Avatar name="Priya Nair" size="xs" />
              <Avatar name="Priya Nair" size="sm" />
              <Avatar name="Isla Brennan" size="md" />
              <Avatar name="Tom Ashby" size="lg" />
              <Avatar name="Dana Kowalski" size="xl" />
              <Avatar name="Studio Oriel" shape="square" size="lg" />
              <Avatar name="Ostlea Estates" shape="square" size="md" hue={24} />
            </Row>
            <Row label="Stack">
              <AvatarStack people={[{ name: 'Priya Nair' }, { name: 'Isla Brennan' }, { name: 'Marcus Lindqvist' }]} />
              <AvatarStack size="md" max={3} people={[{ name: 'Priya Nair' }, { name: 'Isla Brennan' }, { name: 'Marcus Lindqvist' }, { name: 'Tom Ashby' }, { name: 'Dana Kowalski' }]} />
            </Row>
          </Section>

          <Section id="surfaces" title="Cards and stats">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Active projects" value="3" icon={FolderOpen} sub="1 starts on site this year" />
              <Stat label="Items shortlisted" value="14" icon={Bookmark} sub="5 waiting on your client" />
              <Stat label="Avoided carbon, approved" value="41.0" unit="tCO2e" icon={Leaf} indicative sub="Against buying new" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="Key facts" description="From the public listing" actions={<IconButton icon={Download} label="Download" size="sm" />} />
                <CardBody>
                  <DescriptionList
                    items={[
                      { label: 'Quantity', value: '48 pieces' },
                      { label: 'Mass', value: '24.16 t' },
                      { label: 'Condition', value: 'B, light surface rust' },
                      { label: 'Available', value: 'Jan to Mar 2027' },
                      { label: 'Location', value: 'Central London' },
                    ]}
                  />
                </CardBody>
                <CardFooter>
                  <Button size="sm">Download 2D</Button>
                  <Button size="sm" variant="primary">
                    Save to project
                  </Button>
                </CardFooter>
              </Card>
              <Card padding="md">
                <DescriptionList
                  layout="grid"
                  columns={3}
                  items={[
                    { label: 'Client', value: 'Lantern Quay Developments' },
                    { label: 'Type', value: 'Office' },
                    { label: 'RIBA stage', value: '3' },
                    { label: 'Materials needed from', value: '3 Apr 2028' },
                    { label: 'Region', value: 'London' },
                    { label: 'Shortlisted', value: '14', hint: '5 approved' },
                  ]}
                />
              </Card>
            </div>
            <div className="grid gap-3">
              <Callout title="Approval and purchase sit with your client">You choose on function, aesthetics and environmental performance. Your client approves and reserves.</Callout>
              <Callout tone="info" title="2 lots shared with this project" action={<Button size="sm">Review</Button>}>
                Owners shared these privately. Accept the confidentiality terms to see them.
              </Callout>
              <Callout tone="warning" title="Tight for the start date">Available close to the start date. Allow time for testing and transport.</Callout>
              <Callout tone="danger" title="Could not import the file">The schedule has no designation column. Check the headings and try again.</Callout>
              <Callout tone="brand" title="Reservation accepted">Ostlea Estates accepted. You can now see each other's contact details.</Callout>
            </div>
          </Section>

          <Section id="navigation" title="Navigation">
            <Row label="Breadcrumbs" className="block">
              <Breadcrumbs items={[{ label: 'Projects', href: '#' }, { label: 'Merrowgate Wharf', href: '#' }, { label: 'Shortlist' }]} />
            </Row>
            <Row label="Tabs" className="block">
              <div className="border-b border-line">
                <Tabs
                  label="Project"
                  items={[
                    { label: 'Overview', href: '#navigation', active: true },
                    { label: 'Shortlist', href: '#navigation', count: 14 },
                    { label: 'Specification', href: '#navigation' },
                    { label: 'Carbon', href: '#navigation' },
                    { label: 'Team', href: '#navigation' },
                    { label: 'Matching', href: '#navigation', adornment: <Pill size="sm">Soon</Pill> },
                  ]}
                />
              </div>
            </Row>
            <Row label="Segmented control">
              <SegmentedControl
                label="View"
                value={view}
                onValueChange={setView}
                items={[
                  { value: 'grid', label: 'Cards', icon: LayoutGrid },
                  { value: 'list', label: 'Table', icon: List },
                ]}
              />
              <SegmentedControl
                label="View"
                size="sm"
                value={view}
                onValueChange={setView}
                items={[
                  { value: 'grid', label: 'Cards', icon: LayoutGrid, iconOnly: true },
                  { value: 'list', label: 'Table', icon: List, iconOnly: true },
                ]}
              />
            </Row>
            <Row label="Page header" className="block">
              <Card padding="lg">
                <PageHeader
                  breadcrumbs={<Breadcrumbs items={[{ label: 'Projects', href: '#' }, { label: 'Merrowgate Wharf' }]} />}
                  title="Merrowgate Wharf"
                  subtitle="Office for Lantern Quay Developments, RIBA stage 3"
                  leading={<Avatar name="Merrowgate Wharf" shape="square" size="lg" hue={152} decorative />}
                  actions={
                    <>
                      <AvatarStack people={[{ name: 'Priya Nair' }, { name: 'Isla Brennan' }, { name: 'Marcus Lindqvist' }]} />
                      <Button icon={Users}>Invite</Button>
                      <Button variant="primary" icon={Send}>
                        Send to client
                      </Button>
                    </>
                  }
                  meta={
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        London
                      </span>
                      <span>Materials needed from 3 Apr 2028</span>
                    </>
                  }
                  tabs={
                    <Tabs
                      label="Project"
                      items={[
                        { label: 'Overview', href: '#', active: true },
                        { label: 'Shortlist', href: '#', count: 14 },
                        { label: 'Specification', href: '#' },
                      ]}
                    />
                  }
                />
              </Card>
            </Row>
          </Section>

          <Section id="table" title="Table">
            <Table caption="Shortlist">
              <THead>
                <tr>
                  <TH sort={sort.key === 'name' ? sort.dir : null} onSort={() => flip('name')}>
                    Material
                  </TH>
                  <TH>Family</TH>
                  <TH align="right" sort={sort.key === 'qty' ? sort.dir : null} onSort={() => flip('qty')}>
                    Quantity
                  </TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} interactive>
                    <TD className="font-medium">{r.name}</TD>
                    <TD muted>{r.material}</TD>
                    <TD align="right">{r.qtyText}</TD>
                    <TD>
                      <StatusPill status={r.status} size="sm" />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Section>

          <Section id="overlays" title="Overlays">
            <Row label="Open one">
              <Button onClick={() => setDialog(true)}>Open dialog</Button>
              <Button onClick={() => setSheet(true)}>Open side sheet</Button>
              <Button onClick={() => setBottom(true)}>Open bottom sheet</Button>
              <Button onClick={() => setPalette(true)} icon={Search}>
                Search
                <Kbd className="ml-1">Ctrl K</Kbd>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button trailingIcon={ChevronDown}>Menu</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Priya Nair</DropdownMenuLabel>
                  <DropdownMenuItem icon={User}>Profile</DropdownMenuItem>
                  <DropdownMenuItem icon={Settings} shortcut="G S">
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Users}>Switch account</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem icon={LogOut} tone="danger">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Popover>
                <PopoverTrigger asChild>
                  <Button icon={Bookmark}>Save to</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="m-0 mb-2 text-sm font-medium text-muted">Save to</p>
                  <div className="flex flex-col gap-1">
                    {['Merrowgate Wharf', 'Sallow Court', 'Saved'].map((p) => (
                      <button key={p} type="button" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-base hover:bg-hover max-sm:min-h-11">
                        <FolderOpen aria-hidden="true" className="size-4 text-muted" />
                        {p}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Tooltip content="Sample data that stays in this browser">
                <Button variant="ghost">Hover for a tooltip</Button>
              </Tooltip>
            </Row>
            <Row label="Toasts">
              <Button onClick={() => toast({ title: 'Saved to Merrowgate Wharf', tone: 'success', action: { label: 'Undo', onClick: () => toast('Removed from Merrowgate Wharf') } })}>Success with undo</Button>
              <Button onClick={() => toast({ title: 'Specification exported', description: 'merrowgate-wharf-specification.xlsx', tone: 'info' })}>Info</Button>
              <Button onClick={() => toast({ title: 'Could not export', description: 'Try again in a moment.', tone: 'error' })}>Error</Button>
            </Row>
            <Dialog
              open={dialog}
              onOpenChange={setDialog}
              title="New project"
              description="Projects hold your shortlist, specification and team."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setDialog(false)}>
                    Create project
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-4">
                <Field label="Project name">
                  <Input placeholder="Merrowgate Wharf" />
                </Field>
                <Field label="Materials needed on site from">
                  <Input type="date" defaultValue="2028-04-03" />
                </Field>
              </div>
            </Dialog>
            <Sheet
              open={sheet}
              onOpenChange={setSheet}
              title="Edit availability"
              description="UB 457x191x67, 7.5 m"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setSheet(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setSheet(false)}>
                    Save
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-5">
                <MaterialImage spec={steel.spec} publicId={steel.publicId} rounded="lg" showKind />
                <Field label="Available from">
                  <Input type="month" defaultValue="2027-01" />
                </Field>
                <Field label="Visibility">
                  <Select
                    defaultValue="private"
                    options={[
                      { value: 'private', label: 'Private' },
                      { value: 'shared', label: 'Shared with selected projects' },
                      { value: 'published', label: 'Published' },
                    ]}
                  />
                </Field>
              </div>
            </Sheet>
            <Sheet open={bottom} onOpenChange={setBottom} side="bottom" title="Filters">
              <div className="flex flex-col gap-4">
                <Checkbox label="Structure" defaultChecked />
                <Checkbox label="Envelope" />
                <Checkbox label="Finishes" />
              </div>
            </Sheet>
            <CommandPalette
              open={palette}
              onOpenChange={setPalette}
              groups={[
                {
                  heading: 'Materials',
                  items: SAMPLE_MATERIALS.slice(0, 4).map((m) => ({
                    id: m.publicId,
                    label: m.title,
                    hint: m.eyebrow,
                    visual: <MaterialImage spec={m.spec} publicId={m.publicId} aspect="fill" />,
                    onSelect: () => toast(`Opened ${m.title}`),
                  })),
                },
                {
                  heading: 'Projects',
                  items: [
                    { id: 'p1', label: 'Merrowgate Wharf', hint: 'Office', icon: FolderOpen, onSelect: () => toast('Opened Merrowgate Wharf') },
                    { id: 'p2', label: 'Sallow Court', hint: 'Residential', icon: FolderOpen, onSelect: () => toast('Opened Sallow Court') },
                  ],
                },
                {
                  heading: 'Pages',
                  items: [
                    { id: 'g1', label: 'Discover', icon: LayoutGrid, shortcut: ['G', 'D'], onSelect: () => toast('Opened Discover') },
                    { id: 'g2', label: 'Notifications', icon: Inbox, onSelect: () => toast('Opened Notifications') },
                    { id: 'g3', label: 'Settings', icon: Settings, onSelect: () => toast('Opened Settings') },
                  ],
                },
              ]}
            />
          </Section>

          <Section id="feedback" title="Feedback">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <EmptyState icon={Bookmark} title="Nothing shortlisted yet" text="Browse Discover and save materials to this project. They appear here for you to send to your client." action={<Button variant="primary" icon={LayoutGrid}>Browse Discover</Button>} />
              </Card>
              <Card>
                <EmptyState icon={Search} title="No materials match" text="Try fewer filters or a different word." action={<Button>Clear filters</Button>} />
              </Card>
            </div>
            <EmptyState variant="inline" icon={Archive} title="No requests waiting" text="Reservation requests from clients appear here." />
            <Row label="Progress" className="grid max-w-xl gap-6">
              <ProgressBar label="Survey progress" value={18} max={24} valueText="18 of 24 items" showLabel />
              <SegmentedBar
                label="Shortlist"
                segments={[
                  { key: 'shortlisted', label: 'Shortlisted', count: 6, tone: 'neutral' },
                  { key: 'sent', label: 'Sent', count: 3, tone: 'info' },
                  { key: 'approved', label: 'Approved', count: 4, tone: 'brand' },
                  { key: 'declined', label: 'Declined', count: 1, tone: 'danger' },
                ]}
              />
              <SegmentedBar label="Empty" segments={[{ key: 'shortlisted', label: 'Shortlisted', count: 0, tone: 'neutral' }]} />
            </Row>
            <Row label="Loading" className="grid gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton shape="circle" className="size-10" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton shape="text" className="w-1/2" />
                    <Skeleton shape="text" className="w-1/3" />
                  </div>
                </div>
                <SkeletonText lines={4} />
              </div>
            </Row>
          </Section>

          <Section id="materials" title="Materials" text="Photos lead when the surveyor took one. Otherwise an illustration generated from the survey record, the same every time for the same listing.">
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {SAMPLE_MATERIALS.map((m) => (
                <MaterialCard
                  key={m.publicId}
                  href="#materials"
                  title={m.title}
                  eyebrow={m.eyebrow}
                  image={<MaterialImage spec={m.spec} publicId={m.publicId} />}
                  facts={[m.quantity, m.available, m.location]}
                  fit={m.fit}
                  band={m.band}
                  action={<IconButton icon={Bookmark} label="Save" variant="secondary" size="sm" className="bg-white/90 backdrop-blur-sm" />}
                />
              ))}
            </div>
            <Row label="Large" className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <MaterialImage spec={SAMPLE_MATERIALS[3].spec} publicId={SAMPLE_MATERIALS[3].publicId} aspect="16/10" rounded="xl" showKind />
              <div className="grid gap-4">
                <MaterialImage spec={SAMPLE_MATERIALS[1].spec} publicId={SAMPLE_MATERIALS[1].publicId} aspect="16/10" rounded="xl" showKind />
                <MaterialImage spec={SAMPLE_MATERIALS[0].spec} publicId={SAMPLE_MATERIALS[0].publicId} aspect="16/10" rounded="xl" showKind />
              </div>
            </Row>
            <Row label="Dimensioned drawings">
              <Card padding="md" className="flex items-center justify-center">
                <MaterialDrawing spec={SAMPLE_MATERIALS[0].spec} />
              </Card>
              <Card padding="md" className="flex items-center justify-center">
                <MaterialDrawing spec={SAMPLE_MATERIALS[3].spec} box={120} />
              </Card>
              <Card padding="md" className="flex items-center justify-center">
                <MaterialDrawing spec={SAMPLE_MATERIALS[2].spec} />
              </Card>
            </Row>
            <Row label="Sustainability band">
              <SustainabilityBand band={BANDS.high} />
              <SustainabilityBand band={BANDS.medium} />
              <SustainabilityBand band={BANDS.low} />
              <SustainabilityBand band={BANDS.none} />
              <SustainabilityBand band={BANDS.high} showLabel indicative />
            </Row>
          </Section>

          <Section id="programme" title="Programme">
            <Card padding="md">
              <TimelineStrip today="2026-10-07" startDate="2027-09-06" items={[{ id: 'one', window: { start: '2027-01-01', end: '2027-03-31' }, fit: 'in_time' }]} />
            </Card>
            <Card padding="md">
              <TimelineStrip
                today="2026-10-07"
                startDate="2028-04-03"
                items={[
                  { id: 'a', label: 'UB 457x191x67, 7.5 m', window: { start: '2027-01-01', end: '2027-03-31' }, fit: 'in_time' },
                  { id: 'b', label: 'Portland stone cladding', window: { start: '2027-10-01', end: '2027-12-31' }, fit: 'in_time' },
                  { id: 'c', label: 'Curtain wall panels', window: { start: '2028-02-01', end: '2028-03-20' }, fit: 'tight' },
                  { id: 'd', label: 'Precast cladding panels', window: { start: '2028-05-01', end: '2028-07-31' }, fit: 'late' },
                  { id: 'e', label: 'London stock bricks', window: null, fit: 'now' },
                ]}
              />
            </Card>
          </Section>

          <Section id="brand" title="Brand">
            <Row label="Logo">
              <Logo size="sm" />
              <Logo />
              <Logo size="lg" />
              <span className="inline-flex rounded-lg bg-brand-700 p-3">
                <Logo tone="white" />
              </span>
              <LogoMark size={40} />
            </Row>
            <Row label="Icons">
              {[Package, Leaf, Building2, MapPin, FileSpreadsheet, Users].map((I, i) => (
                <span key={i} className="inline-flex size-9 items-center justify-center rounded-md border border-line bg-surface text-ink-soft">
                  <I aria-hidden="true" className="size-4" />
                </span>
              ))}
            </Row>
          </Section>
        </main>
      </div>
    </div>
  )
}
