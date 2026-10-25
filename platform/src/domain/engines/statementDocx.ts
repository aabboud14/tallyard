// The circular economy statement as the XML parts of a Word document (client-consultant design, section 3.7). Pure
// text; the feature zips the parts with jszip. A4 with 20 mm margins, Arial 11 pt. List lines (statementBlocks)
// become bulleted paragraphs through a numbering part, so Word shows real bullets.
import { statementBlocks } from './statement'
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type DocxInput = { title: string; subtitle: string; sections: { heading: string; text: string }[]; footer: string }

export function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/** The numbering definition every list paragraph points at. */
export const BULLET_NUM_ID = 1

function para(text: string, style: string | null, italic = false, bullet = false): string {
  const pPr = bullet ? `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${BULLET_NUM_ID}"/></w:numPr></w:pPr>` : style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  const rPr = italic ? '<w:rPr><w:i/></w:rPr>' : ''
  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`
}

function documentXml(i: DocxInput): string {
  const body: string[] = [para(i.title, 'Title'), para(i.subtitle, 'Subtitle')]
  for (const s of i.sections) {
    body.push(para(s.heading, 'Heading1'))
    for (const b of statementBlocks(s.text)) {
      if (b.kind === 'paragraph') body.push(para(b.text, null))
      else for (const item of b.items) body.push(para(item, null, false, true))
    }
  }
  body.push(para(i.footer, null, true))
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body.join('')}${sect}</w:body></w:document>`
}

function style(id: string, name: string, size: number, bold: boolean, after: number): string {
  return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="${id === 'Heading1' ? 240 : 0}" w:after="${after}"/></w:pPr><w:rPr>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/></w:rPr></w:style>`
}

function stylesXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}">` +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr></w:style>' +
    style('Title', 'Title', 40, true, 120) +
    style('Subtitle', 'Subtitle', 24, false, 240) +
    style('Heading1', 'heading 1', 28, true, 120) +
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>' +
    '</w:styles>'
  )
}

/** One bullet list definition: a round bullet, indented, in the body font. */
function numberingXml(): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="${W}">` +
    '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:lvl></w:abstractNum>' +
    `<w:num w:numId="${BULLET_NUM_ID}"><w:abstractNumId w:val="0"/></w:num>` +
    '</w:numbering>'
  )
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'

const DOC_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'

/** The parts of the .docx, by path inside the zip. */
export function docxParts(i: DocxInput): Record<string, string> {
  return {
    '[Content_Types].xml': CONTENT_TYPES,
    '_rels/.rels': ROOT_RELS,
    'word/document.xml': documentXml(i),
    'word/styles.xml': stylesXml(),
    'word/numbering.xml': numberingXml(),
    'word/_rels/document.xml.rels': DOC_RELS,
  }
}
