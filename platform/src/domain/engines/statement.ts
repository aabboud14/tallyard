// The circular economy statement, written from the project's records (client-consultant design, section 3.6). Eight
// sections, each generated text with no date in it, so the text only changes when the records do. The consultant may
// replace any section; an edit keeps the generated text it replaced, so a later change in the figures shows.
import type { FamilyId } from '../types'
import type { StatementEdit, StatementSectionId } from '../sustainabilityTypes'
import { LABELS } from '../reference/labels'
import { STAGE_CHECKLIST } from '../reference/policy'
import { CERT_CAVEAT } from '../reference/sustainabilityCopy'
import { goalDef } from '../reference/goals'
import { goalValueText } from './goals'
import * as f from '../format'

export type StatementItem = { publicId: string; description: string; quantityLabel: string; family: FamilyId; status: 'Confirmed' | 'Reserved' | 'Approved' }

export type StatementInput = {
  projectName: string
  clientName: string
  architectName: string
  consultantName: string
  typeLabel: string
  giaM2: number
  localAuthority: string
  region: string
  stageText: string
  requirementTitles: string[]
  hasBill: boolean
  contentSecured: number
  contentWithApproved: number
  contentWithoutReuse: number
  aim: number
  contentTarget: number | null
  avoidedSecuredT: number
  avoidedApprovedT: number
  carbonTargetT: number | null
  items: StatementItem[]
  targets: { label: string; targetText: string; actualText: string; statusText: string }[]
  credits: { schemeLabel: string; code: string; title: string; statusLabel: string }[]
}

export type StatementSection = { id: StatementSectionId; heading: string; text: string }

export const STATEMENT_SECTIONS: { id: StatementSectionId; heading: string }[] = [
  { id: 'context', heading: 'Project and policy context' },
  { id: 'approach', heading: 'Strategic approach' },
  { id: 'reuse', heading: 'Reclaimed materials' },
  { id: 'content', heading: 'Reused and recycled content by value' },
  { id: 'carbon', heading: 'Upfront carbon avoided' },
  { id: 'targets', heading: 'Targets and commitments' },
  { id: 'certification', heading: 'Certification' },
  { id: 'next_steps', heading: 'Next steps' },
]

/** Families in the plural, inside a sentence. */
const FAMILY_PLURALS: Record<FamilyId, string> = {
  steel_section: 'structural steel sections',
  curtain_wall: 'curtain wall panels',
  precast_cladding: 'precast cladding panels',
  stone_cladding: 'stone cladding',
  clay_brick: 'clay bricks',
  raised_floor: 'raised access floor panels',
  timber_joist: 'timber joists',
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function ratioText(v: number): string {
  return goalValueText(goalDef('content_by_value'), v)
}

function context(i: StatementInput): string {
  const place = [i.localAuthority, i.region].filter((x) => x).join(', ')
  const type = lowerFirst(i.typeLabel)
  let t = `${i.projectName} is ${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type} scheme of ${f.fixed(i.giaM2, 0)} m2 GIA${place ? ` in ${place}` : ''}, at ${i.stageText}. The client is ${i.clientName} and the architect is ${i.architectName}. This statement follows London Plan 2021 Policy SI 7 and the Circular Economy Statement guidance (2022) and covers the reclaimed materials recorded in Tallyard.`
  if (i.requirementTitles.length > 0) t += `\nThe requirements recorded for this project are ${listJoin(i.requirementTitles)}.`
  return t + '\n' + LABELS.L16
}

function approach(i: StatementInput): string {
  if (i.items.length === 0) return 'No reclaimed materials are on record yet. The design team will look for reclaimed structure, envelope and finishes as the design develops.'
  const families = [...new Set(i.items.map((x) => x.family))].map((fam) => FAMILY_PLURALS[fam])
  return `The design team follows the circular economy hierarchy: keep materials in use at their highest value, reuse before recycling, and design out waste. Reclaimed ${listJoin(families)} have been chosen for this scheme, checked against the programme and, for structural steel, against testing before specification.`
}

function reuse(i: StatementInput): string {
  if (i.items.length === 0) return 'None yet.'
  const secured = i.items.filter((x) => x.status !== 'Approved').length
  const approved = i.items.length - secured
  const lines = i.items.map((x) => `${x.publicId}, ${x.description}, ${x.quantityLabel}: ${x.status.toLowerCase()}.`)
  return [`${i.items.length} reclaimed ${i.items.length === 1 ? 'material' : 'materials'} on record: ${secured} secured through earlier deals or reservations, and ${approved} approved by the client and not yet reserved.`, ...lines].join('\n')
}

function content(i: StatementInput): string {
  if (!i.hasBill) return 'The bill of materials is not yet on record, so content by value cannot be worked out.'
  let t = `Reused and recycled content by value is ${f.percent2(i.contentSecured)} with what is secured and ${f.percent2(i.contentWithApproved)} with the approved materials. Without reuse it would be ${f.percent2(i.contentWithoutReuse)}. The guidance aims for at least ${ratioText(i.aim)}`
  if (i.contentTarget !== null && i.contentTarget !== i.aim) t += `; this project targets at least ${ratioText(i.contentTarget)}`
  return t + '.\n' + LABELS.L15
}

function carbon(i: StatementInput): string {
  let t = `Reusing the secured materials avoids an estimated ${f.carbon(i.avoidedSecuredT)} of upfront carbon against buying new, and ${f.carbon(i.avoidedSecuredT + i.avoidedApprovedT)} with the approved materials.`
  if (i.carbonTargetT !== null) t += ` The project target is ${f.carbon(i.carbonTargetT)}.`
  return t + '\n' + LABELS.L11
}

function targets(i: StatementInput): string {
  if (i.targets.length === 0) return 'No targets are set yet.'
  return i.targets.map((x) => `${x.label}: target ${x.targetText}, now ${x.actualText}, ${lowerFirst(x.statusText)}.`).join('\n')
}

function certification(i: StatementInput): string {
  const head = i.credits.length === 0 ? 'No certification credits are targeted yet.' : ['Credits and measures targeted:', ...i.credits.map((c) => `${c.schemeLabel} ${c.code}, ${c.title}: ${c.statusLabel.toLowerCase()}.`)].join('\n')
  return head + '\n' + CERT_CAVEAT
}

function nextSteps(): string {
  return ['The statement is updated at each stage:', ...STAGE_CHECKLIST].join('\n')
}

export function statementSections(i: StatementInput): StatementSection[] {
  const text: Record<StatementSectionId, string> = {
    context: context(i),
    approach: approach(i),
    reuse: reuse(i),
    content: content(i),
    carbon: carbon(i),
    targets: targets(i),
    certification: certification(i),
    next_steps: nextSteps(),
  }
  return STATEMENT_SECTIONS.map((s) => ({ id: s.id, heading: s.heading, text: text[s.id] }))
}

/** True when the section was edited and the generated text has changed since. */
export function isStale(edit: StatementEdit | undefined, generated: string): boolean {
  return !!edit && edit.basis !== generated
}

/** The statement as plain text, for copying. */
export function statementPlainText(title: string, subtitle: string, sections: { heading: string; text: string }[], caveat: string): string {
  return [title, subtitle, '', ...sections.flatMap((s) => [s.heading, s.text, '']), caveat].join('\n')
}
