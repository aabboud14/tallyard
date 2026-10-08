// @vitest-environment jsdom
// The sign-in, sign-up, password reset and invite screens: labelled fields, validation before the callback,
// the caller's error shown as an alert, and no forbidden characters (P6).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { accessibleName, allByRole, allText, byRole, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, submit, typeInto } from '../../ui/testing'
import { AuthLayout, ForgotPasswordForm, InviteForm, SampleAccounts, SignInForm, SignUpForm, ORG_TYPES, type SampleAccount } from './index'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

const ACCOUNTS: SampleAccount[] = [
  { name: 'Priya Nair', orgName: 'Studio Oriel', roleLabel: 'Architect', email: 'priya.nair@studiooriel.example' },
  { name: 'Isla Brennan', orgName: 'Lantern Quay Developments', roleLabel: 'Client', email: 'isla.brennan@lanternquay.example' },
  { name: 'Tom Ashby', orgName: 'Ostlea Estates', roleLabel: 'Asset owner', email: 'tom.ashby@ostlea.example' },
  { name: 'Dana Kowalski', orgName: 'Tarnbrook Deconstruction', roleLabel: 'Site surveyor', email: 'dana.kowalski@tarnbrook.example' },
  { name: 'Marcus Lindqvist', orgName: 'Halewick Sustainability', roleLabel: 'Sustainability consultant', email: 'marcus.lindqvist@halewick.example' },
]

function field(label: string): HTMLInputElement {
  const el = Array.from(document.querySelectorAll<HTMLInputElement>('input')).find((i) => accessibleName(i) === label)
  if (!el) throw new Error('No field labelled ' + label)
  return el
}

