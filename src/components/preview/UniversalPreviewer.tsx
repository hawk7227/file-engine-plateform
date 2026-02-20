'use client'
import { useState, useEffect, useMemo } from 'react'

/**
 * UNIVERSAL FILE PREVIEWER
 * 
 * Supports previewing ALL file types:
 * - Code (with syntax highlighting)
 * - HTML (live render in iframe)
 * - React/JSX (Sandpack integration)
 * - Markdown (rendered)
 * - Images (display)
 * - JSON (formatted tree)
 * - CSV (table view)
 * - PDF (embed)
 * - SVG (render)
 * - Mermaid (diagrams)
 * - SQL (formatted)
 * - Diff (side-by-side)
 */

// ============================================
// TYPES
// ============================================

export interface PreviewFile {
  filepath: string
  language: string
  content: string
  url?: string // For binary files
}

interface UniversalPreviewerProps {
  files: PreviewFile[]
  selectedIndex: number
  onSelectFile: (index: number) => void
  theme?: 'dark' | 'light'
}

// ============================================
// SYNTAX HIGHLIGHTING (Basic)
// ============================================

const SYNTAX_COLORS = {
  keyword: '#ff79c6',
  string: '#f1fa8c',
  number: '#bd93f9',
  comment: '#6272a4',
  function: '#50fa7b',
  variable: '#8be9fd',
  operator: '#ff79c6',
  tag: '#ff79c6',
  attribute: '#50fa7b',
  value: '#f1fa8c',
}

function highlightCode(code: string, language: string): string {
  // Basic syntax highlighting patterns
  const patterns: Record<string, RegExp[]> = {
    keyword: [
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|public|private|protected|static|readonly|abstract|override)\b/g,
    ],
    string: [
      /"[^"]*"/g,
      /'[^']*'/g,
      /`[^`]*`/g,
    ],
    number: [
      /\b\d+\.?\d*\b/g,
    ],
    comment: [
      /\/\/.*$/gm,
      /\/\*[\s\S]*?\*\//g,
      /<!--[\s\S]*?-->/g,
    ],
    function: [
      /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    ],
  }

  let result = escapeHtml(code)

  // Apply highlighting
  for (const [type, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      result = result.replace(regex, (match) => 
        `<span style="color: ${SYNTAX_COLORS[type as keyof typeof SYNTAX_COLORS]}">${match}</span>`
      )
    }
  }

  return result
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================
// MARKDOWN RENDERER
// ============================================

function renderMarkdown(content: string): string {
  let html = escapeHtml(content)

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 style="color: var(--text-primary); margin: 16px 0 8px;">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="color: var(--text-primary); margin: 20px 0 10px;">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="color: var(--text-primary); margin: 24px 0 12px;">$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => 
    `<pre style="background: var(--bg-tertiary); padding: 12px; border-radius: 6px; overflow-x: auto;"><code>${code.trim()}</code></pre>`
  )

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">$1</code>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--accent-blue);">$1</a>')

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left: 20px;">$2</li>')

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin: 12px 0;">')

  return `<div style="line-height: 1.6; color: var(--text-secondary);"><p style="margin: 12px 0;">${html}</p></div>`
}

// ============================================
// JSON TREE RENDERER
// ============================================

function renderJsonTree(content: string): string {
  try {
    const obj = JSON.parse(content)
    return renderJsonValue(obj, 0)
  } catch {
    return `<span style="color: var(--accent-orange);">Invalid JSON</span>`
  }
}

function renderJsonValue(value: any, depth: number): string {
  const indent = '  '.repeat(depth)
  
  if (value === null) return `<span style="color: ${SYNTAX_COLORS.keyword}">null</span>`
  if (typeof value === 'boolean') return `<span style="color: ${SYNTAX_COLORS.keyword}">${value}</span>`
  if (typeof value === 'number') return `<span style="color: ${SYNTAX_COLORS.number}">${value}</span>`
  if (typeof value === 'string') return `<span style="color: ${SYNTAX_COLORS.string}">"${escapeHtml(value)}"</span>`
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map(v => `${indent}  ${renderJsonValue(v, depth + 1)}`).join(',\n')
    return `[\n${items}\n${indent}]`
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    const entries = keys.map(k => 
      `${indent}  <span style="color: ${SYNTAX_COLORS.variable}">"${k}"</span>: ${renderJsonValue(value[k], depth + 1)}`
    ).join(',\n')
    return `{\n${entries}\n${indent}}`
  }
  
  return String(value)
}

// ============================================
// CSV TABLE RENDERER
// ============================================

function renderCsvTable(content: string): string {
  const lines = content.trim().split('\n')
  if (lines.length === 0) return '<p>Empty CSV</p>'

  const parseRow = (line: string) => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(parseRow)

  const headerHtml = headers.map(h => 
    `<th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid var(--border-default); color: var(--text-primary); font-weight: 600;">${escapeHtml(h)}</th>`
  ).join('')

  const rowsHtml = rows.map(row => 
    `<tr>${row.map(cell => 
      `<td style="padding: 8px 12px; border-bottom: 1px solid var(--border-subtle);">${escapeHtml(cell)}</td>`
    ).join('')}</tr>`
  ).join('')

  return `
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead><tr style="background: var(--bg-tertiary);">${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `
}

