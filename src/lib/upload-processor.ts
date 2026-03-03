// =====================================================
// UPLOAD PROCESSOR
//
// Processes file attachments BEFORE they hit the AI message payload.
// Extracts content into toolCtx.files so AI accesses via view_file.
// Returns manifests (small text summaries) instead of raw base64.
//
// This prevents the "prompt is too long" error by keeping
// file content out of the context window entirely.
// =====================================================

import JSZip from 'jszip'

// ── Types ──

interface Attachment {
  type: 'image' | 'pdf' | 'file' | 'url'
  content: string // base64
  filename?: string
  mimeType?: string
}

interface ProcessedResult {
  /** Filtered attachments — only images remain (for vision API) */
  attachments: Attachment[]
  /** Manifest text injected into user message as context */
  manifest: string
  /** Count of files extracted */
  filesExtracted: number
}

type FileCategory = 'zip' | 'pdf' | 'docx' | 'xlsx' | 'csv' | 'image' | 'text' | 'binary'

// ── Text file extensions ──

const TEXT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'json', 'yaml', 'yml', 'toml', 'xml', 'svg',
  'md', 'mdx', 'txt', 'rst', 'rtf',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cpp', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
  'sql', 'graphql', 'gql', 'prisma',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
  'dockerfile', 'makefile', 'rakefile', 'gemfile',
  'lock', 'log', 'ini', 'cfg', 'conf',
  'vue', 'svelte', 'astro', 'ejs', 'hbs', 'pug', 'njk',
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'])
const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif'])

// ── Main processor ──

export async function processUploads(
  attachments: Attachment[],
  files: Record<string, string>
): Promise<ProcessedResult> {
  const imageAttachments: Attachment[] = []
  const manifestParts: string[] = []
  let filesExtracted = 0

  for (const att of attachments) {
    const fname = att.filename || 'unknown'
    const ext = fname.split('.').pop()?.toLowerCase() || ''
    const category = categorize(fname, att.mimeType || '', ext)

    switch (category) {
      case 'image': {
        // Keep images as attachments for vision API
        imageAttachments.push(att)
        manifestParts.push(`📷 ${fname} (image — sent to vision)`)
        break
      }

      case 'zip': {
        try {
          const result = await extractZip(att.content, files)
          filesExtracted += result.count
          manifestParts.push(result.manifest)
        } catch (err: unknown) {
          manifestParts.push(`⚠️ ${fname}: Failed to extract ZIP — ${err instanceof Error ? err.message : String(err)}`)
        }
        break
      }

      case 'pdf': {
        try {
          const result = await extractPdf(att.content, fname, files)
          filesExtracted += 1
          manifestParts.push(result.manifest)
        } catch (err: unknown) {
          manifestParts.push(`⚠️ ${fname}: Failed to extract PDF — ${err instanceof Error ? err.message : String(err)}`)
        }
        break
      }

      case 'docx': {
        try {
          const result = await extractDocx(att.content, fname, files)
          filesExtracted += 1
          manifestParts.push(result.manifest)
        } catch (err: unknown) {
          manifestParts.push(`⚠️ ${fname}: Failed to extract DOCX — ${err instanceof Error ? err.message : String(err)}`)
        }
        break
      }

      case 'xlsx': {
        try {
          const result = await extractXlsx(att.content, fname, files)
          filesExtracted += 1
          manifestParts.push(result.manifest)
        } catch (err: unknown) {
          manifestParts.push(`⚠️ ${fname}: Failed to extract XLSX — ${err instanceof Error ? err.message : String(err)}`)
        }
        break
      }

      case 'csv': {
        try {
          const decoded = Buffer.from(att.content, 'base64').toString('utf-8')
          files[fname] = decoded
          const lines = decoded.split('\n').length
          filesExtracted += 1
          manifestParts.push(`📊 ${fname} (CSV, ${lines} rows). Use view_file('${fname}') to read.`)
        } catch {
          manifestParts.push(`⚠️ ${fname}: Failed to decode CSV`)
        }
        break
      }

      case 'text': {
        try {
          const decoded = Buffer.from(att.content, 'base64').toString('utf-8')
          files[fname] = decoded
          const lines = decoded.split('\n').length
          filesExtracted += 1
          manifestParts.push(`📄 ${fname} (${lines} lines). Use view_file('${fname}') to read.`)
        } catch {
          manifestParts.push(`⚠️ ${fname}: Failed to decode as text`)
        }
        break
      }

      case 'binary': {
        const sizeKB = Math.ceil((att.content.length * 3) / 4 / 1024)
        manifestParts.push(`📦 ${fname} (binary, ${sizeKB}KB). Available in project files but cannot be displayed as text.`)
        break
      }
    }
  }

  const manifest = manifestParts.length > 0
    ? `\n\n---\n📎 Uploaded files:\n${manifestParts.join('\n')}\n\nUse view_file(filename) to read any text file. Use edit_file to modify.`
    : ''

  return {
    attachments: imageAttachments,
    manifest,
    filesExtracted,
  }
}

