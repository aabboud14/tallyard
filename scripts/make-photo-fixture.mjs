// Builds e2e/fixtures/sample-photo.jpg: a minimal baseline JPEG (8 by 8, grey)
// with an APP1 EXIF segment, so tests can show the stored copy has none.
import { writeFileSync, mkdirSync } from 'node:fs'

const SOI = [0xff, 0xd8]
const exifPayload = [
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
  0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header, little endian
  0x01, 0x00, // one IFD entry
  0x31, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, // tag 0x0131 Software, ASCII, 6 bytes at offset 26
  0x00, 0x00, 0x00, 0x00, // next IFD
  0x53, 0x61, 0x6d, 0x70, 0x6c, 0x00, // "Sampl\0"
]
const app1 = [0xff, 0xe1, (exifPayload.length + 2) >> 8, (exifPayload.length + 2) & 0xff, ...exifPayload]
// Quantisation table (all ones), 8 by 8 grey image
const dqt = [0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(1)]
const sof = [0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x08, 0x00, 0x08, 0x01, 0x01, 0x11, 0x00]
// Standard DC luminance Huffman table
const dhtDc = [0xff, 0xc4, 0x00, 0x1f, 0x00,
  0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
// Minimal AC table: one code of length 2 for symbol 0x00 (EOB)
const dhtAc = [0xff, 0xc4, 0x00, 0x14, 0x10,
  0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0x00]
const sos = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]
// Scan data: DC diff category 0 (code "00"), then EOB (code "00"): bits 0000, padded with ones
const scan = [0x0f]
const EOI = [0xff, 0xd9]
const bytes = Uint8Array.from([...SOI, ...app1, ...dqt, ...sof, ...dhtDc, ...dhtAc, ...sos, ...scan, ...EOI])
mkdirSync('e2e/fixtures', { recursive: true })
writeFileSync('e2e/fixtures/sample-photo.jpg', bytes)
console.log('wrote e2e/fixtures/sample-photo.jpg,', bytes.length, 'bytes')