describe('AuthLayout', () => {
  it('frames the form with the logo linking home and the sandbox line', () => {
    render(
      <AuthLayout>
        <p>Form</p>
      </AuthLayout>,
    )
    expect(byRole('link', 'Tallyard home').getAttribute('href')).toBe('/')
    expect(document.body.textContent).toContain('Sample data that stays in this browser.')
    for (const img of allByRole('img')) expect(accessibleName(img)).not.toBe('')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('can leave the footer out', () => {
    render(
      <AuthLayout footer={false}>
        <p>Form</p>
      </AuthLayout>,
    )
    expect(document.querySelector('footer')).toBeNull()
  })
})

describe('SignInForm', () => {
  it('checks the fields before calling back, then sends the values', () => {
    const onSubmit = vi.fn()
    render(<SignInForm onSubmit={onSubmit} />)
    submit(byTestId('signin-form'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Enter your email address.')
    expect(document.body.textContent).toContain('Enter your password.')
    expect(field('Email').getAttribute('aria-invalid')).toBe('true')

    typeInto(field('Email'), 'priya.nair@studiooriel.example ')
    typeInto(field('Password'), 'sandbox')
    submit(byTestId('signin-form'))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'priya.nair@studiooriel.example', password: 'sandbox', remember: true })
  })

  it('shows the error from the caller as an alert, and links to reset and sign up', () => {
    render(<SignInForm onSubmit={() => {}} error="That email and password do not match an account in this sandbox." />)
    expect(byRole('alert').textContent).toContain('do not match')
    expect(byRole('link', 'Forgot password?').getAttribute('href')).toBe('/forgot-password')
    expect(byRole('link', 'Create an account').getAttribute('href')).toBe('/signup')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('shows and hides the password', () => {
    render(<SignInForm onSubmit={() => {}} />)
    expect(field('Password').type).toBe('password')
    click(byRole('button', 'Show password'))
    expect(field('Password').type).toBe('text')
    expect(byRole('button', 'Hide password').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('SampleAccounts', () => {
  it('signs in to each sample account with one click and says the data stays in this browser', () => {
    const onSignIn = vi.fn()
    render(<SampleAccounts accounts={ACCOUNTS} onSignIn={onSignIn} />)
    const buttons = allByRole('button')
    expect(buttons.map(accessibleName)).toEqual([
      'Sign in as Priya Nair, Architect at Studio Oriel',
      'Sign in as Isla Brennan, Client at Lantern Quay Developments',
      'Sign in as Tom Ashby, Asset owner at Ostlea Estates',
      'Sign in as Dana Kowalski, Site surveyor at Tarnbrook Deconstruction',
      'Sign in as Marcus Lindqvist, Sustainability consultant at Halewick Sustainability',
    ])
    click(buttons[2])
    expect(onSignIn).toHaveBeenCalledWith('tom.ashby@ostlea.example')
    expect(document.body.textContent).toContain('Sandbox data stays in this browser.')
    for (const a of ACCOUNTS) expect(a.email.endsWith('.example')).toBe(true)
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('holds the other cards while one signs in', () => {
    render(<SampleAccounts accounts={ACCOUNTS} onSignIn={() => {}} pendingEmail="priya.nair@studiooriel.example" />)
    for (const b of allByRole('button')) expect((b as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('SignUpForm', () => {
  it('takes you, then your organisation, and sends both', () => {
    const onSubmit = vi.fn()
    render(<SignUpForm onSubmit={onSubmit} />)
    expect(document.body.textContent).toContain('Step 1 of 2')
    submit(byTestId('signup-step-1'))
    expect(document.body.textContent).toContain('Enter your name.')
    expect(document.body.textContent).toContain('Use at least 8 characters.')

    typeInto(field('Full name'), 'Test User')
    typeInto(field('Work email'), 'test.user@practice.example')
    typeInto(field('Password'), 'long enough')
    submit(byTestId('signup-step-1'))
    expect(document.body.textContent).toContain('Step 2 of 2')

    const types = allByRole('radio')
    expect(types.map((t) => t.textContent?.replace(/\s+/g, ' '))).toEqual(ORG_TYPES.map((o) => `${o.label}${o.description}`))
    submit(byTestId('signup-step-2'))
    expect(document.body.textContent).toContain('Enter the name of your organisation.')
    expect(onSubmit).not.toHaveBeenCalled()

    typeInto(field('Organisation name'), 'Test Practice')
    click(byRole('radio', 'Asset owner'))
    submit(byTestId('signup-step-2'))
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Test User', email: 'test.user@practice.example', password: 'long enough', orgName: 'Test Practice', orgType: 'owner' })
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('goes back to the first step with the values kept', () => {
    render(<SignUpForm onSubmit={() => {}} />)
    typeInto(field('Full name'), 'Test User')
    typeInto(field('Work email'), 'test.user@practice.example')
    typeInto(field('Password'), 'long enough')
    submit(byTestId('signup-step-1'))
    click(byRole('button', 'Back'))
    expect(field('Full name').value).toBe('Test User')
  })
})

describe('ForgotPasswordForm', () => {
  it('says the sandbox resets on the page, checks both passwords match, and confirms', () => {
    const onSubmit = vi.fn()
    render(<ForgotPasswordForm onSubmit={onSubmit} />)
    expect(document.body.textContent).toContain('In the sandbox you reset your password on this page.')
    typeInto(field('Email'), 'priya.nair@studiooriel.example')
    typeInto(field('New password'), 'new sandbox')
    typeInto(field('Confirm new password'), 'new sandbox 2')
    submit(byTestId('reset-form'))
    expect(document.body.textContent).toContain('The two passwords do not match.')
    expect(onSubmit).not.toHaveBeenCalled()
    typeInto(field('Confirm new password'), 'new sandbox')
    submit(byTestId('reset-form'))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'priya.nair@studiooriel.example', password: 'new sandbox' })
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('shows the done state with a way back to sign in', () => {
    render(<ForgotPasswordForm onSubmit={() => {}} done />)
    expect(byRole('heading', 'Password updated')).toBeTruthy()
    expect(byRole('link', 'Sign in').getAttribute('href')).toBe('/signin')
  })
})

describe('InviteForm', () => {
  it('joins the inviting organisation with the invited email', () => {
    const onSubmit = vi.fn()
    render(<InviteForm invite={{ orgName: 'Studio Oriel', orgTypeLabel: 'Architecture practice', invitedBy: 'Priya Nair', email: 'test.user@studiooriel.example' }} onSubmit={onSubmit} />)
    expect(byRole('heading', 'Join Studio Oriel')).toBeTruthy()
    expect(document.body.textContent).toContain('Priya Nair invited you to join Studio Oriel on Tallyard.')
    expect(document.body.textContent).toContain('Architecture practice')
    expect(field('Email').readOnly).toBe(true)
    typeInto(field('Full name'), 'Test User')
    typeInto(field('Password'), 'long enough')
    submit(document.querySelector('form')!)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Test User', password: 'long enough' })
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('explains a link that is not valid', () => {
    render(<InviteForm invite={null} onSubmit={() => {}} />)
    expect(byRole('heading', 'This invite link is not valid')).toBeTruthy()
    expect(byRole('link', 'Go to sign in').getAttribute('href')).toBe('/signin')
  })
})
