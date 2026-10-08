// Sample accounts, organisation types and password hashing for the sandbox (BRIEF section 2).
// Passwords are stored as SHA-256 of a per-person salt and the password, through WebCrypto.
import type { AvatarColour, NotificationKind, PlatformRole, User } from '../store/types'
import { NOTIFICATION_KINDS } from '../store/types'
import { ORG_IDS, PERSONA_IDS } from '../domain/seed/world'

export const SAMPLE_PASSWORD = 'sandbox'

/** The organisation types offered at sign-up, each mapped to the world's type and the workspace it opens. */
export const ORG_TYPES: { value: string; label: string; role: PlatformRole }[] = [
  { value: 'Architect', label: 'Architecture practice', role: 'architect' },
  { value: 'Developer', label: 'Developer or client', role: 'client' },
  { value: 'Asset owner', label: 'Asset owner', role: 'owner' },
  { value: 'Deconstruction contractor', label: 'Surveying firm', role: 'surveyor' },
  { value: 'Sustainability consultant', label: 'Sustainability consultancy', role: 'consultant' },
]

export const ROLE_LABELS: Record<PlatformRole, string> = {
  architect: 'Architect',
  client: 'Client (developer)',
  owner: 'Asset owner',
  surveyor: 'Site surveyor',
  consultant: 'Sustainability consultant',
}

/** The workspace for an organisation type, or null for a type with no workspace (the platform operator). */
export function roleForOrgType(type: string): PlatformRole | null {
  return ORG_TYPES.find((t) => t.value === type)?.role ?? null
}

/** The world's organisation type for a sign-up choice given as the type, the role or the label; null if none. */
export function resolveOrgType(input: string): string | null {
  const key = input.trim().toLowerCase()
  const t = ORG_TYPES.find((x) => x.value.toLowerCase() === key || x.role === key || x.label.toLowerCase() === key)
  return t ? t.value : null
}

export function orgTypeLabel(type: string): string {
  return ORG_TYPES.find((t) => t.value === type)?.label ?? type
}

export function defaultNotificationPrefs(): Record<NotificationKind, boolean> {
  return Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k, true])) as Record<NotificationKind, boolean>
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-256 hex of `${salt}:${password}`. Works in the browser and in Node through globalThis.crypto. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('Secure hashing is not available in this browser.')
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return hex(await subtle.digest('SHA-256', data))
}

/** A fresh salt for a new person. */
export function newSalt(): string {
  const bytes = new Uint8Array(12)
  globalThis.crypto.getRandomValues(bytes)
  return 'slt_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export type SampleAccount = {
  userId: string
  personaId: string
  orgId: string
  name: string
  email: string
  title: string
  role: PlatformRole
  /** One line for the sign-in card. */
  line: string
  avatarColour: AvatarColour
  salt: string
  passwordHash: string
}

/** The five sample accounts, in the order the sign-in page shows them. Password `sandbox` for all. */
export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  {
    userId: 'usr_k4p9n2',
    personaId: PERSONA_IDS.priya,
    orgId: ORG_IDS.oriel,
    name: 'Priya Nair',
    email: 'priya.nair@studiooriel.example',
    title: 'Project architect',
    role: 'architect',
    line: 'Finds, shortlists and specifies reclaimed material for her projects.',
    avatarColour: 'forest',
    salt: 'slt_k4p9n2',
    passwordHash: '790342bde8066eb2c91840f2a7bcaa0efd9e45bc35ab7f4a3bfab5e0d5ed2267',
  },
  {
    userId: 'usr_b7q3l8',
    personaId: PERSONA_IDS.isla,
    orgId: ORG_IDS.lantern,
    name: 'Isla Brennan',
    email: 'isla.brennan@lanternquay.example',
    title: 'Development manager',
    role: 'client',
    line: 'Approves what the architect proposes and reserves it.',
    avatarColour: 'blue',
    salt: 'slt_b7q3l8',
    passwordHash: '5f2ba6d9df77a80c8a19349696ac41444764e15fbc4bf8485539d5a5d49c5716',
  },
  {
    userId: 'usr_h2t6w5',
    personaId: PERSONA_IDS.tom,
    orgId: ORG_IDS.ostlea,
    name: 'Tom Ashby',
    email: 'tom.ashby@ostlea.example',
    title: 'Asset manager',
    role: 'owner',
    line: 'Decides what his buildings hold for reuse, who sees it and when.',
    avatarColour: 'amber',
    salt: 'slt_h2t6w5',
    passwordHash: 'e6ccdd6b0b86b75bb67681c5fa781daddd31dfafa8b0e71b24f6d2c566e849f2',
  },
  {
    userId: 'usr_d9k4r1',
    personaId: PERSONA_IDS.dana,
    orgId: ORG_IDS.tarnbrook,
    name: 'Dana Kowalski',
    email: 'dana.kowalski@tarnbrook.example',
    title: 'Site surveyor',
    role: 'surveyor',
    line: 'Captures what each building holds, on site, from her phone.',
    avatarColour: 'violet',
    salt: 'slt_d9k4r1',
    passwordHash: 'f5d1b2cbd61e663f12189cc371baff5dfd0772240607cc5f8b8f23f8d9e85960',
  },
  {
    userId: 'usr_m3x8c6',
    personaId: PERSONA_IDS.marcus,
    orgId: ORG_IDS.halewick,
    name: 'Marcus Lindqvist',
    email: 'marcus.lindqvist@halewick.example',
    title: 'Sustainability consultant',
    role: 'consultant',
    line: 'Proves the carbon and circular economy case for each project.',
    avatarColour: 'teal',
    salt: 'slt_m3x8c6',
    passwordHash: 'c3ecb542880c265bff2e153f685366bdf4f58e0627f50f1c1e27cae5aac9dcc7',
  },
]

/** The sample people as platform users. */
export function sampleUsers(createdAt: string): Record<string, User> {
  return Object.fromEntries(
    SAMPLE_ACCOUNTS.map((a) => [
      a.userId,
      {
        id: a.userId,
        email: a.email,
        name: a.name,
        title: a.title,
        personaId: a.personaId,
        orgId: a.orgId,
        salt: a.salt,
        passwordHash: a.passwordHash,
        avatarColour: a.avatarColour,
        createdAt,
        sample: true,
        notificationPrefs: defaultNotificationPrefs(),
      } satisfies User,
    ]),
  )
}

export function sampleAccountByUserId(userId: string): SampleAccount | null {
  return SAMPLE_ACCOUNTS.find((a) => a.userId === userId) ?? null
}

/** Emails compare trimmed and case-blind. */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** A plausible email address: something, an at sign, a domain with a dot. The sign-up forms use the same check. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim())
}
