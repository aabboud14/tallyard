// Scan (01-BRIEF.md section 7 item 8): dashes, filler tokens and disallowed names
// in src/, e2e/, docs/, README.md and the text of generated exports.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'

const root = process.cwd()
const namesSource = readFileSync(path.join(root, 'src/domain/reference/names.ts'), 'utf8')
function readList(name) {
  const m = namesSource.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`))
  if (!m) throw new Error('names.ts: missing ' + name)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}
const allowed = new Set([
  ...readList('ALLOWED_ORGANISATIONS'),
  ...readList('ALLOWED_PEOPLE'),
  ...readList('ALLOWED_PLACES'),
  ...readList('ALLOWED_PARTNERS'),
  ...readList('ALLOWED_SOURCES'),
  ...readList('ALLOWED_FACILITIES'),
])
const denied = readList('DENIED_NAMES')
// Twin seed names (06 section A10) live only in test fixtures and are exempt there.
const twinNames = ['Twin House', '1 Twin Street', 'Twin Estates', 'Twin Tenant One', 'Twin Tenant Two', 'Twin Owner', 'Twin Surveys']

const fillers = ['lorem ipsum', 'TODO', 'FIXME', 'XXX', 'coming soon', 'your text here']
const textExt = new Set(['.ts', '.tsx', '.md', '.css', '.html', '.mjs', '.json', '.csv', '.txt'])

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (['node_modules', 'screens', 'test-results'].includes(name)) continue
      walk(p, out)
    } else if (textExt.has(path.extname(name)) || name.endsWith('.xlsx')) {
      out.push(p)
    }
  }
}

const files = []
for (const d of ['src', 'e2e', 'docs']) if (existsSync(d)) walk(path.join(root, d), files)
if (existsSync('README.md')) files.push(path.join(root, 'README.md'))
if (existsSync('exports')) walk(path.join(root, 'exports'), files)

const problems = []
async function textOf(file) {
  if (file.endsWith('.xlsx')) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    const parts = [wb.creator ?? '', wb.title ?? '']
    wb.eachSheet((ws) => {
      parts.push(ws.name)
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          const v = cell.value
          if (v == null) return
          if (typeof v === 'object' && 'formula' in v) parts.push(String(v.formula), String(v.result ?? ''))
          else if (typeof v === 'object' && 'richText' in v) parts.push(v.richText.map((r) => r.text).join(''))
          else parts.push(String(v))
        })
      })
    })
    return parts.join('\n')
  }
  return readFileSync(file, 'utf8')
}

// Name detection: capitalised two or three word sequences that look like organisation,
// person or building names, checked against the allow-list.
const orgSuffix = /(Estates|Deconstruction|Developments|Sustainability|Insurance|Partners|House|Wharf|Row|Group|Ltd|Limited|plc|LLP|Studio|Associates|Holdings|Construction|Demolition|Steel|Recycling|Contractors?)\b/
const nameLike = /\b([A-Z][a-z]+(?: [A-Z][a-z]+){1,2})\b/g

for (const file of files) {
  const rel = path.relative(root, file)
  const isSample = rel === path.join('src', 'domain', 'reference', 'samples.ts')
  const isNamesModule = rel === path.join('src', 'domain', 'reference', 'names.ts')
  const isTwinFixture = rel.startsWith('src' + path.sep + 'test' + path.sep) || rel.includes('twin')
  const text = await textOf(file)
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    const where = `${rel}:${i + 1}`
    if (/[–—]/.test(line)) problems.push(`${where}: em or en dash`)
    if (!isSample) {
      for (const f of fillers) {
        const re = f === 'XXX' || f === 'TODO' || f === 'FIXME' ? new RegExp('\\b' + f + '\\b') : new RegExp(f, 'i')
        if (re.test(line)) problems.push(`${where}: filler token "${f}"`)
      }
    }
    if (isSample || isNamesModule) return
    for (const d of denied) if (new RegExp('(^|[^A-Za-z0-9])' + d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z0-9]|$)').test(line)) problems.push(`${where}: denied name "${d}"`)
    for (const m of line.matchAll(nameLike)) {
      const candidate = m[1]
      if (!orgSuffix.test(candidate)) continue
      if (allowed.has(candidate)) continue
      if ([...allowed].some((a) => a.includes(candidate) || candidate.includes(a))) continue
      if (isTwinFixture && twinNames.some((t) => candidate.includes(t))) continue
      // Generic phrases that end in an allowed suffix but are not names.
      if (/^(Open|Covered|The|This|A|An|Project|Plan|Of|Policy|London|Durnley|Twin|Tiverne|Merrowgate|Garnet|Sample|Demo|Earlier|Private|Public|Blind|Supply|Market|Compliance|Operator|Design|Platform|Reuse|Reclaimed|New|Steel|Structural|Clay|Stone|Timber|Precast|Curtain|Raised|Mixed|Hazardous|Heavy|Primary|Secondary|Upper|Lower|Infill|Reinforcement|Metal|Concrete|Building|Match|Partitions|Roof|Other|Unitised|Portland)\b/.test(candidate)) continue
      problems.push(`${where}: name not in the allowed list "${candidate}"`)
    }
  })
}

if (problems.length) {
  console.error('scan: ' + problems.length + ' problem(s)')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log(`scan: ${files.length} files clean`)
