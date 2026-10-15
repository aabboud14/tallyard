// The statement for Word: build the file, reopen it with JSZip and read the document part.
import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { statementView } from '../../store/selectors/sustainability'
import { buildStatementDocx, DOCX_MIME } from './statementExport'

describe('the circular economy statement as a .docx', () => {
  it('reopens as a zip whose document holds the project name and every section heading', async () => {
    const v = statementView(fresh(), viewer(U.marcus), MERROWGATE_ID)!
    const buf = await buildStatementDocx(v.docx)
    expect(buf.byteLength).toBeGreaterThan(1000)
    const zip = await JSZip.loadAsync(buf)
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml']))
    const doc = await zip.file('word/document.xml')!.async('string')
    expect(doc).toContain('Merrowgate Wharf')
    for (const s of v.sections) expect(doc).toContain(s.heading)
    expect(DOCX_MIME).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })
})
