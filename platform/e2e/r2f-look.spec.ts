// The look follow-up to the recording audit of 16 October 2026 (feedback/r2f-look.md). A new project leads Priya's
// home with its setup and next step; once Isla accepts, her card says it is being set up and her overview says who
// acts next. New accounts open on a first run with next steps; the landing page names the frameworks and shows the
// real sample figures; the surveyor's buildings are drawn on a phone. Every screen fits 390, 1024 and 1440 px.
import { expect, test, type Page } from '@playwright/test'

const EMAIL = { priya: 'priya.nair@studiooriel.example', isla: 'isla.brennan@lanternquay.example', dana: 'dana.kowalski@tarnbrook.example' } as const
const WIDTHS = [390, 1024, 1440] as const

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function signIn(page: Page, who: keyof typeof EMAIL) {
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

async function signOut(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.keyboard.press('Escape')
  await page.getByTestId('account-menu').click()
  await page.getByTestId('sign-out').click()
  await page.waitForURL('**/signin**')
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement
    const main = document.querySelector('main')
    return Math.max(doc.scrollWidth - doc.clientWidth, main ? main.scrollWidth - main.clientWidth : 0)
  })
}

async function fits(page: Page, path: string, testId: string) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 })
    await page.goto(path)
    await expect(page.getByTestId(testId).first()).toBeVisible()
    expect(await horizontalOverflow(page), `${path} at ${w}`).toBe(0)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
}

async function signUp(page: Page, name: string, email: string, org: string, typeIndex: number) {
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill(name)
  await page.getByTestId('signup-email').fill(email)
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signup-continue').click()
  await page.getByTestId('signup-org').fill(org)
  await page.locator('[role=radio]').nth(typeIndex).click()
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
}

test('a new project leads the home with its setup, and its client is told what comes next', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Corbel Yard')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const id = page.url().split('/').pop()!.split('?')[0]

  await page.goto('/app/home')
  const first = page.locator('[data-testid^="home-project-"]').first()
  await expect(first).toHaveAttribute('data-testid', `home-project-${id}`)
  await expect(page.getByTestId(`home-setup-pill-${id}`)).toContainText('Setting up')
  await expect(page.getByTestId(`home-link-pill-${id}`)).toHaveText('Waiting for client')
  await expect(page.getByTestId(`home-setup-next-${id}`)).toBeVisible()
  await expect(page.getByTestId('metric-projects')).toContainText('3')
  await expect(page.getByTestId('metric-projects-setup')).toHaveText('1 setting up')
  // Nothing shortlisted yet: named under Carbon by project, with no 0.0 of 0.0 bar.
  await expect(page.getByTestId('carbon-not-yet')).toHaveText('Nothing shortlisted yet on Corbel Yard.')
  await expect(page.getByTestId('carbon-by-project')).not.toContainText('0.0 of 0.0')
  await fits(page, '/app/home', `home-setup-pill-${id}`)
  await page.getByTestId(`home-setup-next-${id}`).click()
  await page.waitForURL(`**/app/projects/${id}`)

  await signOut(page)
  await signIn(page, 'isla')
  await page.goto('/app/projects/requests')
  await page.getByTestId(`accept-link-${id}`).click()
  await expect(page.getByTestId('link-requests-empty')).toBeVisible()
  await page.goto('/app/home')
  await expect(page.getByTestId(`client-project-status-${id}`)).toHaveText('Being set up')
  await expect(page.getByTestId(`client-project-place-${id}`)).not.toContainText(',')
  await fits(page, '/app/home', `client-project-${id}`)
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('next-steps-client-waiting')).toContainText('Studio Oriel sends materials to you for approval')
  await expect(page.getByTestId('next-steps')).not.toContainText('You are up to date')
  await fits(page, `/app/projects/${id}`, 'next-steps-client-waiting')
  expect(errors).toEqual([])
})

test('new accounts open on a first run with next steps that fits every width', async ({ page }) => {
  const errors = watchErrors(page)
  await signUp(page, 'Ada Quell', 'ada.quell@quellstudio.example', 'Quell Studio', 0)
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('architect-first-marketplace')).toBeVisible()
  await fits(page, '/app/home', 'architect-first-marketplace')
  await page.getByTestId('first-category-structure').click()
  await page.waitForURL('**/app/marketplace?type=structure')
  await signOut(page)

  await signUp(page, 'Rowan Hale', 'rowan.hale@hale.example', 'Hale Developments', 1)
  await expect(page.getByTestId('client-projects-empty')).toBeVisible()
  await expect(page.getByText('No projects yet')).toHaveCount(1)
  await expect(page.getByTestId('client-programme')).toHaveCount(0)
  await expect(page.getByTestId('sustainability-tracking')).toHaveCount(0)
  await fits(page, '/app/home', 'client-projects-empty')
  expect(errors).toEqual([])
})

test('the landing page names the frameworks and shows the real sample figures, at every width', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('landing-frameworks')).toContainText('UK Net Zero Carbon Buildings Standard')
  await expect(page.getByTestId('landing-frameworks')).toContainText('Not affiliated with or endorsed by these bodies.')
  await expect(page.getByTestId('product-shot-shortlisted')).toContainText('7')
  await expect(page.getByTestId('product-shot-carbon')).toContainText('100.8')
  await fits(page, '/', 'landing-frameworks')
})

test("the surveyor's buildings are drawn on a phone", async ({ page }) => {
  await signIn(page, 'dana')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/home')
  const thumbs = page.locator('[data-testid^="home-building-thumb-"]')
  await expect(thumbs.first()).toBeVisible()
  expect(await thumbs.count()).toBeGreaterThanOrEqual(3)
  expect(await horizontalOverflow(page)).toBe(0)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(thumbs.first()).toBeHidden()
})

test('each steel tile on the Marketplace shows its own end view, type and depth, at every width', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/marketplace')
  const cards = page.locator('[data-part="section-card"]')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThanOrEqual(11)
  const types = await page.locator('[data-part="section-card"] [data-part="designation-type"]').allTextContents()
  expect(new Set(types).size).toBeGreaterThanOrEqual(5)
  expect(types.some((t) => t.startsWith('UB'))).toBe(true)
  expect(types.some((t) => t.startsWith('UC'))).toBe(true)
  await expect(page.locator('[data-part="section-card"]', { hasText: 'Not to scale' })).toHaveCount(0)
  await fits(page, '/app/marketplace', 'discover-grid')
  expect(errors).toEqual([])
})

test('a new surveying firm, owner and consultancy open on their first steps, not zero tiles', async ({ page }) => {
  const errors = watchErrors(page)
  const cases = [
    { name: 'Lee Shaw', email: 'lee.shaw@shawsurveys.example', org: 'Shaw Surveys', index: 3, card: 'surveyor-first-run' },
    { name: 'Ash Reed', email: 'ash.reed@reedholdings.example', org: 'Reed Holdings', index: 2, card: 'owner-first-run' },
    { name: 'Ruth Calder', email: 'ruth.calder@parkstudio.example', org: 'Park Studio', index: 4, card: 'consultant-first-run' },
  ]
  for (const c of cases) {
    await signUp(page, c.name, c.email, c.org, c.index)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId(c.card)).toBeVisible()
    await expect(page.getByTestId('home-stats')).toHaveCount(0)
    await fits(page, '/app/home', c.card)
    await signOut(page)
  }
  expect(errors).toEqual([])
})
