// =====================================================
// DOWNLOAD API
//
// POST /api/download — Generate and serve a file download
// Accepts file content + format, returns the binary file.
//
// Used by AI tools (generate_zip, generate_docx, etc.)
// and by the frontend "Download All as ZIP" button.
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { generateZip, generateDocx, generateXlsx, generatePdf, generatePptx } from '@/lib/file-generator'
import type { DocxSection, SheetData, SlideData } from '@/lib/file-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface DownloadRequest {
  format: 'zip' | 'docx' | 'xlsx' | 'pdf' | 'pptx'
  filename?: string
  title?: string
  // For ZIP
  files?: Record<string, string>
  // For DOCX/PDF
  sections?: DocxSection[]
  // For XLSX
  sheets?: SheetData[]
  // For PPTX
  slides?: SlideData[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as DownloadRequest
    const { format, filename, title } = body

    if (!format) {
      return NextResponse.json({ error: 'Missing format parameter' }, { status: 400 })
    }

    let result

    switch (format) {
      case 'zip':
        if (!body.files || Object.keys(body.files).length === 0) {
          return NextResponse.json({ error: 'No files provided for ZIP' }, { status: 400 })
        }
        result = await generateZip(body.files, filename || 'project.zip')
        break

      case 'docx':
        if (!body.sections || body.sections.length === 0) {
          return NextResponse.json({ error: 'No sections provided for DOCX' }, { status: 400 })
        }
        result = await generateDocx(body.sections, title || 'Document', filename || 'document.docx')
        break

      case 'xlsx':
        if (!body.sheets || body.sheets.length === 0) {
          return NextResponse.json({ error: 'No sheets provided for XLSX' }, { status: 400 })
        }
        result = await generateXlsx(body.sheets, filename || 'spreadsheet.xlsx')
        break

      case 'pdf':
        if (!body.sections || body.sections.length === 0) {
          return NextResponse.json({ error: 'No sections provided for PDF' }, { status: 400 })
        }
        result = await generatePdf(body.sections, title || 'Document', filename || 'document.pdf')
        break

      case 'pptx':
        if (!body.slides || body.slides.length === 0) {
          return NextResponse.json({ error: 'No slides provided for PPTX' }, { status: 400 })
        }
        result = await generatePptx(body.slides, title || 'Presentation', filename || 'presentation.pptx')
        break

      default:
        return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 })
    }

    if (!result.success || !result.base64) {
      return NextResponse.json({ error: result.error || 'Generation failed' }, { status: 500 })
    }

    // Return as binary file download
    const buffer = Buffer.from(result.base64, 'base64')
    return new Response(buffer, {
      headers: {
        'Content-Type': result.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${result.filename || 'download'}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: unknown) {
    console.error('[Download API Error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
