// Steel sections (06-DATA.md section A1). Mass in kg per metre, dimensions in mm.
export type Section = { designation: string; type: 'UB' | 'UC'; serial: string; massKgM: number; h: number; b: number; tw: number; tf: number }

const rows: [string, number, number, number, number, number][] = [
  ['UB 305x165x40', 40.3, 303.4, 165.0, 6.0, 10.2],
  ['UB 356x171x51', 51.0, 355.0, 171.5, 7.4, 11.5],
  ['UB 406x178x54', 54.1, 402.6, 177.7, 7.7, 10.9],
  ['UB 406x178x60', 60.1, 406.4, 177.9, 7.9, 12.8],
  ['UB 406x178x67', 67.1, 409.4, 178.8, 8.8, 14.3],
  ['UB 457x191x67', 67.1, 453.4, 189.9, 8.5, 12.7],
  ['UB 457x191x74', 74.3, 457.0, 190.4, 9.0, 14.5],
  ['UB 457x191x82', 82.0, 460.0, 191.3, 9.9, 16.0],
  ['UB 457x191x98', 98.3, 467.2, 192.8, 11.4, 19.6],
  ['UB 533x210x82', 82.2, 528.3, 208.8, 9.6, 13.2],
  ['UB 533x210x92', 92.1, 533.1, 209.3, 10.1, 15.6],
  ['UB 533x210x101', 101.0, 536.7, 210.0, 10.8, 17.4],
  ['UB 610x229x101', 101.2, 602.6, 227.6, 10.5, 14.8],
  ['UB 610x229x113', 113.0, 607.6, 228.2, 11.1, 17.3],
  ['UB 610x229x125', 125.1, 612.2, 229.0, 11.9, 19.6],
  ['UC 203x203x46', 46.1, 203.2, 203.6, 7.2, 11.0],
  ['UC 203x203x60', 60.0, 209.6, 205.8, 9.4, 14.2],
  ['UC 254x254x73', 73.1, 254.1, 254.6, 8.6, 14.2],
  ['UC 254x254x89', 88.9, 260.3, 256.3, 10.3, 17.3],
  ['UC 254x254x107', 107.1, 266.7, 258.8, 12.8, 20.5],
  ['UC 305x305x97', 96.9, 307.9, 305.3, 9.9, 15.4],
  ['UC 305x305x118', 117.9, 314.5, 307.4, 12.0, 18.7],
  ['UC 305x305x137', 136.9, 320.5, 309.2, 13.8, 21.7],
  ['UC 305x305x158', 158.1, 327.1, 311.2, 15.8, 25.0],
]

export const SECTIONS: Section[] = rows.map(([designation, massKgM, h, b, tw, tf]) => {
  const m = /^(UB|UC) (\d+x\d+)x/.exec(designation)!
  return { designation, type: m[1] as 'UB' | 'UC', serial: m[2], massKgM, h, b, tw, tf }
})

export function findSection(designation: string): Section | undefined {
  const key = designation.replace(/\s+/g, ' ').trim().toUpperCase()
  return SECTIONS.find((s) => s.designation.toUpperCase() === key)
}

export function sectionOrThrow(designation: string): Section {
  const s = findSection(designation)
  if (!s) throw new Error('Unknown section: ' + designation)
  return s
}

/** Serial-size key for the market snapshot, for example "UB 457x191". */
export function serialKey(designation: string): string {
  const s = sectionOrThrow(designation)
  return `${s.type} ${s.serial}`
}

export const SECTION_SOURCE = 'Verified against a published section table'
