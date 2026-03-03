// =====================================================
// FILE GENERATOR
//
// Creates downloadable files (ZIP, DOCX, XLSX, PDF, PPTX)
// from structured content provided by AI tools.
// Returns Base64 strings that can be served via download API.
// =====================================================

import JSZip from 'jszip'

// ── Types ──

export interface GeneratedFileResult {
  success: boolean
  base64?: string
  mimeType?: string
  filename?: string
  error?: string
  sizeBytes?: number
}

export interface DocxSection {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'pagebreak'
  level?: number           // for headings (1-6)
  text?: string            // for paragraph, heading
  items?: string[]         // for list
  rows?: string[][]        // for table (first row = headers)
  language?: string        // for code
  bold?: boolean
}

export interface SheetData {
  name?: string
  headers: string[]
  rows: (string | number | boolean | null)[][]
}

export interface SlideData {
  title: string
  body?: string
  bullets?: string[]
  notes?: string
  image_url?: string
}

// ── ZIP Generator ──

export async function generateZip(
  files: Record<string, string>,
  filename = 'project.zip'
): Promise<GeneratedFileResult> {
  try {
    const zip = new JSZip()

    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content)
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const base64 = buffer.toString('base64')

    return {
      success: true,
      base64,
      mimeType: 'application/zip',
      filename,
      sizeBytes: buffer.length,
    }
  } catch (err: unknown) {
    return { success: false, error: `ZIP generation failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── DOCX Generator ──

export async function generateDocx(
  sections: DocxSection[],
  title: string,
  filename = 'document.docx'
): Promise<GeneratedFileResult> {
  try {
    const docx = await import('docx')
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            HeadingLevel, BorderStyle, WidthType, ShadingType, AlignmentType,
            LevelFormat, PageBreak } = docx

    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    const borders = { top: border, bottom: border, left: border, right: border }
    const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 }

    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []

    for (const section of sections) {
      switch (section.type) {
        case 'heading': {
          const level = section.level === 1 ? HeadingLevel.HEADING_1
            : section.level === 2 ? HeadingLevel.HEADING_2
            : section.level === 3 ? HeadingLevel.HEADING_3
            : HeadingLevel.HEADING_4
          children.push(new Paragraph({ heading: level, children: [new TextRun({ text: section.text || '', bold: true })] }))
          break
        }
        case 'paragraph':
          children.push(new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: section.text || '', bold: section.bold, size: 22, font: 'Arial' })]
          }))
          break
        case 'list':
          if (section.items) {
            for (const item of section.items) {
              children.push(new Paragraph({
                spacing: { after: 60 },
                children: [new TextRun({ text: `• ${item}`, size: 22, font: 'Arial' })]
              }))
            }
          }
          break
        case 'table':
          if (section.rows && section.rows.length > 0) {
            const colCount = section.rows[0].length
            const colWidth = Math.floor(9360 / colCount)
            children.push(new Table({
              width: { size: 9360, type: WidthType.DXA },
              columnWidths: Array(colCount).fill(colWidth),
              rows: section.rows.map((row, rIdx) => new TableRow({
                children: row.map(cell => new TableCell({
                  borders,
                  width: { size: colWidth, type: WidthType.DXA },
                  margins: cellMargins,
                  shading: rIdx === 0 ? { fill: '1a1a2e', type: ShadingType.CLEAR } : undefined,
                  children: [new Paragraph({ children: [new TextRun({ text: cell, bold: rIdx === 0, color: rIdx === 0 ? 'FFFFFF' : '111111', size: 20, font: 'Arial' })] })]
                }))
              }))
            }))
          }
          break
        case 'code':
          children.push(new Paragraph({
            spacing: { before: 80, after: 80 },
            children: [new TextRun({ text: section.text || '', size: 18, font: 'Consolas', color: '2563EB' })]
          }))
          break
        case 'pagebreak':
          children.push(new Paragraph({ children: [new PageBreak()] }))
          break
      }
    }

    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 22 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 32, bold: true, font: 'Arial' }, paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 28, bold: true, font: 'Arial' }, paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
        ]
      },
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children }]
    })

    const buffer = await Packer.toBuffer(doc)
    return {
      success: true,
      base64: buffer.toString('base64'),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename,
      sizeBytes: buffer.length,
    }
  } catch (err: unknown) {
    return { success: false, error: `DOCX generation failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── XLSX Generator ──

export async function generateXlsx(
  sheets: SheetData[],
  filename = 'spreadsheet.xlsx'
): Promise<GeneratedFileResult> {
  try {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()

    for (const sheet of sheets) {
      const ws = workbook.addWorksheet(sheet.name || 'Sheet1')

      // Add headers
      ws.addRow(sheet.headers)
      const headerRow = ws.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } }
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

      // Add data rows
      for (const row of sheet.rows) {
        ws.addRow(row)
      }

      // Auto-width columns
      ws.columns.forEach(col => {
        if (col && col.eachCell) {
          let maxLen = 10
          col.eachCell({ includeEmpty: true }, cell => {
            const len = cell.value ? String(cell.value).length : 0
            if (len > maxLen) maxLen = Math.min(len, 50)
          })
          col.width = maxLen + 2
        }
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const nodeBuffer = Buffer.from(buffer)

    return {
      success: true,
      base64: nodeBuffer.toString('base64'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename,
      sizeBytes: nodeBuffer.length,
    }
  } catch (err: unknown) {
    return { success: false, error: `XLSX generation failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── PDF Generator ──

export async function generatePdf(
  sections: DocxSection[],
  title: string,
  filename = 'document.pdf'
): Promise<GeneratedFileResult> {
  try {
    const PDFDocument = (await import('pdfkit')).default

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 72, bottom: 72, left: 72, right: 72 } })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve({
          success: true,
          base64: buffer.toString('base64'),
          mimeType: 'application/pdf',
          filename,
          sizeBytes: buffer.length,
        })
      })

      // Title
      doc.fontSize(24).font('Helvetica-Bold').text(title, { align: 'left' })
      doc.moveDown(0.5)
      doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#CCCCCC')
      doc.moveDown(1)

      for (const section of sections) {
        switch (section.type) {
          case 'heading':
            doc.moveDown(0.5)
            doc.fontSize(section.level === 1 ? 20 : section.level === 2 ? 16 : 14)
               .font('Helvetica-Bold')
               .text(section.text || '')
            doc.moveDown(0.3)
            break
          case 'paragraph':
            doc.fontSize(11).font(section.bold ? 'Helvetica-Bold' : 'Helvetica').text(section.text || '', { lineGap: 4 })
            doc.moveDown(0.5)
            break
          case 'list':
            if (section.items) {
              for (const item of section.items) {
                doc.fontSize(11).font('Helvetica').text(`  •  ${item}`, { lineGap: 2 })
              }
              doc.moveDown(0.5)
            }
            break
          case 'code':
            doc.fontSize(9).font('Courier').text(section.text || '', { lineGap: 2 })
            doc.moveDown(0.5)
            break
          case 'pagebreak':
            doc.addPage()
            break
          default:
            break
        }
      }

      doc.end()
    })
  } catch (err: unknown) {
    return { success: false, error: `PDF generation failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── PPTX Generator ──

export async function generatePptx(
  slides: SlideData[],
  title: string,
  filename = 'presentation.pptx'
): Promise<GeneratedFileResult> {
  try {
    const PptxGenJS = (await import('pptxgenjs')).default
    const pptx = new PptxGenJS()
    pptx.title = title
    pptx.layout = 'LAYOUT_WIDE'

    for (const slide of slides) {
      const s = pptx.addSlide()

      // Title
      s.addText(slide.title, {
        x: 0.5, y: 0.3, w: '90%', h: 1,
        fontSize: 28, bold: true, color: '111111',
        fontFace: 'Arial',
      })

      // Body or bullets
      if (slide.bullets && slide.bullets.length > 0) {
        const bulletItems = slide.bullets.map(b => ({
          text: b,
          options: { fontSize: 16, color: '333333', bullet: { code: '2022' as const }, breakLine: true as const },
        }))
        s.addText(bulletItems as Parameters<typeof s.addText>[0], {
          x: 0.5, y: 1.5, w: '90%', h: 4,
          fontFace: 'Arial',
          valign: 'top',
        })
      } else if (slide.body) {
        s.addText(slide.body, {
          x: 0.5, y: 1.5, w: '90%', h: 4,
          fontSize: 16, color: '333333',
          fontFace: 'Arial',
          valign: 'top',
        })
      }

      // Speaker notes
      if (slide.notes) {
        s.addNotes(slide.notes)
      }
    }

    // Generate as base64 string
    const output = await pptx.write({ outputType: 'base64' })
    const base64Str = typeof output === 'string' ? output : Buffer.from(output as ArrayBuffer).toString('base64')
    const sizeBytes = Math.ceil(base64Str.length * 3 / 4)

    return {
      success: true,
      base64: base64Str,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename,
      sizeBytes,
    }
  } catch (err: unknown) {
    return { success: false, error: `PPTX generation failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}