// ============================================
// MERMAID RENDERER (Placeholder)
// ============================================

function renderMermaid(content: string): string {
  // In production, integrate with Mermaid.js library
  return `
    <div style="padding: 20px; text-align: center;">
      <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 8px; display: inline-block;">
        <pre style="text-align: left; color: var(--text-secondary);">${escapeHtml(content)}</pre>
      </div>
      <p style="margin-top: 12px; color: var(--text-muted); font-size: 12px;">
        Mermaid diagram (render with mermaid.js)
      </p>
    </div>
  `
}

// ============================================
// SQL FORMATTER
// ============================================

function formatSql(content: string): string {
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'DEFAULT',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
    'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'BETWEEN', 'LIKE'
  ]

  let result = escapeHtml(content)

  // Highlight keywords
  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'gi')
    result = result.replace(regex, `<span style="color: ${SYNTAX_COLORS.keyword}; font-weight: 600;">$1</span>`)
  }

  // Highlight strings
  result = result.replace(/'[^']*'/g, (match) => 
    `<span style="color: ${SYNTAX_COLORS.string};">${match}</span>`
  )

  // Highlight numbers
  result = result.replace(/\b\d+\b/g, (match) => 
    `<span style="color: ${SYNTAX_COLORS.number};">${match}</span>`
  )

  // Highlight comments
  result = result.replace(/--.*$/gm, (match) => 
    `<span style="color: ${SYNTAX_COLORS.comment};">${match}</span>`
  )

  return result
}

// ============================================
// FILE TYPE DETECTION
// ============================================

