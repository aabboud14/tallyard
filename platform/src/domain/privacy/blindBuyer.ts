// The only description of a buyer a seller sees before a deal is confirmed.
import type { BlindBuyer, Project } from '../types'
import { MONTHS, quarterWindow } from '../dates'

/**
 * The three-month window a date falls in, in words: 'April to June 2028'. It names the same window the quarter
 * label did (BRIEF 14.3), so a seller learns nothing more about the buyer's programme.
 */
export function needByWindowText(iso: string): string {
  const w = quarterWindow(iso)
  return `${MONTHS[Number(w.start.slice(5, 7)) - 1]} to ${MONTHS[Number(w.end.slice(5, 7)) - 1]} ${w.end.slice(0, 4)}`
}

/** The field keeps its name so the projection's field set is unchanged; it holds the window in words. */
export function toBlindBuyer(project: Project): BlindBuyer {
  return { orgType: project.blind.orgType, projectType: project.blind.projectType, region: project.region, needByQuarter: needByWindowText(project.keyDates.steelNeedBy) }
}

export function blindBuyerText(b: BlindBuyer): string {
  return `${b.orgType}, ${b.projectType}, ${b.region}, needed ${b.needByQuarter}`
}
