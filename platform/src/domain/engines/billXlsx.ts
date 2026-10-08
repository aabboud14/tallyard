// Reads a workbook into cells for the bill parser. Works in the browser and in Node.
import ExcelJS from 'exceljs'
import type { Cell } from './billImport'

function cellValue(c: ExcelJS.Cell): Cell {
  const v = c.value
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'string') return v
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if ('result' in v && v.result !== undefined && v.result !== null) return typeof v.result === 'number' ? v.result : String(v.result)
    if ('richText' in v) return v.richText.map((r) => r.text).join('')
    if ('text' in v) return String(v.text)
  }
  return String(v)
}

export function worksheetCells(ws: ExcelJS.Worksheet): Cell[][] {
  const rows: Cell[][] = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const out: Cell[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // In merged cells read only the top-left cell.
      if (cell.isMerged && cell.master !== cell) {
        out[colNumber - 1] = null
        return
      }
      out[colNumber - 1] = cellValue(cell)
    })
    rows[rowNumber - 1] = out
  })
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = []
  return rows
}

export async function cellsFromArrayBuffer(buffer: ArrayBuffer): Promise<Cell[][]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('The workbook has no sheets')
  return worksheetCells(ws)
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  if (typeof atob === 'function') {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  }
  const buf = Buffer.from(b64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}
