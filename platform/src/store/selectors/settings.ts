// Settings: profile, organisation, team with invites, and the sandbox. Help: the methodology tables.
import type { AppData, Viewer } from '../types'
import { AVATAR_COLOURS } from '../types'
import { orgOfUser, roleOfUser, usersOfOrg } from '../access'
import { orgTypeLabel, ROLE_LABELS, SAMPLE_ACCOUNTS, SAMPLE_PASSWORD } from '../../sandbox/accounts'
import { parameterRows, type Parameter } from '../../domain/reference/assumptions'
import { V1_PARAMETER_ROWS } from '../../domain/reference/v1assumptions'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { initials, timeAgo } from './common'
import { notificationSettings } from './notifications'

export function profileView(state: AppData, viewer: Viewer) {
  const u = state.users[viewer.userId]
  if (!u) return null
  return { id: u.id, name: u.name, title: u.title, email: u.email, avatarColour: u.avatarColour, initials: initials(u.name), colours: [...AVATAR_COLOURS], sample: u.sample }
}

export function organisationView(state: AppData, viewer: Viewer) {
  const org = orgOfUser(state, viewer.userId)
  const role = roleOfUser(state, viewer.userId)
  if (!org || !role) return null
  return { id: org.id, name: org.name, type: org.type, typeLabel: orgTypeLabel(org.type), roleLabel: ROLE_LABELS[role], address: state.orgProfiles[org.id]?.address ?? '', memberCount: usersOfOrg(state, org.id).length }
}

export type TeamView = {
  orgName: string
  members: { id: string; name: string; title: string; email: string; initials: string; colour: string; you: boolean; joined: string }[]
  invites: { token: string; email: string; invitedBy: string; sentAgo: string; path: string }[]
}

/** The organisation's people and its pending invites, with the link each invite opens. */
export function teamView(state: AppData, viewer: Viewer): TeamView | null {
  const org = orgOfUser(state, viewer.userId)
  if (!org) return null
  return {
    orgName: org.name,
    members: usersOfOrg(state, org.id).map((u) => ({ id: u.id, name: u.name, title: u.title, email: u.email, initials: initials(u.name), colour: u.avatarColour, you: u.id === viewer.userId, joined: formatDate(u.createdAt.slice(0, 10)) })),
    invites: Object.values(state.invites)
      .filter((i) => i.orgId === org.id && i.status === 'pending')
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((i) => ({ token: i.token, email: i.email, invitedBy: state.users[i.invitedByUserId]?.name ?? '', sentAgo: timeAgo(i.createdAt, viewer.now), path: `/invite/${i.token}` })),
  }
}

export { notificationSettings }

/** The sandbox page: when it was seeded and the sample accounts. */
export function sandboxView(state: AppData, viewer: Viewer) {
  return {
    seededOn: state.seededOn,
    seededText: formatDate(state.seededOn),
    password: SAMPLE_PASSWORD,
    accounts: SAMPLE_ACCOUNTS.map((a) => ({ userId: a.userId, name: a.name, email: a.email, orgName: state.world.orgs[a.orgId]?.name ?? '', roleLabel: ROLE_LABELS[a.role], line: a.line, colour: a.avatarColour, initials: initials(a.name), current: a.userId === viewer.userId, exists: !!state.users[a.userId] })),
  }
}

/** What the invite page shows before anyone is signed in, or why the link cannot be used. */
export function inviteDetails(state: AppData, token: string): { orgName: string; orgTypeLabel: string; invitedBy: string; email: string } | { error: string } {
  const inv = state.invites[token]
  if (!inv) return { error: 'This invite link is not valid.' }
  if (inv.status !== 'pending') return { error: 'This invite has already been used or was revoked.' }
  const org = state.world.orgs[inv.orgId]
  return { orgName: org?.name ?? '', orgTypeLabel: orgTypeLabel(org?.type ?? ''), invitedBy: state.users[inv.invitedByUserId]?.name ?? '', email: inv.email }
}

/** The sample accounts for the sign-in page, which has no viewer. */
export function sampleAccountCards(state: AppData) {
  return SAMPLE_ACCOUNTS.map((a) => ({ userId: a.userId, name: a.name, email: a.email, orgName: state.world.orgs[a.orgId]?.name ?? '', roleLabel: ROLE_LABELS[a.role], line: a.line, colour: a.avatarColour, initials: initials(a.name) }))
}

// ---------- Help ----------

export type MethodologyGroup = { group: string; rows: Parameter[] }

/** Every factor and price with its source and status, grouped as the Help page shows them. */
export function methodologyView(): { groups: MethodologyGroup[]; indicative: string[] } {
  const groups: MethodologyGroup[] = []
  for (const r of [...parameterRows(), ...V1_PARAMETER_ROWS]) {
    if (r.id === 'negotiation') continue
    const g = groups.find((x) => x.group === r.group)
    if (g) g.rows.push(r)
    else groups.push({ group: r.group, rows: [r] })
  }
  return { groups, indicative: [LABELS.L11, LABELS.L37, LABELS.L38, LABELS.L10, LABELS.L41, LABELS.L20] }
}
