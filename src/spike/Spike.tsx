// Phase 0 tooling spike (05-DESIGN-AND-TECH.md section 2.6). Deleted when Phase 3 starts.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import ExcelJS from 'exceljs'
import { safeStorage } from '../store/safeStorage'
import { getPhoto, putPhoto, reencodePhoto } from '../store/photoDb'
import { STORAGE_PREFIX } from '../domain/constants'

type SpikeState = { count: number; bump: () => void }
const useSpike = create<SpikeState>()(
  persist((set) => ({ count: 0, bump: () => set((s) => ({ count: s.count + 1 })) }), {
    name: `${STORAGE_PREFIX}-spike`,
    storage: createJSONStorage(() => safeStorage),
    version: 1,
    migrate: () => ({ count: 0 }),
  }),
)

function useFontsLoaded() {
  const [status, setStatus] = useState('pending')
  useEffect(() => {
    let live = true
    Promise.all([
      document.fonts.load('600 16px "Barlow Condensed"'),
      document.fonts.load('400 16px "IBM Plex Sans"'),
      document.fonts.load('400 16px "IBM Plex Mono"'),
    ]).then(() => {
      if (!live) return
      const ok =
        document.fonts.check('600 16px "Barlow Condensed"') &&
        document.fonts.check('400 16px "IBM Plex Sans"') &&
        document.fonts.check('400 16px "IBM Plex Mono"')
      setStatus(ok ? 'loaded' : 'missing')
    })
    return () => {
      live = false
    }
  }, [])
  return status
}

async function downloadWorkbook() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Spike'
  wb.created = new Date(Date.UTC(2026, 9, 7))
  wb.modified = new Date(Date.UTC(2026, 9, 7))
  const ws = wb.addWorksheet('Sheet 1')
  ws.getCell('A1').value = 2
  ws.getCell('A2').value = 3
  ws.getCell('A3').value = { formula: 'A1+A2', result: 5 }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'spike.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function SpikeHome() {
  const fonts = useFontsLoaded()
  const { count, bump } = useSpike()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoBytes, setPhotoBytes] = useState<string>('')
  useEffect(() => {
    getPhoto('spike').then(async (b) => {
      if (!b) return
      setPhotoUrl(URL.createObjectURL(b))
      const bytes = new Uint8Array(await b.arrayBuffer())
      setPhotoBytes(Array.from(bytes.slice(0, 4), (x) => x.toString(16).padStart(2, '0')).join(''))
    })
  }, [])
  return (
    <main className="p-6 font-sans">
      <h1 className="font-display text-3xl">Spike</h1>
      <p data-testid="fonts">Fonts: {fonts}</p>
      <p>
        Count: <span data-testid="count">{count}</span> <button onClick={bump}>Bump</button>
      </p>
      <p>
        <Link to="/second">Second page</Link>
      </p>
      <button onClick={downloadWorkbook}>Download workbook</button>
      <p>
        <input
          type="file"
          accept="image/*"
          data-testid="photo"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const blob = await reencodePhoto(f)
            await putPhoto('spike', blob)
            setPhotoUrl(URL.createObjectURL(blob))
          }}
        />
      </p>
      {photoUrl ? <img data-testid="stored-photo" src={photoUrl} alt="Stored" width={64} /> : null}
      <p data-testid="photo-head">{photoBytes}</p>
    </main>
  )
}

export function SpikeSecond() {
  const { count } = useSpike()
  return (
    <main className="p-6">
      <h1 className="font-display text-3xl">Second</h1>
      <p data-testid="count">{count}</p>
      <Link to="/">Home</Link>
    </main>
  )
}
