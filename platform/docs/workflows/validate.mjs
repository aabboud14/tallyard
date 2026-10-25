// Usage: node validate.mjs <area.json>  -> prints {id: error} for every diagram that fails to parse or render
import { chromium } from '/home/user/tallyard/platform/node_modules/playwright/index.mjs'
import { readFileSync } from 'node:fs'
const CLASSDEFS = readFileSync(new URL('./classdefs.txt', import.meta.url), 'utf8')
const withDefs = (src) => src.trimStart().startsWith('flowchart') ? src + '\n' + CLASSDEFS : src
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const diagrams = []
for (const w of data.workflows || []) {
  if (w.mermaid) diagrams.push({ id: w.id, src: withDefs(w.mermaid) })
  if (w.states_mermaid) diagrams.push({ id: w.id + ':states', src: w.states_mermaid })
}
if (data.overview_mermaid) diagrams.push({ id: 'overview', src: withDefs(data.overview_mermaid) })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage()
await page.goto('file://' + process.cwd() + '/blank.html')
await page.addScriptTag({ path: new URL('./node_modules/mermaid/dist/mermaid.min.js', import.meta.url).pathname })
const res = await page.evaluate(async (ds) => {
  mermaid.initialize({ startOnLoad: false, theme: 'base' })
  const out = {}
  let i = 0
  for (const d of ds) {
    try { await mermaid.parse(d.src); await mermaid.render('v' + (i++), d.src) } catch (e) { out[d.id] = String(e && e.message || e).slice(0, 400) }
  }
  return out
}, diagrams)
console.log(JSON.stringify({ checked: diagrams.length, errors: res }, null, 1))
await browser.close()
