// The circular economy statement, written from the project's records (client-consultant design, section 3.6). Eight
// sections, each generated text with no date in it, so the text only changes when the records do. The consultant may
// replace any section; an edit keeps the generated text it replaced, so a later change in the figures shows.
import type { FamilyId } from '../types'
import type { StatementEdit, StatementSectionId, TrackStatus } from '../sustainabilityTypes'
import { LABELS } from '../reference/labels'
import { STAGE_CHECKLIST } from '../reference/policy'
import { CERT_CAVEAT, inSentence } from '../reference/sustainabilityCopy'
import { goalDef } from '../reference/goals'
import { goalValueText, type GoalProgress } from './goals'
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
  /** The declared RIBA stage, 0 to 7, for the next stage's step. */
  ribaStage: number
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
  targets: { label: string; targetText: string; actualText: string; statusText: string; status: GoalProgress['status'] }[]
  /** Targeted credits and measures, in scheme order, without the statement's own measure. */
  credits: { schemeLabel: string; code: string; title: string; statusLabel: string; status: TrackStatus; kind: 'credit' | 'measure' }[]
  /** Rating goals with no target although their scheme is recorded as a requirement: "WELL certification" and its requirement's title. */
  untargeted: { label: string; requirementTitle: string }[]
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

function upperFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ratioText(v: number): string {
  return goalValueText(goalDef('content_by_value'), v)
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** The mark that starts a list line in a section's text. Screens draw these lines as a list and the .docx as bullets. */
export const BULLET = '\u2022 '

function bullet(s: string): string {
  return BULLET + s
}

/** A block of a section: a paragraph, or a list of lines. */
export type StatementBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] }

/** A line that starts with the bullet mark, or with "- " or "* " as a person might type it. */
const LIST_LINE = /^\s*(?:\u2022|-|\*)\s+/

/** A section's text as paragraphs and lists, for the screen and the .docx. Blank lines are dropped. */
export function statementBlocks(text: string): StatementBlock[] {
  const out: StatementBlock[] = []
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue
    if (LIST_LINE.test(raw)) {
      const item = raw.replace(LIST_LINE, '').trim()
      const last = out[out.length - 1]
      if (last && last.kind === 'list') last.items.push(item)
      else out.push({ kind: 'list', items: [item] })
    } else out.push({ kind: 'paragraph', text: raw.trim() })
  }
  return out
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

/** One list line per family: "Portland stone cladding, 50 mm: 520 m2", or the family with each of its items. */
function familyLines(items: StatementItem[]): string[] {
  const families = [...new Set(items.map((x) => x.family))]
  return families.map((fam) => {
    const of = items.filter((x) => x.family === fam)
    if (of.length === 1) return bullet(`${of[0].description}: ${of[0].quantityLabel}`)
    return bullet(`${upperFirst(FAMILY_PLURALS[fam])}: ${listJoin(of.map((x) => `${x.description} (${x.quantityLabel})`))}`)
  })
}

function reuse(i: StatementInput): string {
  if (i.items.length === 0) return 'None yet. Reclaimed materials appear here once the client approves them or an earlier deal is recorded.'
  const secured = i.items.filter((x) => x.status !== 'Approved')
  const approved = i.items.filter((x) => x.status === 'Approved')
  const parts = [`${upperFirst(count(i.items.length, 'reclaimed material is', 'reclaimed materials are'))} on record for ${i.projectName}: ${secured.length} secured and ${approved.length} approved by the client and not yet reserved.`]
  if (secured.length > 0) parts.push('Secured through earlier deals or accepted reservations:', ...familyLines(secured))
  if (approved.length > 0) parts.push('Approved by the client, to be reserved:', ...familyLines(approved))
  return parts.join('\n')
}

function content(i: StatementInput): string {
  if (!i.hasBill) return 'The bill of materials is not yet on record, so content by value cannot be worked out.'
  let t = `Reused and recycled content by value is ${f.percent2(i.contentSecured)} with what is secured and ${f.percent2(i.contentWithApproved)} with the approved materials. Without reuse it would be ${f.percent2(i.contentWithoutReuse)}. The guidance aims for at least ${ratioText(i.aim)}`
  if (i.contentTarget !== null && i.contentTarget !== i.aim) t += `; this project targets at least ${ratioText(i.contentTarget)}`
  return t + '.\n' + LABELS.L15
}

function carbon(i: StatementInput): string {
  let t: string
  if (i.avoidedSecuredT <= 0 && i.avoidedApprovedT <= 0) t = 'No avoided carbon is on record yet, because no reclaimed materials are secured or approved.'
  else {
    t = `Reusing the secured materials avoids an estimated ${f.carbon(i.avoidedSecuredT)} of upfront carbon against buying new.`
    if (i.avoidedApprovedT > 0) t += ` The approved materials not yet reserved add ${f.carbon(i.avoidedApprovedT)}, so ${f.carbon(i.avoidedSecuredT + i.avoidedApprovedT)} in total once they are reserved.`
  }
  if (i.carbonTargetT !== null) t += ` The project target is ${f.carbon(i.carbonTargetT)}.`
  return t + '\n' + LABELS.L11
}

