// The frameworks the product maps its records to, for the landing page's standards row. Built from the reference
// data the product itself reads: the RIBA stages that set each programme and the requirement entries projects
// track. Named as text only: no logos, no badges, and no claim of affiliation or endorsement.
import { RIBA_STAGES } from './policy'
import { LONDON_REQUIREMENTS, NATIONAL_REQUIREMENTS, type PlanningRequirement } from './requirements'

export type ReportingFramework = { id: string; name: string; line: string }

export const FRAMEWORKS_TITLE = 'Maps to the frameworks you report against'
export const FRAMEWORKS_CAPTION = 'Indicative summaries to check. Not affiliated with or endorsed by these bodies.'

function entry(id: string): PlanningRequirement {
  const r = [...NATIONAL_REQUIREMENTS, ...LONDON_REQUIREMENTS].find((x) => x.id === id)
  if (!r) throw new Error(`No requirement ${id}`)
  return r
}

/** RIBA Plan of Work, London Plan, BREEAM, LEED, WELL and the UK Net Zero Carbon Buildings Standard, in that order. */
export function reportingFrameworks(): ReportingFramework[] {
  const last = RIBA_STAGES.length - 1
  const si7 = entry('lp-si7')
  const si2 = entry('lp-si2')
  const londonPlan = si7.source.replace(/\s+\d{4}$/, '')
  const sentence = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
  return [
    { id: 'riba', name: 'RIBA Plan of Work', line: `Stages 0 to ${last}, ${RIBA_STAGES[0]} to ${RIBA_STAGES[last]}, set each programme` },
    { id: 'london-plan', name: londonPlan, line: `${si7.title}, and ${sentence(si2.title)}` },
    ...(['breeam-nc', 'leed-v5', 'well-v2'] as const).map((id) => {
      const r = entry(id)
      return { id: r.id, name: r.code, line: whatItCovers(r.summary) }
    }),
    { id: 'nzcbs', name: entry('nzcbs').title, line: whatItCovers(entry('nzcbs').summary) },
  ]
}

/**
 * What a scheme covers, from its summary: the last sentence, which says what it asks about materials and carbon
 * ("Mat 01 covers life cycle assessment ..."), without its full stop or an opening "Its". A one-sentence summary
 * is used whole.
 */
export function whatItCovers(summary: string): string {
  const sentences = summary.split(/(?<=\.)\s+/).filter((x) => x.length > 0)
  // A last sentence that opens with "Its" stands under the scheme's name without the pronoun.
  const last = sentences[sentences.length - 1].replace(/\.$/, '').replace(/^Its\s+(\w)/, (_m, c: string) => c.toUpperCase())
  return last
}
