// Round 2 follow-up (audit of 16 October 2026, package client_consultant). The consultancy is asked only once the
// client accepts and sees the project only once it accepts too (note C2). A client nobody uses yet gets a contact
// invite, and the contact joins that organisation on sign-up and accepts (note C3). The consultant's Overview and
// Projects list are its own (note 42), and the developer's tracking shows every scheme for a project with no
// consultant (note 36). Nothing scrolls sideways at 390, 1024 or 1440 px.
import { expect, test, type Page } from '@playwright/test'

const M = 'prj_hp23zk'
const K = 'prj_w7kq2m'
const EMAIL = {
  priya: 'priya.nair@studiooriel.example',
  isla: 'isla.brennan@lanternquay.example',
  marcus: 'marcus.lindqvist@halewick.example',
} as const
type Who = keyof typeof EMAIL

function watchErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`)
  })
  return errors
}

async function signIn(page: Page, who: Who) {
  await page.goto('/signin')
  await page.getByTestId(`sample-${EMAIL[who]}`).click()
  await page.waitForURL('**/app/home')
}

async function switchTo(page: Page, who: Who) {
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('account-menu').click()
  await page.getByTestId('switch-account').hover()
  await page.getByTestId(`switch-${EMAIL[who]}`).click()
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

test('the consultancy is asked once the client accepts, and sees the project once it accepts too', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Tamsin Wharf')
  await page.getByTestId('project-start').fill('2027-09-20')
  await page.getByTestId('project-consultant').selectOption({ label: 'Halewick Sustainability' })
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const id = page.url().split('/').pop()!.split('?')[0]

  // Before Lantern Quay answers, Halewick has nothing: no folder, no request, and the address is closed.
  await switchTo(page, 'marcus')
  await expect(page.getByTestId('sidebar')).not.toContainText('Tamsin Wharf')
  await expect(page.getByTestId('nav-project-requests')).toHaveCount(0)
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('no-access')).toContainText('You do not have access to this')

  // Isla sees who the architect proposes as consultant, and accepts.
  await switchTo(page, 'isla')
  await page.goto('/app/projects/requests')
  await expect(page.getByTestId(`link-request-${id}`)).toContainText('Halewick Sustainability, asked once you accept')
  await page.getByTestId(`accept-link-${id}`).click()
  await expect(page.getByTestId('link-requests-empty')).toBeVisible()

  // Now Marcus has a request; the project's address points him to it until he accepts.
  await switchTo(page, 'marcus')
  await expect(page.getByTestId('nav-project-requests')).toContainText('1')
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('no-access')).toContainText('Accept Tamsin Wharf to open it')
  await page.getByTestId('no-access-request').click()
  await page.waitForURL('**/app/projects/requests')
  await expect(page.getByTestId(`link-request-${id}`)).toContainText('Studio Oriel wants to add you as sustainability consultant')
  await expect(page.getByTestId(`link-request-${id}`)).toContainText('Lantern Quay Developments')
  await page.getByTestId(`accept-link-${id}`).click()
  await expect(page.getByTestId('sidebar')).toContainText('Tamsin Wharf')
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('consultant-overview')).toBeVisible()

  // Priya is told, and the team shows Halewick.
  await switchTo(page, 'priya')
  await page.goto(`/app/projects/${id}/team`)
  await expect(page.getByTestId(`team-org_halewick`)).not.toContainText('Waiting to accept')
  expect(errors).toEqual([])
})

test('a contact at a new client joins it on sign-up and accepts the project', async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'priya')
  await page.goto('/app/projects/new')
  await page.getByTestId('project-name').fill('Pellow Row')
  await page.getByTestId('project-client').selectOption({ label: 'A new client' })
  await page.getByTestId('project-client-name').fill('Harrowgate Homes')
  await page.getByTestId('project-client-email').fill('ada.quist@harrowgate.example')
  await page.getByTestId('project-start').fill('2027-09-06')
  await page.getByTestId('create-project').click()
  await page.waitForURL('**/app/projects/prj_*')
  const id = page.url().split('/').pop()!.split('?')[0]
  await expect(page.getByTestId('client-invite-sent')).toContainText('Invite sent to ada.quist@harrowgate.example')
  await expect(page.getByTestId('client-invite-resend')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await horizontalOverflow(page)).toBe(0)

  // Ada signs up with that email and joins Harrowgate Homes; the request waits on her home.
  await signOut(page)
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill('Ada Quist')
  await page.getByTestId('signup-email').fill('ada.quist@harrowgate.example')
  await page.locator('input[type=password]').fill('sandbox-pass')
  await page.getByTestId('signup-continue').click()
  // Round 2 follow-up review: the open sign-up page no longer names the organisation or the project.
  await expect(page.getByTestId('signup-join')).toContainText('Your account joins the client organisation that invited this email')
  await expect(page.getByTestId('signup-page')).toContainText('Join the organisation that invited you')
  await expect(page.getByTestId('signup-page')).not.toContainText('Harrowgate Homes')
  await expect(page.getByTestId('signup-page')).not.toContainText('Pellow Row')
  await page.getByTestId('signup-submit').click()
  await page.waitForURL('**/app/home**')
  await expect(page.getByTestId(`link-request-${id}`)).toContainText('Studio Oriel wants to add you as client')
  await page.getByTestId(`accept-link-${id}`).click()
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('project-overview')).toBeVisible()

  // Priya can now send for approval: the banner is gone.
  await signOut(page)
  await signIn(page, 'priya')
  await page.goto(`/app/projects/${id}`)
  await expect(page.getByTestId('project-overview')).toBeVisible()
  await expect(page.getByTestId('client-link-banner')).toHaveCount(0)
  expect(errors).toEqual([])
})

test("the consultant's Overview and Projects list are his own, and the tracking shows every scheme", async ({ page }) => {
  const errors = watchErrors(page)
  await signIn(page, 'marcus')
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/app/projects/${M}`)
    await expect(page.getByTestId('consultant-overview')).toBeVisible()
    await expect(page.getByTestId('consultant-overview')).toContainText('With the client for review')
    await expect(page.getByTestId('overview-shortlist')).toHaveCount(0)
    expect(await horizontalOverflow(page), `overview at ${width}`).toBe(0)
    await page.goto('/app/projects')
    await expect(page.getByTestId(`consultant-summary-${M}`)).toContainText('Off target')
    expect(await horizontalOverflow(page), `projects at ${width}`).toBe(0)
  }
  await page.goto('/app/home')
  await expect(page.getByTestId(`consultant-project-${M}`)).toContainText('Reused and recycled content by value')

  await switchTo(page, 'isla')
  for (const width of [390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app/home')
    const k = page.getByTestId(`tracking-${K}`)
    await expect(k).toContainText('No consultant appointed yet')
    await expect(k.getByText('Not targeted', { exact: true })).toHaveCount(3)
    await expect(page.getByTestId(`tracking-${M}`)).toContainText('Near target')
    expect(await horizontalOverflow(page), `client home at ${width}`).toBe(0)
  }
  expect(errors).toEqual([])
})
