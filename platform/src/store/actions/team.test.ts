import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, NOW } from '../../test/fixtures'
import { createInvite, readAllNotifications, readNotification, revokeInvite, setNotificationPref, TEAM_ERRORS, updateOrganisation, updateProfile } from './team'
import { acceptInviteState, AUTH_ERRORS, findUserByEmail, resetPasswordState, signUpState, validateSignUp } from './auth'
import { roleOfUser } from '../access'
import { ORG_IDS, PERSONA_IDS } from '../../domain/seed/world'
import { ERRORS } from '../access'

describe('invites', () => {
  it('a member invites by email; the invite opens once', () => {
    const s0 = fresh()
    const r = must(createInvite(s0, actor(U.priya), ' Alex.Moore@studiooriel.example '))
    const inv = r.state.invites[r.value]
    expect(inv).toMatchObject({ orgId: ORG_IDS.oriel, email: 'alex.moore@studiooriel.example', status: 'pending', invitedByUserId: U.priya })
    refused(r.state, createInvite(r.state, actor(U.priya), 'alex.moore@studiooriel.example'), TEAM_ERRORS.invited)
    refused(s0, createInvite(s0, actor(U.priya), 'isla.brennan@lanternquay.example'), TEAM_ERRORS.taken)
    refused(s0, createInvite(s0, actor(U.priya), 'not an email'), TEAM_ERRORS.email)

    const joined = must(acceptInviteState(r.state, r.value, { name: 'Alex Moore', salt: 'slt_x', passwordHash: 'h', now: NOW }))
    const alex = joined.state.users[joined.value]
    expect(alex.orgId).toBe(ORG_IDS.oriel)
    expect(roleOfUser(joined.state, alex.id)).toBe('architect')
    expect(joined.state.world.personas[alex.personaId].orgId).toBe(ORG_IDS.oriel)
    expect(joined.state.invites[r.value].status).toBe('accepted')
    expect(joined.state.notifications[0].title).toBe('Alex Moore joined Studio Oriel')
    expect(acceptInviteState(joined.state, r.value, { name: 'Alex Moore', salt: 'slt_x', passwordHash: 'h', now: NOW }).error).toBe(AUTH_ERRORS.usedInvite)
  })

  it('a revoked invite cannot be used', () => {
    const s0 = fresh()
    const r = must(createInvite(s0, actor(U.tom), 'sam@ostlea.example'))
    const back = must(revokeInvite(r.state, actor(U.tom), r.value))
    expect(acceptInviteState(back.state, r.value, { name: 'Sam', salt: 's', passwordHash: 'h', now: NOW }).error).toBe(AUTH_ERRORS.usedInvite)
    refused(r.state, revokeInvite(r.state, actor(U.priya), r.value), TEAM_ERRORS.noInvite)
    expect(acceptInviteState(s0, 'inv_nope', { name: 'X', salt: 's', passwordHash: 'h', now: NOW }).error).toBe(AUTH_ERRORS.noInvite)
  })
})

describe('sign-up and password reset as state', () => {
  it('a new practice gets an organisation, a persona and an empty workspace', () => {
    const s0 = fresh()
    const r = must(signUpState(s0, { name: 'Jo Park', email: 'jo@parkstudio.example', orgName: 'Park Studio', orgType: 'Architect', salt: 'slt_j', passwordHash: 'h', now: NOW }))
    const u = r.state.users[r.value]
    expect(r.state.world.orgs[u.orgId]).toMatchObject({ name: 'Park Studio', type: 'Architect' })
    expect(roleOfUser(r.state, u.id)).toBe('architect')
    expect(u.sample).toBe(false)
    expect(Object.values(r.state.world.projects).some((p) => p.architectOrgId === u.orgId)).toBe(false)
  })

  it('accepts the organisation type as the role or the label too', () => {
    const s0 = fresh()
    for (const [orgType, role] of [['owner', 'owner'], ['Surveying firm', 'surveyor'], ['client', 'client'], ['Sustainability consultant', 'consultant']] as const) {
      const r = must(signUpState(s0, { name: 'A Person', email: 'a@b.example', orgName: 'Org', orgType, salt: 's', passwordHash: 'h', now: NOW }))
      expect(roleOfUser(r.state, r.value)).toBe(role)
    }
  })

  it('validates every field and refuses a taken email', () => {
    const s0 = fresh()
    expect(validateSignUp(s0, { name: '', email: 'x', password: 'short', orgName: '', orgType: 'Wizard' }).map((x) => x[0])).toEqual(['name', 'email', 'password', 'orgName', 'orgType'])
    expect(validateSignUp(s0, { name: 'A', email: 'Priya.Nair@studiooriel.example', password: 'longenough', orgName: 'B', orgType: 'Architect' })).toEqual([['email', AUTH_ERRORS.taken]])
  })

  it('resets a password by email', () => {
    const s0 = fresh()
    const r = must(resetPasswordState(s0, 'tom.ashby@ostlea.example', 'slt_new', 'newhash'))
    expect(findUserByEmail(r.state, 'TOM.ASHBY@ostlea.example')!.passwordHash).toBe('newhash')
    refused(s0, resetPasswordState(s0, 'nobody@example.example', 's', 'h'), AUTH_ERRORS.noAccount)
  })
})

describe('profile, organisation, notifications', () => {
  it('a new name follows the person into the world', () => {
    const s0 = fresh()
    const r = must(updateProfile(s0, actor(U.priya), { name: 'Priya Nair-Hale', title: 'Associate', avatarColour: 'blue' }))
    expect(r.state.users[U.priya].name).toBe('Priya Nair-Hale')
    expect(r.state.world.personas[PERSONA_IDS.priya]).toMatchObject({ name: 'Priya Nair-Hale', role: 'Associate' })
    refused(s0, updateProfile(s0, actor(U.priya), { email: 'tom.ashby@ostlea.example' }), TEAM_ERRORS.taken)
    refused(s0, updateProfile(s0, actor(U.priya), { name: ' ' }), TEAM_ERRORS.name)
  })

  it('edits the organisation name and address', () => {
    const s0 = fresh()
    const r = must(updateOrganisation(s0, actor(U.isla), { name: 'Lantern Quay Developments', address: '2 Wharf Lane, London E16' }))
    expect(r.state.orgProfiles[ORG_IDS.lantern].address).toBe('2 Wharf Lane, London E16')
    refused(s0, updateOrganisation(s0, actor(U.isla), { name: '' }), TEAM_ERRORS.orgName)
  })

  it('read state is per person, and preferences hide kinds', () => {
    const s0 = fresh()
    const n = s0.notifications.find((x) => x.orgId === ORG_IDS.lantern && x.readBy.length === 0)!
    const r = must(readNotification(s0, actor(U.isla), n.id))
    expect(r.state.notifications.find((x) => x.id === n.id)!.readBy).toEqual([U.isla])
    refused(s0, readNotification(s0, actor(U.tom), n.id), ERRORS.noAccess)
    const all = must(readAllNotifications(s0, actor(U.isla)))
    expect(all.state.notifications.filter((x) => x.orgId === ORG_IDS.lantern).every((x) => x.readBy.includes(U.isla))).toBe(true)
    const off = must(setNotificationPref(s0, actor(U.isla), 'sent_to_client', false))
    expect(off.state.users[U.isla].notificationPrefs.sent_to_client).toBe(false)
  })
})