function targets(i: StatementInput): string {
  if (i.targets.length === 0) return 'No targets are set yet.'
  // A goal with no result yet reads "target 95%, no result yet", not the same words twice.
  const lines = i.targets.map((x) => bullet(x.actualText.toLowerCase() === x.statusText.toLowerCase() ? `${x.label}: target ${x.targetText}, ${inSentence(x.statusText)}.` : `${x.label}: target ${x.targetText}, now ${x.actualText}, ${inSentence(x.statusText)}.`))
  return ['The targets for this project and where each stands:', ...lines].join('\n')
}

const STATUS_ORDER: TrackStatus[] = ['evidence_ready', 'in_progress', 'at_risk', 'not_started', 'not_applicable']
const STATUS_WORDS: Record<TrackStatus, string> = { evidence_ready: 'with evidence ready', in_progress: 'in progress', at_risk: 'at risk', not_started: 'not started', not_applicable: 'not applicable' }

/** "BREEAM: 4 credits targeted, 2 in progress and 2 not started." Then the credits at risk or ready by name. */
function schemeLine(scheme: string, credits: StatementInput['credits']): string {
  const noun = credits[0].kind === 'measure' ? ['measure', 'measures'] : ['credit', 'credits']
  const parts = STATUS_ORDER.map((st) => ({ st, n: credits.filter((c) => c.status === st).length })).filter((x) => x.n > 0)
  let t = `${scheme}: ${count(credits.length, noun[0], noun[1])} targeted, ${listJoin(parts.map((x) => `${x.n} ${STATUS_WORDS[x.st]}`))}.`
  const named = (st: TrackStatus) => credits.filter((c) => c.status === st).map((c) => `${c.code}, ${inSentence(c.title)}`)
  const risk = named('at_risk')
  const ready = named('evidence_ready')
  if (risk.length > 0) t += ` At risk: ${listJoin(risk)}.`
  if (ready.length > 0) t += ` Evidence ready: ${listJoin(ready)}.`
  return bullet(t)
}

function certification(i: StatementInput): string {
  if (i.credits.length === 0) return 'No certification credits are targeted yet.\n' + CERT_CAVEAT
  const schemes = [...new Set(i.credits.map((c) => c.schemeLabel))]
  const lines = schemes.map((sc) => schemeLine(sc, i.credits.filter((c) => c.schemeLabel === sc)))
  return ['Tallyard provides evidence towards these credits and measures:', ...lines, CERT_CAVEAT].join('\n')
}

/** The step the statement's next issue answers, from the project's RIBA stage. */
function stageStep(stage: number): string {
  const line = STAGE_CHECKLIST[stage <= 2 ? 0 : stage === 3 ? 1 : 2]
  const [when, what] = line.split(': ')
  return what ? `${when} stage: ${lowerFirst(what)}.` : `${line}.`
}

function nextSteps(i: StatementInput): string {
  const steps: string[] = []
  const approved = i.items.filter((x) => x.status === 'Approved').length
  if (approved > 0) steps.push(`Reserve the ${count(approved, 'approved material', 'approved materials')} so ${approved === 1 ? 'it counts' : 'they count'} as secured in the content and carbon figures.`)
  for (const t of i.targets.filter((x) => x.status === 'below')) steps.push(`Close the gap on ${inSentence(t.label)}: now ${t.actualText}, target ${t.targetText}.`)
  const noResult = i.targets.filter((x) => x.status === 'no_data').map((x) => inSentence(x.label))
  if (noResult.length > 0) steps.push(`Record a result for ${listJoin(noResult)}.`)
  for (const c of i.credits.filter((x) => x.status === 'at_risk')) steps.push(`Resolve ${c.schemeLabel} ${c.code}, ${inSentence(c.title)}, which is at risk.`)
  for (const u of i.untargeted) steps.push(`Set a target for ${u.label}, as ${u.requirementTitle} is recorded as a requirement.`)
  steps.push(stageStep(i.ribaStage))
  return ['Before the next issue of this statement:', ...steps.map(bullet)].join('\n')
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
    next_steps: nextSteps(i),
  }
  return STATEMENT_SECTIONS.map((s) => ({ id: s.id, heading: s.heading, text: text[s.id] }))
}

/** True when the section was edited and the generated text has changed since. */
export function isStale(edit: StatementEdit | undefined, generated: string): boolean {
  return !!edit && edit.basis !== generated
}

/** The statement as plain text, for copying. List lines keep their bullet mark. */
export function statementPlainText(title: string, subtitle: string, sections: { heading: string; text: string }[], caveat: string): string {
  return [title, subtitle, '', ...sections.flatMap((s) => [s.heading, s.text, '']), caveat].join('\n')
}
