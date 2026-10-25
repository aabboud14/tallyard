// The circular economy statement as a Word document: the pure XML parts from statementDocx, zipped with jszip, which
// loads only when someone downloads. Nothing leaves the browser.
import { docxParts, DOCX_MIME, type DocxInput } from '../../domain/engines/statementDocx'

export { DOCX_MIME }

export async function buildStatementDocx(d: DocxInput): Promise<ArrayBuffer> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  // The content types part goes first, as Word expects.
  for (const [path, xml] of Object.entries(docxParts(d))) zip.file(path, xml)
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', mimeType: DOCX_MIME })
}