// ── Categorizer ──

function categorize(filename: string, mimeType: string, ext: string): FileCategory {
  // Images
  if (IMAGE_EXTENSIONS.has(ext) || IMAGE_MIMES.has(mimeType)) return 'image'

  // Archives
  if (ext === 'zip' || ext === 'gz' || ext === 'tar' || mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip'

  // Documents
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx'
  if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'xlsx'
  if (ext === 'csv' || mimeType === 'text/csv') return 'csv'

  // Text files
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  if (mimeType.startsWith('text/')) return 'text'
  if (mimeType === 'application/json') return 'text'
  if (mimeType === 'application/xml') return 'text'

  // Filename-based detection for extensionless files
  const base = filename.split('/').pop()?.toLowerCase() || ''
  if (['dockerfile', 'makefile', 'gemfile', 'rakefile', '.gitignore', '.env', '.eslintrc', '.prettierrc', 'tsconfig.json', 'package.json'].includes(base)) return 'text'

  return 'binary'
}

// ── ZIP extraction ──

async function extractZip(
  base64: string,
  files: Record<string, string>
): Promise<{ manifest: string; count: number }> {
  const buffer = Buffer.from(base64, 'base64')
  const zip = await JSZip.loadAsync(buffer)

  const entries: { path: string; size: number; isText: boolean }[] = []
  let textCount = 0
  let binaryCount = 0
  let totalSize = 0

  const filePromises: Promise<void>[] = []

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return

    // Skip common junk
    if (relativePath.startsWith('__MACOSX/') || relativePath.includes('.DS_Store') || relativePath.includes('Thumbs.db')) return
    // Skip node_modules
    if (relativePath.includes('node_modules/')) return

    const ext = relativePath.split('.').pop()?.toLowerCase() || ''
    const isText = TEXT_EXTENSIONS.has(ext) || ['json', 'md', 'txt', 'env'].includes(ext) || !ext

    filePromises.push(
      zipEntry.async(isText ? 'string' : 'uint8array').then(content => {
        if (isText && typeof content === 'string') {
          // Cap individual files at 500KB to prevent memory issues
          if (content.length < 512_000) {
            files[relativePath] = content
            textCount++
          }
        } else {
          binaryCount++
        }
        const size = typeof content === 'string' ? content.length : (content as Uint8Array).length
        totalSize += size
        entries.push({ path: relativePath, size, isText })
      }).catch(() => {
        entries.push({ path: relativePath, size: 0, isText: false })
        binaryCount++
      })
    )
  })

  await Promise.all(filePromises)

  // Sort entries by path for readability
  entries.sort((a, b) => a.path.localeCompare(b.path))

  // Build manifest
  const sizeStr = totalSize > 1_000_000
    ? `${(totalSize / 1_000_000).toFixed(1)}MB`
    : `${Math.ceil(totalSize / 1024)}KB`

  const fileTree = entries.slice(0, 50).map(e => {
    const sizeK = e.size > 1024 ? `${Math.ceil(e.size / 1024)}KB` : `${e.size}B`
    return `  ${e.isText ? '📄' : '📦'} ${e.path} (${sizeK})`
  }).join('\n')

  const overflow = entries.length > 50 ? `\n  ... and ${entries.length - 50} more files` : ''

  const manifest = `📁 Extracted ZIP archive (${entries.length} files, ${sizeStr}):\n${fileTree}${overflow}\n\n${textCount} text files loaded — use view_file(path) to read any file.\n${binaryCount} binary files noted but not readable as text.`

  return { manifest, count: textCount }
}

