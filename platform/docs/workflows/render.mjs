import { chromium } from '/home/user/tallyard/platform/node_modules/playwright/index.mjs'
const [,, htmlPath, pdfPath] = process.argv
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto('file://' + htmlPath)
await page.waitForFunction(() => window.__mermaidDone === true, null, { timeout: 120000 })
const bad = await page.evaluate(() => window.__mermaidErrors || [])
await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;color:#78716c;width:100%;text-align:center;font-family:sans-serif">Tallyard platform workflows · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' })
console.log(JSON.stringify({ errors, bad }))
await browser.close()
