// The only description of a buyer a seller sees before a deal is confirmed.
import type { BlindBuyer, Project } from '../types'
import { formatQuarter } from '../dates'

export function toBlindBuyer(project: Project): BlindBuyer {
  return { orgType: project.blind.orgType, projectType: project.blind.projectType, region: project.region, needByQuarter: formatQuarter(project.keyDates.steelNeedBy) }
}

export function blindBuyerText(b: BlindBuyer): string {
  return `${b.orgType}, ${b.projectType}, ${b.region}, needed by ${b.needByQuarter}`
}
