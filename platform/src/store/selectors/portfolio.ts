// The programme across a client's projects (client-consultant design, section 5.5). programmeInput is the only reader
// of a project's programme dates for the portfolio chart; the positions come from the portfolio engine.
import type { Project } from '../../domain/types'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { formatDate, formatDateShort } from '../../domain/dates'
import { programmeStages } from '../../domain/engines/programme'
import { portfolioTimeline, PORTFOLIO_LAST_STAGE, type PortfolioRow, type ProgrammeInput } from '../../domain/engines/portfolio'
import type { AppData, Viewer } from '../types'
import { isProjectClient, projectsOfUser, roleOfUser } from '../access'
import { todayOf } from './common'

/** The adapter from a project's stored programme to the portfolio chart. A project without one has no stages. */
export function programmeInput(project: Project): ProgrammeInput {
  const prog = project.programme
  if (!prog || !Array.isArray(prog.stageStarts) || prog.stageStarts.length !== 5) return { id: project.id, name: project.name, stages: [], siteStart: null, completion: null, materialsFrom: project.startDate }
  const stages = programmeStages(prog)
    .filter((s): s is { stage: number; start: string; end: string } => s.end !== null && s.stage <= PORTFOLIO_LAST_STAGE)
    .map((s) => ({ stage: s.stage, start: s.start, end: s.end }))
  return { id: project.id, name: project.name, stages, siteStart: prog.siteStart, completion: prog.practicalCompletion, materialsFrom: project.startDate }
}

export type ClientProgrammeRow = PortfolioRow & { href: string; stageText: string; siteStartText: string | null; completionText: string | null; materialsFromText: string }
/**
 * The chart as the screen needs it: positions and labels. The axis dates stay out of the view model, so a first of
 * the month can never coincide with a seller's private date in a buyer's view (P3).
 */
export type ClientProgramme = { spanDays: number; today: number; ticks: { at: number; label: string | null }[]; rows: ClientProgrammeRow[]; todayText: string }

/** The portfolio chart over the given projects, with the words each row needs. */
export function programmeOf(projects: Project[], today: string): ClientProgramme {
  const inputs = projects.map(programmeInput)
  const t = portfolioTimeline(inputs, today)
  return {
    spanDays: t.spanDays,
    today: t.today,
    ticks: t.ticks.map((x) => ({ at: x.at, label: x.label })),
    todayText: `Today, ${formatDate(today)}`,
    rows: t.rows.map((r, i) => {
      const p = projects[i]
      const input = inputs[i]
      const stage = r.currentStage ?? p.ribaStage
      return {
        ...r,
        href: `/app/projects/${p.id}`,
        stageText: r.hasProgramme ? `Stage ${stage}, ${RIBA_STAGES[stage] ?? ''}` : 'Programme not set',
        siteStartText: input.siteStart ? `Site start ${formatDateShort(input.siteStart)}` : null,
        completionText: input.completion ? `Practical completion ${formatDateShort(input.completion)}` : null,
        materialsFromText: `Materials needed from ${formatDateShort(input.materialsFrom)}`,
      }
    }),
  }
}

/** The client's projects on one time axis; null for anyone but a client. */
export function clientProgramme(state: AppData, viewer: Viewer): ClientProgramme | null {
  if (roleOfUser(state, viewer.userId) !== 'client') return null
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectClient(state, viewer.userId, p.id))
  return programmeOf(projects, todayOf(viewer))
}
