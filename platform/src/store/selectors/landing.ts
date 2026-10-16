// The landing page's product shot: the architect home exactly as Priya Nair sees it after signing in to a fresh
// sandbox today. It runs the real seed and the real selector, so the shot's greeting, date, figures and drawings
// always match the account it advertises. Sample data only; nothing here reads a visitor's own sandbox.
import { firstRun } from '../../sandbox/seed'
import { SAMPLE_ACCOUNTS } from '../../sandbox/accounts'
import { PERSONA_IDS } from '../../domain/seed/world'
import type { Viewer } from '../types'
import { architectHome, type ArchitectHome } from './architect'

export type LandingDashboard = Pick<ArchitectHome, 'greeting' | 'dateText' | 'stats' | 'metrics' | 'projects'> & { navProjects: string[] }

let cached: { key: string; value: LandingDashboard } | null = null

/** Priya's home on a fresh sandbox at this moment. Cached per hour, since the greeting changes with the time of day. */
export function landingDashboard(todayIso: string, nowIso: string): LandingDashboard {
  const key = `${todayIso}T${nowIso.slice(11, 13)}`
  if (cached?.key === key) return cached.value
  const state = firstRun(todayIso, nowIso)
  const priya = SAMPLE_ACCOUNTS.find((a) => a.personaId === PERSONA_IDS.priya)!
  const viewer: Viewer = { userId: priya.userId, now: nowIso }
  const home = architectHome(state, viewer)!
  const value: LandingDashboard = {
    greeting: home.greeting,
    dateText: home.dateText,
    stats: home.stats,
    metrics: home.metrics,
    projects: home.projects,
    navProjects: home.projects.map((p) => p.name).sort((a, b) => a.localeCompare(b, 'en-GB')),
  }
  cached = { key, value }
  return value
}
