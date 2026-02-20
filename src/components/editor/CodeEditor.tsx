// =====================================================
// FILE ENGINE - CodeEditor Component
// Displays code with syntax highlighting and editing
// =====================================================

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { getFileLanguage } from '@/lib/utils'

// =====================================================
// TYPES
// =====================================================

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: string
  filename?: string
  readOnly?: boolean
  showLineNumbers?: boolean
  className?: string
  minHeight?: string
  maxHeight?: string
}

// =====================================================
// ICONS
// =====================================================

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

// =====================================================
// SYNTAX HIGHLIGHTING (Simple)
// =====================================================

function highlightCode(code: string, language: string): string {
  // Simple keyword highlighting
  const keywords: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'interface', 'type', 'export', 'import', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'implements'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends'],
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'try', 'except', 'with', 'as', 'lambda', 'yield', 'raise', 'pass', 'break', 'continue'],
    html: [],
    css: [],
  }
  
  const langKeywords = keywords[language] || keywords.typescript || []
  
  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Strings
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="text-green-400">$&</span>')
    // Comments
    .replace(/(\/\/.*$)/gm, '<span class="text-gray-500">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-gray-500">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>')
  
  // Keywords
  for (const keyword of langKeywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
    highlighted = highlighted.replace(regex, '<span class="text-purple-400">$1</span>')
  }
  
  return highlighted
}

// =====================================================
// COMPONENT
// =====================================================

export default function CodeEditor({
  value,
  onChange,
  language,
  filename,
  readOnly = false,
  showLineNumbers = true,
  className,
  minHeight = '200px',
  maxHeight = '600px',
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  
  // Determine language
  const lang = language || (filename ? getFileLanguage(filename) : 'text')
  
  // Handle copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  // Handle download
  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `code.${lang}`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }, [onChange])
  
  // Sync scroll
  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop
      preRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])
  
  // Line count
  const lines = value.split('\n')
  const lineCount = lines.length
  
  // Highlighted code
  const highlightedCode = highlightCode(value, lang)
  
  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-gray-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {filename || lang}
          </span>
          <span className="text-xs text-gray-500">
            {lineCount} lines
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Copy code"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title="Download file"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>
      
      {/* Editor */}
      <div 
        className="relative overflow-auto"
        style={{ minHeight, maxHeight }}
      >
        <div className="flex">
          {/* Line numbers */}
          {showLineNumbers && (
            <div className="flex-shrink-0 py-4 px-3 text-right select-none bg-gray-800/50 border-r border-gray-700">
              {lines.map((_, i) => (
                <div 
                  key={i}
                  className="text-xs text-gray-500 leading-6 font-mono"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
          
          {/* Code area */}
          <div className="relative flex-1 min-w-0">
            {/* Syntax highlighted layer */}
            <pre
              ref={preRef}
              className="absolute inset-0 p-4 overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
              <code
                className="text-sm leading-6 font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedCode + (value.endsWith('\n') ? ' ' : '') }}
              />
            </pre>
            
            {/* Editable layer */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onScroll={handleScroll}
              readOnly={readOnly}
              spellCheck={false}
              className={cn(
                'relative w-full h-full p-4 bg-transparent text-transparent caret-white resize-none',
                'text-sm leading-6 font-mono',
                'focus:outline-none',
                readOnly && 'cursor-default'
              )}
              style={{ minHeight }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export { CodeEditor }
