import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { docxParts, xmlEscape, type DocxInput } from './statementDocx'

const input: DocxInput = {
  title: 'Merrowgate Wharf: circular economy statement',
  subtitle: 'Prepared by Halewick Sustainability for Lantern Quay Developments, 8 October 2026',
  sections: [
    { heading: 'Project and policy context', text: 'First line.\n\nSecond line.' },
    { heading: 'Reclaimed materials', text: 'Smith & Co <x>\nOne more.' },
  ],
  footer: 'Check every figure.',
}

describe('the statement as a Word document', () => {
  it('has the parts a .docx needs', () => {
    const parts = docxParts(input)
    for (const k of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml']) expect(parts[k]).toBeTruthy()
    expect(parts['word/styles.xml']).toContain('w:styleId="Heading1"')
    expect(parts['word/styles.xml']).toContain('w:styleId="Title"')
    expect(parts['word/styles.xml']).toContain('Arial')
  })

  it('escapes text', () => {
    expect(xmlEscape(`Smith & Co <x> "q" 'a'`)).toBe('Smith &amp; Co &lt;x&gt; &quot;q&quot; &apos;a&apos;')
    expect(docxParts(input)['word/document.xml']).toContain('Smith &amp; Co &lt;x&gt;')
  })

  it('one paragraph for the title, the subtitle, each heading, each line and the footer', () => {
    const doc = docxParts(input)['word/document.xml']
    const paragraphs = doc.match(/<w:p>/g)!.length
    expect(paragraphs).toBe(2 + 2 + 4 + 1)
    expect(doc).toContain('<w:pStyle w:val="Title"/>')
    expect(doc).toContain('<w:i/>')
  })

  it('is A4 and holds no dash, arrow or comparison sign in its text', () => {
    const parts = docxParts(input)
    expect(parts['word/document.xml']).toContain('w:w="11906" w:h="16838"')
    for (const xml of Object.values(parts)) expect(xml.replace(/<[^>]*>/g, ' ')).not.toMatch(FORBIDDEN)
  })
})
