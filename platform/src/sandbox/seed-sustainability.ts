// The sandbox's sustainability records (client-consultant design, section 8.3): Merrowgate Wharf's targets, results,
// credits, requirement tracking and a statement with the client for review, with the history that goes with them;
// and the line that put Kilnworth Place in Lantern Quay's workspace. The seeded Project.targets become the
// consultant's overrides, so effectiveTargets is the one source of targets from here on.
import { addDays } from '../domain/dates'
import type { CreditTrack, Evidence, GoalId, GoalOverride, ProjectSustainability, RequirementTrack, TrackStatus } from '../domain/sustainabilityTypes'
import { MERROWGATE_ID, ORG_IDS, PERSONA_IDS } from '../domain/seed/world'
import type { AppData } from '../store/types'
import { log, notify } from '../store/notifications'
import { mint } from '../store/ids'
import { applicableRequirements, withSustainability } from '../store/sustainabilityRecord'
import { statementView } from '../store/selectors/sustainability'
import { SAMPLE_ACCOUNTS } from './accounts'
import { KILNWORTH_ID, TESSALY_ORG_ID } from './seed-portfolio'

const USER = Object.fromEntries(SAMPLE_ACCOUNTS.map((a) => [a.personaId, a.userId])) as Record<string, string>
const MARCUS = USER[PERSONA_IDS.marcus]
const ISLA = USER[PERSONA_IDS.isla]

/** Policy SI 7, Policy SI 2 and the BREEAM requirement, as the design's london-plan-si7, london-plan-si2 and borough-breeam. */
const SI7 = 'lp-si7'
const SI2 = 'lp-si2'
const BREEAM = 'breeam-nc'

export const APPROACH_EDIT =
  'Lantern Quay Developments has asked the design team to put reclaimed structure first. The steel frame is set out on a grid that suits reclaimed sections of about 9 m, and the facade and finishes follow the same approach where the programme allows. Every reclaimed material is checked against the programme and, for structural steel, against testing before it is specified.'