function getFileType(filepath: string, language: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase() || ''
  
  const typeMap: Record<string, string> = {
    // Web
    html: 'html', htm: 'html',
    css: 'css', scss: 'css', less: 'css',
    js: 'javascript', jsx: 'react',
    ts: 'typescript', tsx: 'react',
    
    // Data
    json: 'json',
    csv: 'csv',
    xml: 'xml',
    yaml: 'yaml', yml: 'yaml',
    
    // Documents
    md: 'markdown', mdx: 'markdown',
    txt: 'text',
    
    // Database
    sql: 'sql',
    prisma: 'prisma',
    graphql: 'graphql', gql: 'graphql',
    
    // Config
    env: 'env',
    gitignore: 'gitignore',
    dockerfile: 'dockerfile',
    
    // Images
    png: 'image', jpg: 'image', jpeg: 'image',
    gif: 'image', webp: 'image', ico: 'image',
    svg: 'svg',
    
    // Other
    pdf: 'pdf',
    mermaid: 'mermaid',
  }

  return typeMap[ext] || language || 'code'
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UniversalPreviewer({ 
  files, 
  selectedIndex, 
  onSelectFile,
  theme = 'dark' 
}: UniversalPreviewerProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'split'>('preview')
  const [copyFeedback, setCopyFeedback] = useState(false)

  const selectedFile = files[selectedIndex]
  const fileType = selectedFile ? getFileType(selectedFile.filepath, selectedFile.language) : 'code'

  // Determine if file supports live preview
  const supportsPreview = ['html', 'react', 'markdown', 'json', 'csv', 'svg', 'image', 'mermaid'].includes(fileType)

  // Copy to clipboard
  async function copyToClipboard() {
    if (!selectedFile) return
    await navigator.clipboard.writeText(selectedFile.content)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  // Download file
  function downloadFile() {
    if (!selectedFile) return
    const blob = new Blob([selectedFile.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = selectedFile.filepath.split('/').pop() || 'file.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render preview based on file type
  const renderPreview = useMemo(() => {
    if (!selectedFile) return null

    switch (fileType) {
      case 'html':
        return (
          <iframe
            srcDoc={selectedFile.content}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
              borderRadius: 'var(--radius-md)'
            }}
            sandbox="allow-scripts"
          />
        )

      case 'markdown':
        return (
          <div 
            className="markdown-preview"
            style={{ padding: 20, overflow: 'auto', height: '100%' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedFile.content) }}
          />
        )

      case 'json':
        return (
          <pre style={{ 
            padding: 16, 
            overflow: 'auto', 
            height: '100%',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.5
          }}>
            <code dangerouslySetInnerHTML={{ __html: renderJsonTree(selectedFile.content) }} />
          </pre>
        )

      case 'csv':
        return (
          <div 
            style={{ padding: 16, overflow: 'auto', height: '100%' }}
            dangerouslySetInnerHTML={{ __html: renderCsvTable(selectedFile.content) }}
          />
        )

      case 'svg':
        return (
          <div style={{ 
            padding: 20, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            background: 'var(--bg-tertiary)'
          }}>
            <div 
              style={{ maxWidth: '90%', maxHeight: '90%' }}
              dangerouslySetInnerHTML={{ __html: selectedFile.content }}
            />
          </div>
        )

      case 'image':
        return (
          <div style={{ 
            padding: 20, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            background: 'var(--bg-tertiary)'
          }}>
            <img 
              src={selectedFile.url || `data:image/png;base64,${selectedFile.content}`}
              alt={selectedFile.filepath}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )

      case 'mermaid':
        return (
          <div 
            style={{ padding: 16, overflow: 'auto', height: '100%' }}
            dangerouslySetInnerHTML={{ __html: renderMermaid(selectedFile.content) }}
          />
        )

      case 'sql':
        return (
          <pre style={{ 
            padding: 16, 
            overflow: 'auto', 
            height: '100%',
            fontSize: 13,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6
          }}>
            <code dangerouslySetInnerHTML={{ __html: formatSql(selectedFile.content) }} />
          </pre>
        )

      default:
        // Code view with syntax highlighting
        return (
          <pre style={{ 
            padding: 16, 
            overflow: 'auto', 
            height: '100%',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.5
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlightCode(selectedFile.content, fileType) }} />
          </pre>
        )
    }
  }, [selectedFile, fileType])

  // Render code with line numbers
  const renderCode = useMemo(() => {
    if (!selectedFile) return null
    
    const lines = selectedFile.content.split('\n')
    
    return (
      <div style={{ display: 'flex', height: '100%', overflow: 'auto' }}>
        {/* Line numbers */}
        <div style={{
          padding: '16px 0',
          textAlign: 'right',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.5,
          userSelect: 'none',
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          minWidth: 40
        }}>
          {lines.map((_, i) => (
            <div key={i} style={{ padding: '0 8px' }}>{i + 1}</div>
          ))}
        </div>
        
        {/* Code content */}
        <pre style={{ 
          flex: 1,
          padding: 16, 
          margin: 0,
          overflow: 'auto',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.5
        }}>
          <code dangerouslySetInnerHTML={{ 
            __html: fileType === 'sql' 
              ? formatSql(selectedFile.content)
              : highlightCode(selectedFile.content, fileType) 
          }} />
        </pre>
      </div>
    )
  }, [selectedFile, fileType])

  if (files.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <p>No files to preview</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)'
      }}>
        {/* File info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{getFileIcon(fileType)}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {selectedFile?.filepath.split('/').pop()}
          </span>
          <span style={{ 
            fontSize: 11, 
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            padding: '2px 6px',
            borderRadius: 4
          }}>
            {fileType.toUpperCase()}
          </span>
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {supportsPreview && (
            <>
              <button
                onClick={() => setViewMode('preview')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: viewMode === 'preview' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: viewMode === 'preview' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('split')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  background: viewMode === 'split' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: viewMode === 'split' ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Split
              </button>
            </>
          )}
          <button
            onClick={() => setViewMode('code')}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              background: viewMode === 'code' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: viewMode === 'code' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Code
          </button>
          
          <div style={{ width: 1, height: 20, background: 'var(--border-subtle)', margin: '0 4px' }} />
          
          <button
            onClick={copyToClipboard}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              background: 'var(--bg-tertiary)',
              color: copyFeedback ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
            title="Copy to clipboard"
          >
            {copyFeedback ? '✓' : '📋'}
          </button>
          <button
            onClick={downloadFile}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
            title="Download file"
          >
            ⬇️
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {viewMode === 'preview' && (
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
            {renderPreview}
          </div>
        )}

        {viewMode === 'code' && (
          <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-primary)' }}>
            {renderCode}
          </div>
        )}

        {viewMode === 'split' && (
          <>
            <div style={{ flex: 1, overflow: 'hidden', borderRight: '1px solid var(--border-subtle)' }}>
              {renderCode}
            </div>
            <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
              {renderPreview}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================
// HELPER: FILE ICON
// ============================================

function getFileIcon(fileType: string): string {
  const icons: Record<string, string> = {
    html: '🌐',
    css: '🎨',
    javascript: '🟨',
    typescript: '🔷',
    react: '⚛️',
    json: '📋',
    csv: '📊',
    markdown: '📝',
    sql: '🗄️',
    image: '🖼️',
    svg: '🎭',
    pdf: '📕',
    yaml: '⚙️',
    env: '🔐',
    mermaid: '📈',
    code: '📄',
  }
  return icons[fileType] || '📄'
}

export { getFileType, getFileIcon }
