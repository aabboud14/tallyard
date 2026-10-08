// @vitest-environment jsdom
// The design system: every component renders with its roles, names and focus behaviour, and no rendered text
// carries an em dash, an en dash, an arrow, a tick or a comparison sign (P6).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { Search } from 'lucide-react'
import type { Spec } from '../domain/types'
import { accessibleName, allByRole, allText, byRole, byTestId, cleanup, click, FORBIDDEN, installDomShims, press, render, typeInto } from './testing'
import { Gallery } from './Gallery'
import {
  Avatar,
  AvatarStack,
  Breadcrumbs,
  Button,
  Checkbox,
  CommandPalette,
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FitPill,
  IconButton,
  Input,
  Kbd,
  Logo,
  MaterialDrawing,
  MaterialImage,
  PageHeader,
  ProgressBar,
  SandboxBadge,
  SegmentedBar,
  SegmentedControl,
  Select,
  Sheet,
  StatusPill,
  SustainabilityBand,
  Switch,
  Table,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TimelineStrip,
  Toaster,
  toast,
  TR,
} from './index'
import { BANDS, SAMPLE_MATERIALS } from './samples'
import { hueFor, initialsOf } from './illustration/rng'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

describe('Gallery', () => {
  it('renders every section without a forbidden character', () => {
    render(<Gallery />)
    expect(byRole('heading', 'Design system')).toBeTruthy()
    for (const s of ['Foundations', 'Buttons', 'Inputs', 'Badges and pills', 'Avatars', 'Cards and stats', 'Navigation', 'Table', 'Overlays', 'Feedback', 'Materials', 'Programme', 'Brand']) {
      expect(byRole('heading', s)).toBeTruthy()
    }
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('gives every button, link, field and picture an accessible name', () => {
    render(<Gallery />)
    for (const b of allByRole('button')) expect(accessibleName(b), b.outerHTML.slice(0, 120)).not.toBe('')
    for (const a of allByRole('link')) expect(accessibleName(a), a.outerHTML.slice(0, 120)).not.toBe('')
    const fields = Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea')).filter((el) => el.getAttribute('type') !== 'hidden' && !el.closest('[aria-hidden="true"]'))
    expect(fields.length).toBeGreaterThan(5)
    for (const f of fields) expect(accessibleName(f), f.outerHTML.slice(0, 120)).not.toBe('')
    for (const img of allByRole('img')) expect(accessibleName(img), img.outerHTML.slice(0, 120)).not.toBe('')
    for (const sw of allByRole('switch')) expect(accessibleName(sw)).not.toBe('')
    for (const cb of allByRole('checkbox')) expect(accessibleName(cb)).not.toBe('')
  })

  it('never describes an illustration as a photo', () => {
    render(<Gallery />)
    const labels = Array.from(document.querySelectorAll('[data-family]')).map((e) => e.getAttribute('aria-label') ?? '')
    expect(labels.length).toBeGreaterThan(8)
    for (const l of labels) {
      expect(l).toMatch(/^Illustration of /)
      expect(l.toLowerCase()).not.toContain('photo')
    }
  })
})

describe('focus', () => {
  it('draws a visible focus ring for every element and honours reduced motion', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid/)
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/)
  })

  it('keeps buttons and icon buttons focusable with their own ring', () => {
    render(
      <>
        <Button>Save</Button>
        <IconButton icon={Search} label="Search" />
      </>,
    )
    const save = byRole('button', 'Save')
    save.focus()
    expect(document.activeElement).toBe(save)
    expect(save.className).toContain('focus-visible:outline-2')
    expect(byRole('button', 'Search').getAttribute('aria-label')).toBe('Search')
  })
})

describe('Button', () => {
  it('shows a loading state that is busy and disabled', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    )
    const b = byRole('button', 'Saving') as HTMLButtonElement
    expect(b.disabled).toBe(true)
    expect(b.getAttribute('aria-busy')).toBe('true')
  })

  it('renders a link with button styling when asked', () => {
    render(
      <Button asChild variant="primary">
        <a href="/signup">Get started</a>
      </Button>,
    )
    const a = byRole('link', 'Get started')
    expect(a.getAttribute('href')).toBe('/signup')
    expect(a.className).toContain('bg-brand-600')
  })
})