export function seedSustainability(state: AppData, todayIso: string, now: string): AppData {
  const day = (k: number) => addDays(todayIso, -k)
  const nowMs = Date.parse(now)
  const at = (k: number, hh: number, mm = 0) => {
    const t = `${day(k)}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`
    return Date.parse(t) < nowMs ? t : new Date(nowMs - (k + 1) * 60_000).toISOString()
  }
  let s: AppData = { ...state, sustainability: { ...(state.sustainability ?? {}) } }
  const mg = s.world.projects[MERROWGATE_ID]
  const mgOrgs = [ORG_IDS.oriel, ORG_IDS.lantern, ORG_IDS.halewick]
  const mgHref = `/app/projects/${MERROWGATE_ID}`

  // Goals: the seeded targets become overrides, then the ratings the consultant set.
  const override = (goalId: GoalId, value: GoalOverride['value'], note: string, setAt: string): GoalOverride => ({ goalId, value, note, setByUserId: MARCUS, setAt })
  const inception = 'Set at inception with the client.'
  const goals: ProjectSustainability['goals'] = {}
  if (mg.targets.contentByValue > 0) goals.content_by_value = override('content_by_value', mg.targets.contentByValue, inception, at(40, 10))
  if (mg.targets.avoidedCarbonT > 0) goals.avoided_carbon = override('avoided_carbon', mg.targets.avoidedCarbonT, inception, at(40, 10))
  goals.breeam = override('breeam', 'Excellent', 'Client brief.', at(40, 10))
  goals.leed = override('leed', null, 'Not pursued on this project.', at(40, 10))
  goals.well = override('well', 'Silver', "The client's aim for the office floors.", at(12, 15))

  const actuals: ProjectSustainability['actuals'] = {
    upfront_carbon: { goalId: 'upfront_carbon', value: 820, asOf: day(18), source: 'Stage 2 life cycle assessment', enteredByUserId: MARCUS, enteredAt: at(18, 11) },
    breeam: { goalId: 'breeam', value: 'Very good', asOf: day(9), source: 'BREEAM pre-assessment, second workshop', enteredByUserId: MARCUS, enteredAt: at(9, 16) },
    well: { goalId: 'well', value: 'Silver', asOf: day(9), source: 'WELL scorecard, first pass', enteredByUserId: MARCUS, enteredAt: at(9, 16) },
  }

  const credit = (creditId: string, status: TrackStatus, note = ''): CreditTrack => ({ creditId, targeted: true, status, note, items: {}, updatedAt: at(9, 16), updatedByUserId: MARCUS })
  const credits: Record<string, CreditTrack> = {}
  for (const c of [
    credit('breeam-mat01', 'in_progress'),
    credit('breeam-mat03', 'not_started'),
    credit('breeam-mat05', 'in_progress'),
    credit('breeam-wst01', 'not_started'),
    credit('well-x01', 'at_risk', 'Primary beams from a shared lot are untested. Coatings to be checked for lead before delivery.'),
    credit('well-x02', 'not_started'),
    credit('well-x07', 'in_progress'),
    credit('ce-content', 'in_progress'),
    credit('ce-reuse', 'in_progress'),
    credit('ce-statement', 'in_progress'),
  ])
    credits[c.creditId] = c

  // Requirements: only those that apply to the project.
  const applies = new Set(applicableRequirements(mg).map((r) => r.id))
  const evidence = (text: string, output: Evidence['output'], addedAt: string): Evidence => {
    const taken = new Set<string>()
    const m = mint(s, 'evd', (id) => taken.has(id))
    s = m.state
    return { id: m.id, text, output, addedByUserId: MARCUS, addedBy: 'Marcus Lindqvist', addedAt }
  }
  const requirements: Record<string, RequirementTrack> = {}
  const track = (requirementId: string, status: TrackStatus, items: Evidence[]) => {
    if (!applies.has(requirementId)) return
    const updatedAt = items.map((e) => e.addedAt).sort().pop() ?? null
    requirements[requirementId] = { requirementId, status, evidence: items, updatedAt, updatedByUserId: MARCUS }
  }
  track(SI7, 'in_progress', [evidence('Pre-application meeting with the GLA. The outline of the statement was agreed.', null, at(26, 14)), evidence('Draft statement sent to the client.', 'ce_statement', at(1, 16))])
  track(SI2, 'in_progress', [evidence('Stage 2 life cycle assessment issued to the design team.', null, at(18, 11))])
  track(BREEAM, 'at_risk', [evidence('The pre-assessment predicts Very good. Two more materials credits are needed for Excellent.', null, at(9, 16))])

  const sentAt = at(1, 16)
  s = withSustainability(s, MERROWGATE_ID, () => ({
    goals,
    actuals,
    requirements,
    credits,
    statement: { edits: {}, status: 'ready_for_review', sentAt, sentByUserId: MARCUS, reviewedAt: null, reviewedByUserId: null, reviewNote: null },
  }))
  // The approach section is the consultant's own words, written over the text generated from these records.
  const generated = statementView(s, { userId: MARCUS, now }, MERROWGATE_ID)!.sections.find((x) => x.id === 'approach')!.generated
  s = withSustainability(s, MERROWGATE_ID, (r) => ({ ...r, statement: { ...r.statement!, edits: { approach: { text: APPROACH_EDIT, basis: generated, editedAt: at(2, 15), editedByUserId: MARCUS } } } }))

  // History, oldest first.
  const entry = (k: number, hh: number, text: string, path: string) => {
    s = log(s, { at: at(k, hh), orgIds: mgOrgs, projectId: MERROWGATE_ID, buildingId: null, actorUserId: MARCUS, actor: 'Marcus Lindqvist', text, href: `${mgHref}${path}` })
  }
  // Kilnworth Place's client joined the way every client now does: the practice asked, Lantern Quay accepted.
  s = log(s, { at: at(45, 10), orgIds: [TESSALY_ORG_ID, ORG_IDS.lantern], projectId: KILNWORTH_ID, buildingId: null, actorUserId: null, actor: 'Tessaly Architects', text: 'asked to add Lantern Quay Developments as client', href: `/app/projects/${KILNWORTH_ID}` })
  s = log(s, { at: at(45, 14), orgIds: [TESSALY_ORG_ID, ORG_IDS.lantern], projectId: KILNWORTH_ID, buildingId: null, actorUserId: null, actor: 'Lantern Quay Developments', text: 'accepted the project as client', href: `/app/projects/${KILNWORTH_ID}` })
  entry(40, 10, `set the targets for ${mg.name}`, '/targets')
  entry(18, 11, 'recorded upfront carbon, modules A1 to A5: 820 kgCO2e per m2', '/targets')
  const breeamTitle = applicableRequirements(mg).find((r) => r.id === BREEAM)?.title
  if (breeamTitle) entry(9, 16, `marked ${breeamTitle} as at risk`, '/requirements')
  entry(1, 16, 'sent the circular economy statement to Lantern Quay Developments for review', '/statement')

  // The notification Isla has already read: her unread count stays at one while the to-do stays open.
  s = notify(s, { orgIds: [ORG_IDS.lantern], kind: 'sustainability', title: 'Circular economy statement ready for review', body: `${mg.name}. Sent by Marcus Lindqvist, Halewick Sustainability.`, href: `${mgHref}/sustainability#statement`, at: sentAt, actorUserId: null })
  s = { ...s, notifications: s.notifications.map((n, i) => (i === 0 ? { ...n, readBy: [ISLA] } : n)) }
  return s
}
