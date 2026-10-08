// View helpers for the sustainability consultant's wish list review (brief/09-V1-PRODUCT.md sections 3.5 and 13.12).
// Pure: World in, plain values out. Read only: no targets, no comparison, no actions.
import type { Spec, World } from '../../domain/types'
import type { Band, Fit, TimelineFit, WishStatus, WishTotals } from '../../domain/v1types'
import { WISH_STATUS_LABELS } from '../../domain/reference/labels'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { formatDate } from '../../domain/dates'
import { availabilityText, quantityText } from '../../domain/engines/specSheet'
import { reviewView, type ProjectHeader } from '../v1selectors'
import { fitTone, storageText, type Tone } from './market'

/** The order a consultant reads the list in: what the client has approved first. */
export const REVIEW_ORDER: WishStatus[] = ['approved', 'sent', 'pending', 'declined']

export type ReviewLine = {
  itemId: string
  publicId: string
  title: string
  typologyLabel: string
  spec: Spec
  quantity: string
  massT: number
  /** Null when no avoided carbon is claimed (unused surplus). */
  avoidedT: number | null
  band: Band
  availability: string
  fit: TimelineFit | null
  fitTone: Tone | null
  storage: string | null
  addedOn: string
  note: string
  decisionNote: string | null
}

export type ReviewSection = {
  status: WishStatus
  label: string
  lines: ReviewLine[]
  totals: WishTotals
}

export type ReviewScreen = {
  project: ProjectHeader
  stageLine: string
  sections: ReviewSection[]
  totals: WishTotals
  isEmpty: boolean
}

/** The consultant's review of a project's wish list, by state, or null when the persona is not the project's consultant. */
export function reviewScreen(world: World, personaId: string, projectId: string): ReviewScreen | null {
  const v = reviewView(world, personaId, projectId)
  if (!v) return null
  const p = world.projects[projectId]
  const sections = REVIEW_ORDER.map((status) => ({
    status,
    label: WISH_STATUS_LABELS[status],
    totals: v.totals[status],
    lines: v.byState[status].map((r): ReviewLine => {
      const l = r.listing!
      const fit: Fit | null = r.fit ? r.fit.fit : null
      return {
        itemId: r.item.id,
        publicId: l.publicId,
        title: r.title,
        typologyLabel: r.typologyLabel,
        spec: l.spec,
        quantity: quantityText(l),
        massT: l.massT,
        avoidedT: l.carbon ? l.carbon.avoidedT : null,
        band: r.band!,
        availability: availabilityText(l),
        fit: r.fit,
        fitTone: fit ? fitTone(fit) : null,
        storage: r.fit ? storageText(r.fit.storageMonths) : null,
        addedOn: formatDate(r.item.addedOn),
        note: r.item.note,
        decisionNote: r.item.decisionNote,
      }
    }),
  }))
  return {
    project: v.project,
    stageLine: `RIBA Stage ${p.ribaStage}, ${RIBA_STAGES[p.ribaStage]}.`,
    sections,
    totals: v.totals.all,
    isEmpty: v.totals.all.count === 0,
  }
}