describe('Field', () => {
  it('labels the control and describes it with the hint and the error', () => {
    render(
      <Field label="Email" hint="Use your work address." error="Enter an email address.">
        <Input type="email" />
      </Field>,
    )
    const input = document.querySelector('input')!
    expect(accessibleName(input)).toBe('Email')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ')
    const described = ids.map((id) => document.getElementById(id)?.textContent)
    expect(described).toEqual(['Use your work address.', 'Enter an email address.'])
  })

  it('labels a select and shows an optional marker', () => {
    render(
      <Field label="Type" optional>
        <Select options={[{ value: 'office', label: 'Office' }]} />
      </Field>,
    )
    const sel = document.querySelector('select')!
    expect(accessibleName(sel)).toContain('Type')
    expect(document.body.textContent).toContain('Optional')
  })
})

describe('Checkbox and Switch', () => {
  it('toggle with a click and report their state', () => {
    function Both() {
      const [on, setOn] = useState(false)
      return (
        <>
          <Checkbox label="Remember me" />
          <Switch label="Email me" checked={on} onCheckedChange={setOn} />
        </>
      )
    }
    render(<Both />)
    const cb = byRole('checkbox', 'Remember me')
    expect(cb.getAttribute('aria-checked')).toBe('false')
    click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('true')
    const sw = byRole('switch', 'Email me')
    expect(sw.getAttribute('aria-checked')).toBe('false')
    click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })
})

