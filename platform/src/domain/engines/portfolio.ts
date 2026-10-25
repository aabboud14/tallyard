// The programme across a client's projects on one time axis (client-consultant design, section 3.5): every stage
// segment, milestone and the today line as a position from 0 to 1, so the chart only places them. Pure.
import { addDays, daysBetween, formatMonth, maxDate, monthWindow } from '../dates'
import { monthStarts } from './timelineScale'

export type ProgrammeInput = { id: string; name: string; stages: { stage: number; start: string; end: string }[]; siteStart: string | null; completion: string | null; materialsFrom: string }

export type PortfolioSegment = { stage: number; from: number; to: number; state: 'done' | 'current' | 'ahead' }

export type PortfolioRow = { id: string; name: string; segments: PortfolioSegment[]; siteStart: number | null; completion: number | null; materialsFrom: number; currentStage: number | null; hasProgramme: boolean }

export type PortfolioTimeline = {
  start: string
  end: string
  spanDays: number
  today: number
  ticks: { iso: string; at: number; label: string | null }[]
  rows: PortfolioRow[]
}

/** Days of margin after the latest date drawn. */
export const PORTFOLIO_MARGIN_DAYS = 90
/** Stages drawn on the chart: 0 to 6. Stage 7, Use, is open-ended. */
export const PORTFOLIO_LAST_STAGE = 6

function minDate(a: string, b: string): string {
  return daysBetween(a, b) < 0 ? b : a
}

function tickLabel(iso: string, months: number, first: boolean): string | null {
  const m = Number(iso.slice(5, 7))
  const shown = months <= 12 ? true : months <= 36 ? (m - 1) % 3 === 0 : m === 1
  if (!shown) return null
  const [name, year] = formatMonth(iso).split(' ')
  return first || m === 1 ? `${name.slice(0, 3)} ${year}` : name.slice(0, 3)
}

export function portfolioTimeline(rows: ProgrammeInput[], today: string): PortfolioTimeline {
  const drawn = rows.map((r) => ({ ...r, stages: r.stages.filter((s) => s.stage >= 0 && s.stage <= PORTFOLIO_LAST_STAGE) }))
  let lo = today
  let hi = today
  for (const r of drawn) {
    for (const s of r.stages) {
      lo = minDate(lo, s.start)
      if (s.stage <= 5) hi = maxDate(hi, s.end)
    }
    for (const d of [r.siteStart, r.completion, r.materialsFrom]) {
      if (!d) continue
      lo = minDate(lo, d)
      hi = maxDate(hi, d)
    }
  }
  const start = monthWindow(lo).start
  const end = monthWindow(addDays(hi, PORTFOLIO_MARGIN_DAYS)).end
  const spanDays = Math.max(1, daysBetween(start, end))
  const at = (d: string) => Math.min(1, Math.max(0, daysBetween(start, d) / spanDays))
  const firsts = [start, ...monthStarts(start, end)]
  let first = true
  const ticks = firsts.map((iso) => {
    const label = tickLabel(iso, firsts.length, first)
    if (label !== null) first = false
    return { iso, at: at(iso), label }
  })
  return {
    start,
    end,
    spanDays,
    today: at(today),
    ticks,
    rows: drawn.map((r) => {
      const segments = r.stages.map((s): PortfolioSegment => {
        const state = daysBetween(s.end, today) > 0 ? 'done' : daysBetween(s.start, today) >= 0 ? 'current' : 'ahead'
        return { stage: s.stage, from: at(s.start), to: at(s.end), state }
      })
      return {
        id: r.id,
        name: r.name,
        segments,
        siteStart: r.siteStart ? at(r.siteStart) : null,
        completion: r.completion ? at(r.completion) : null,
        materialsFrom: at(r.materialsFrom),
        currentStage: segments.find((s) => s.state === 'current')?.stage ?? null,
        hasProgramme: r.stages.length > 0,
      }
    }),
  }
}