// ── PDF extraction ──

async function extractPdf(
  base64: string,
  filename: string,
  files: Record<string, string>
): Promise<{ manifest: string }> {
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule as { default?: (b: Buffer) => Promise<{ text: string; numpages: number }> }).default || pdfParseModule
  const buffer = Buffer.from(base64, 'base64')
  const data = await (pdfParse as (b: Buffer) => Promise<{ text: string; numpages: number }>)(buffer)

  const text = data.text || ''
  const pages = data.numpages || 0
  const words = text.split(/\s+/).length

  // Chunk if very large (over ~150k chars ≈ 40k tokens)
  if (text.length > 150_000) {
    const chunkSize = 150_000
    let chunkIdx = 0
    for (let i = 0; i < text.length; i += chunkSize) {
      const key = chunkIdx === 0 ? `${filename}.txt` : `${filename}.chunk${chunkIdx + 1}.txt`
      files[key] = text.slice(i, i + chunkSize)
      chunkIdx++
    }
    return {
      manifest: `📕 ${filename} (PDF, ${pages} pages, ~${words} words, ${chunkIdx} chunks).\nFull text in view_file('${filename}.txt') and ${chunkIdx - 1} additional chunks.`
    }
  }

  files[`${filename}.txt`] = text
  return {
    manifest: `📕 ${filename} (PDF, ${pages} pages, ~${words} words). Full text in view_file('${filename}.txt').`
  }
}

// ── DOCX extraction ──

async function extractDocx(
  base64: string,
  filename: string,
  files: Record<string, string>
): Promise<{ manifest: string }> {
  const mammoth = await import('mammoth')
  const buf = Buffer.from(base64, 'base64')

  const result = await mammoth.convertToHtml({ buffer: buf as any })
  const html = result.value || ''

  // Also get plain text

  const textResult = await mammoth.extractRawText({ buffer: buf as any })
  const text = textResult.value || ''
  const words = text.split(/\s+/).length

  files[`${filename}.txt`] = text
  files[`${filename}.html`] = html

  const warnings = result.messages.length > 0
    ? `\n${result.messages.length} conversion warnings.`
    : ''

  return {
    manifest: `📘 ${filename} (Word document, ~${words} words).${warnings}\nPlain text: view_file('${filename}.txt')\nHTML version: view_file('${filename}.html')`
  }
}

// ── XLSX extraction ──

async function extractXlsx(
  base64: string,
  filename: string,
  files: Record<string, string>
): Promise<{ manifest: string }> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const buf = Buffer.from(base64, 'base64')

  await workbook.xlsx.load(buf as any)

  const sheetSummaries: string[] = []

  workbook.eachSheet((sheet, sheetId) => {
    const rows = sheet.rowCount
    const cols = sheet.columnCount
    const sheetName = sheet.name || `Sheet${sheetId}`
    sheetSummaries.push(`  📊 "${sheetName}" — ${rows} rows × ${cols} cols`)

    // Convert sheet to CSV-like text
    const lines: string[] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = []
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(String(cell.value ?? ''))
      })
      lines.push(cells.join('\t'))
    })

    const csvContent = lines.join('\n')
    // Cap at 200KB per sheet
    if (csvContent.length < 200_000) {
      files[`${filename}.${sheetName}.tsv`] = csvContent
    }
  })

  return {
    manifest: `📗 ${filename} (Excel, ${workbook.worksheets.length} sheets):\n${sheetSummaries.join('\n')}\n\nEach sheet available as TSV: view_file('${filename}.<SheetName>.tsv')`
  }
}