describe('Pills', () => {
  it('names every shortlist status', () => {
    render(
      <>
        <StatusPill status="shortlisted" />
        <StatusPill status="pending" />
        <StatusPill status="sent" />
        <StatusPill status="approved" />
        <StatusPill status="declined" />
      </>,
    )
    expect(document.body.textContent).toBe('ShortlistedShortlistedSent to clientApprovedDeclined')
    expect(Array.from(document.querySelectorAll('[data-status]')).map((e) => e.getAttribute('data-status'))).toEqual(['shortlisted', 'shortlisted', 'sent', 'approved', 'declined'])
  })

  it('reads every timeline fit as a full sentence', () => {
    render(
      <>
        <FitPill fit="in_time" />
        <FitPill fit="tight" />
        <FitPill fit="late" />
        <FitPill fit="now" />
      </>,
    )
    const names = Array.from(document.querySelectorAll('[data-fit]')).map((e) => e.getAttribute('aria-label'))
    expect(names).toEqual(['Timeline check: Available in time', 'Timeline check: Tight: available close to the start date', 'Timeline check: Not available in time', 'Timeline check: Available now: storage until the start'])
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('Avatar', () => {
  it('shows initials, names the person and keeps the same hue for the same name', () => {
    render(
      <>
        <Avatar name="Priya Nair" />
        <Avatar name="Priya Nair" />
        <AvatarStack people={[{ name: 'Priya Nair' }, { name: 'Isla Brennan' }, { name: 'Tom Ashby' }, { name: 'Dana Kowalski' }]} max={2} />
      </>,
    )
    const [a, b] = allByRole('img')
    expect(accessibleName(a)).toBe('Priya Nair')
    expect(a.textContent).toBe('PN')
    expect(a.getAttribute('style')).toBe(b.getAttribute('style'))
    const stack = byRole('group', 'Priya Nair, Isla Brennan, Tom Ashby, Dana Kowalski')
    expect(stack.textContent).toContain('+2')
    expect(initialsOf('Studio Oriel')).toBe('SO')
    expect(initialsOf('Halewick')).toBe('HA')
    expect(hueFor('Priya Nair')).toBe(hueFor(' priya nair '))
    const hues = new Set(['Priya Nair', 'Isla Brennan', 'Tom Ashby', 'Dana Kowalski', 'Marcus Lindqvist'].map(hueFor))
    expect(hues.size).toBe(5)
  })

  it('uses the named colour from the profile when there is one', () => {
    render(<Avatar name="Tom Ashby" colour="slate" />)
    expect(byRole('img', 'Tom Ashby').getAttribute('style')).toContain('hsl(215 14% 80% / 0.7)')
  })
})

describe('Tabs', () => {
  it('renders routes as links and marks the current one', () => {
    render(
      <Tabs
        label="Project"
        items={[
          { label: 'Overview', href: '/app/projects/p1', active: true },
          { label: 'Shortlist', href: '/app/projects/p1/shortlist', count: 3 },
        ]}
      />,
    )
    const nav = byRole('navigation', 'Project')
    const links = Array.from(nav.querySelectorAll('a'))
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/app/projects/p1', '/app/projects/p1/shortlist'])
    expect(links[0].getAttribute('aria-current')).toBe('page')
    expect(links[1].getAttribute('aria-current')).toBeNull()
    expect(links[1].textContent).toBe('Shortlist3')
  })

  it('switches a segmented view with one choice pressed', () => {
    function View() {
      const [v, setV] = useState('grid')
      return (
        <SegmentedControl
          label="View"
          value={v}
          onValueChange={setV}
          items={[
            { value: 'grid', label: 'Cards' },
            { value: 'list', label: 'Table' },
          ]}
        />
      )
    }
    render(<View />)
    const table = byRole('radio', 'Table')
    expect(table.getAttribute('aria-checked')).toBe('false')
    click(table)
    expect(byRole('radio', 'Table').getAttribute('aria-checked')).toBe('true')
    expect(byRole('radio', 'Cards').getAttribute('aria-checked')).toBe('false')
  })
})

describe('Breadcrumbs and PageHeader', () => {
  it('lists the trail with the last item as the current page', () => {
    render(<PageHeader title="Merrowgate Wharf" subtitle="Office" breadcrumbs={<Breadcrumbs items={[{ label: 'Projects', href: '/app/projects' }, { label: 'Merrowgate Wharf' }]} />} actions={<Button>Invite</Button>} />)
    const nav = byRole('navigation', 'Breadcrumb')
    expect(nav.querySelector('a')!.getAttribute('href')).toBe('/app/projects')
    expect(nav.querySelector('[aria-current="page"]')!.textContent).toBe('Merrowgate Wharf')
    expect(byRole('heading', 'Merrowgate Wharf').tagName).toBe('H1')
  })
})

describe('Table', () => {
  it('marks the sorted column and sorts on click', () => {
    const onSort = vi.fn()
    render(
      <Table caption="Shortlist">
        <THead>
          <tr>
            <TH sort="asc" onSort={onSort}>
              Material
            </TH>
            <TH onSort={() => {}}>Quantity</TH>
            <TH>Status</TH>
          </tr>
        </THead>
        <TBody>
          <TR>
            <TD>UB 457x191x67</TD>
            <TD align="right">48 pieces</TD>
            <TD>
              <StatusPill status="approved" />
            </TD>
          </TR>
        </TBody>
      </Table>,
    )
    const ths = Array.from(document.querySelectorAll('th'))
    expect(ths.map((t) => t.getAttribute('aria-sort'))).toEqual(['ascending', 'none', null])
    click(byRole('button', 'Material'))
    expect(onSort).toHaveBeenCalledTimes(1)
    expect(document.querySelector('caption')!.textContent).toBe('Shortlist')
  })
})

describe('Dialog and Sheet', () => {
  it('moves focus into the dialog, names it, and returns focus on Escape', async () => {
    render(
      <Dialog trigger={<Button>New project</Button>} title="New project" description="Projects hold your shortlist.">
        <Field label="Project name">
          <Input />
        </Field>
      </Dialog>,
    )
    const trigger = byRole('button', 'New project')
    trigger.focus()
    click(trigger)
    const dialog = byRole('dialog')
    expect(accessibleName(dialog)).toBe('New project')
    expect(dialog.contains(document.activeElement)).toBe(true)
    press('Escape', document.activeElement)
    expect(allByRole('dialog')).toHaveLength(0)
    // The focus scope hands focus back on the next tick.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('opens a sheet from the side with a close button', () => {
    function S() {
      const [open, setOpen] = useState(true)
      return (
        <Sheet open={open} onOpenChange={setOpen} title="Edit availability" testId="sheet">
          <p>Body</p>
        </Sheet>
      )
    }
    render(<S />)
    const sheet = byTestId('sheet')
    expect(sheet.getAttribute('data-side')).toBe('right')
    expect(accessibleName(sheet)).toBe('Edit availability')
    click(byRole('button', 'Close'))
    expect(document.querySelector('[data-testid="sheet"]')).toBeNull()
  })
})

describe('DropdownMenu', () => {
  it('opens from the keyboard and lists its items', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Account</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem tone="danger">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    const trigger = byRole('button', 'Account')
    trigger.focus()
    press('Enter', trigger)
    const menu = byRole('menu')
    expect(Array.from(menu.querySelectorAll('[role="menuitem"]')).map((m) => m.textContent)).toEqual(['Profile', 'Sign out'])
  })
})

describe('CommandPalette', () => {
  it('filters as you type and moves with the arrow keys', () => {
    const opened: string[] = []
    const onOpenChange = vi.fn()
    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        groups={[
          {
            heading: 'Projects',
            items: [
              { id: 'p1', label: 'Merrowgate Wharf', hint: 'Office', onSelect: () => opened.push('p1') },
              { id: 'p2', label: 'Sallow Court', hint: 'Residential', onSelect: () => opened.push('p2') },
            ],
          },
          { heading: 'Pages', items: [{ id: 'g1', label: 'Discover', keywords: ['browse'], onSelect: () => opened.push('g1') }] },
        ]}
      />,
    )
    const input = byRole('combobox', 'Search')
    const options = () => allByRole('option')
    expect(options().map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[0].id)
    press('ArrowDown', input)
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[1].id)
    press('ArrowUp', input)
    press('ArrowUp', input)
    expect(input.getAttribute('aria-activedescendant')).toBe(options()[2].id)
    typeInto(input, 'browse')
    expect(options().map((o) => o.textContent)).toEqual(['Discover'])
    press('Enter', input)
    expect(opened).toEqual(['g1'])
    expect(onOpenChange).toHaveBeenCalledWith(false)
    typeInto(input, 'nothing like this')
    expect(document.body.textContent).toContain('No results')
  })
})

describe('Toast', () => {
  it('shows a toast called from outside React, with its action', () => {
    const undo = vi.fn()
    render(<Toaster />)
    expect(document.body.textContent).not.toContain('Saved to Merrowgate Wharf')
    act(() => {
      toast({ title: 'Saved to Merrowgate Wharf', tone: 'success', action: { label: 'Undo', onClick: undo } })
    })
    expect(document.body.textContent).toContain('Saved to Merrowgate Wharf')
    click(byRole('button', 'Undo'))
    expect(undo).toHaveBeenCalled()
  })
})

const SPECS: { spec: Spec; publicId: string; name: string }[] = [
  { spec: { family: 'steel_section', designation: 'UB 356x171x51', lengthM: 6 }, publicId: 'L-9F4CQQ', name: 'structural steel section' },
  { spec: { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.6 }, publicId: 'L-8N33X4', name: 'curtain wall panel' },
  { spec: { family: 'precast_cladding', thicknessMm: 150 }, publicId: 'L-PRE001', name: 'precast cladding panel' },
  { spec: { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, publicId: 'L-DAXNV3', name: 'stone cladding' },
  { spec: { family: 'clay_brick', brickType: 'London stock', mortar: 'lime mortar' }, publicId: 'L-A945G6', name: 'clay brick' },
  { spec: { family: 'raised_floor', panelSize: '600 by 600' }, publicId: 'L-33XJ8M', name: 'raised access floor panel' },
  { spec: { family: 'timber_joist', species: 'pitch pine' }, publicId: 'L-CJGQP7', name: 'timber joist' },
]

/** Markup without the per-instance ids, so two renders of one listing can be compared. */
function shape(el: Element): string {
  return el.innerHTML.replace(/mi-[A-Za-z0-9_-]+?-(light|vig|grain|stone|sky|blur|conc|soft|mill|steel|hatch|shadow)/g, 'ID-$1')
}

describe('MaterialImage', () => {
  it('draws every family as a labelled illustration, the same each time for the same listing', () => {
    render(
      <div>
        {SPECS.map((s, i) => (
          <div key={i}>
            <MaterialImage spec={s.spec} publicId={s.publicId} testId={`a-${i}`} />
            <MaterialImage spec={s.spec} publicId={s.publicId} testId={`b-${i}`} />
          </div>
        ))}
      </div>,
    )
    SPECS.forEach((s, i) => {
      const a = byTestId(`a-${i}`)
      const svg = a.querySelector('svg[role="img"]')!
      expect(svg.getAttribute('aria-label')).toBe(`Illustration of ${s.name}`)
      expect(a.getAttribute('data-kind')).toBe('illustration')
      expect(shape(a)).toBe(shape(byTestId(`b-${i}`)))
    })
  })

  it('varies the drawing between listings of the same family', () => {
    const spec: Spec = { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }
    render(
      <>
        <MaterialImage spec={spec} publicId="L-5RC3DR" testId="one" />
        <MaterialImage spec={spec} publicId="L-A945G6" testId="two" />
      </>,
    )
    expect(shape(byTestId('one'))).not.toBe(shape(byTestId('two')))
  })

  it('shows the photo when there is one, with its alternative text', () => {
    render(<MaterialImage spec={SPECS[0].spec} publicId="L-9F4CQQ" photo="data:image/png;base64,AAAA" alt="Steel beams on the yard" showKind />)
    const img = document.querySelector('img')!
    expect(img.getAttribute('alt')).toBe('Steel beams on the yard')
    expect(document.body.textContent).toContain('Photo')
    expect(document.querySelector('[data-family]')).toBeNull()
  })

  it('labels the dimensioned drawings', () => {
    render(
      <>
        <MaterialDrawing spec={SPECS[0].spec} />
        <MaterialDrawing spec={SPECS[1].spec} />
      </>,
    )
    expect(allByRole('img').map(accessibleName)).toEqual(['Section drawing of UB 356x171x51', 'Drawing of Unitised curtain wall panels, 1.5 m by 3.6 m'])
  })
})

describe('Programme and progress', () => {
  it('describes the timeline in words', () => {
    render(<TimelineStrip today="2026-10-07" startDate="2027-09-06" items={[{ id: 'one', window: { start: '2027-01-01', end: '2027-03-31' }, fit: 'in_time' }]} />)
    const img = byRole('img', /Timeline from today/)
    expect(accessibleName(img)).toBe('Timeline from today, 7 Oct 2026, to the start on site, 6 Sep 2027. Available 1 Jan 2027 to 31 Mar 2027. Available in time.')
    expect(document.body.textContent).toContain('Indicative')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('reports progress and counts by status', () => {
    render(
      <>
        <ProgressBar label="Survey progress" value={18} max={24} valueText="18 of 24 items" />
        <SegmentedBar
          label="Shortlist"
          segments={[
            { key: 's', label: 'Shortlisted', count: 6, tone: 'neutral' },
            { key: 'a', label: 'Approved', count: 4, tone: 'brand' },
            { key: 'd', label: 'Declined', count: 0, tone: 'danger' },
          ]}
        />
      </>,
    )
    const bar = byRole('progressbar', 'Survey progress')
    expect(bar.getAttribute('aria-valuenow')).toBe('18')
    expect(bar.getAttribute('aria-valuemax')).toBe('24')
    expect(accessibleName(byRole('img', /Shortlist/))).toBe('Shortlist: Shortlisted 6, Approved 4, Declined 0')
  })

  it('shows the band word and the indicative marker linking to the methodology', () => {
    render(<SustainabilityBand band={BANDS.medium} indicative />)
    expect(document.body.textContent).toContain('Medium')
    expect(byRole('link', 'Indicative').getAttribute('href')).toBe('/app/help/methodology')
  })
})

describe('Brand and empty states', () => {
  it('shows the product name, the sandbox line and a considered empty state', () => {
    render(
      <>
        <Logo />
        <SandboxBadge />
        <Kbd>Esc</Kbd>
        <EmptyState icon={Search} title="No materials match" text="Try fewer filters." action={<Button>Clear filters</Button>} />
      </>,
    )
    expect(document.body.textContent).toContain('Tallyard')
    expect(byTestId('sandbox-badge').getAttribute('aria-label')).toBe('Sandbox. Sample data that stays in this browser.')
    expect(byRole('heading', 'No materials match')).toBeTruthy()
    expect(byRole('button', 'Clear filters')).toBeTruthy()
  })

  it('keeps every sample material title free of forbidden characters', () => {
    for (const m of SAMPLE_MATERIALS) expect(`${m.title} ${m.eyebrow} ${m.quantity} ${m.available} ${m.location}`).not.toMatch(FORBIDDEN)
  })
})
