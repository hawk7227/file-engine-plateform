'use client'

// =====================================================
// FILE ENGINE - PREVIEW PANEL
// Code Preview, Syntax Highlighting, Live Preview
// =====================================================

import { useState, useEffect } from 'react'
import {
  X,
  Code,
  Eye,
  Copy,
  Check,
  Download,
  Play,
  ExternalLink,
  FileCode,
  ChevronDown,
  Maximize2,
  Minimize2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Split
} from 'lucide-react'

interface GeneratedFile {
  path: string
  content: string
  language: string
  status: 'pending' | 'validated' | 'error'
  errors?: string[]
}

interface PreviewPanelProps {
  file: GeneratedFile | null
  onClose: () => void
}

export function PreviewPanel({ file, onClose }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    passed: boolean
    errors: string[]
    warnings: string[]
  } | null>(null)
  
  // Syntax highlighting simulation
  const highlightCode = (code: string, language: string) => {
    // Simple keyword highlighting
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'default', 'interface', 'type', 'class', 'extends', 'implements', 'async', 'await', 'try', 'catch', 'throw', 'new']
    const types = ['string', 'number', 'boolean', 'void', 'null', 'undefined', 'any', 'never', 'unknown', 'React', 'ReactNode', 'FC', 'Props']
    
    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Strings
    highlighted = highlighted.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="text-green-400">$&</span>')
    
    // Comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-zinc-500">$1</span>')
    highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500">$1</span>')
    
    // Keywords
    keywords.forEach(kw => {
      highlighted = highlighted.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="text-purple-400">$1</span>')
    })
    
    // Types
    types.forEach(t => {
      highlighted = highlighted.replace(new RegExp(`\\b(${t})\\b`, 'g'), '<span class="text-yellow-400">$1</span>')
    })
    
    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')
    
    // Functions
    highlighted = highlighted.replace(/\b(\w+)(?=\()/g, '<span class="text-blue-400">$1</span>')
    
    return highlighted
  }
  
  const handleCopy = async () => {
    if (!file) return
    await navigator.clipboard.writeText(file.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleDownload = () => {
    if (!file) return
    const blob = new Blob([file.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.path.split('/').pop() || 'file.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleValidate = async () => {
    if (!file) return
    setIsValidating(true)
    
    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setValidationResult({
      passed: Math.random() > 0.3,
      errors: Math.random() > 0.5 ? [] : ['Missing return type on function'],
      warnings: Math.random() > 0.5 ? [] : ['Consider using const instead of let']
    })
    
    setIsValidating(false)
  }
  
  if (!file) {
    return (
      <div className="w-[500px] bg-zinc-900 border-l border-zinc-800 flex flex-col items-center justify-center text-zinc-500">
        <FileCode className="w-12 h-12 mb-4 opacity-50" />
        <p>Select a file to preview</p>
      </div>
    )
  }
  
  const lines = file.content.split('\n')
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'w-[500px]'} bg-zinc-900 border-l border-zinc-800 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <FileCode className="w-5 h-5 text-zinc-400" />
          <div>
            <div className="font-medium text-sm">{file.path.split('/').pop()}</div>
            <div className="text-xs text-zinc-500">{file.path}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Status Badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            file.status === 'validated' ? 'bg-green-500/20 text-green-400' :
            file.status === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {file.status === 'validated' && <CheckCircle className="w-3 h-3" />}
            {file.status === 'error' && <AlertCircle className="w-3 h-3" />}
            {file.status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
            {file.status}
          </div>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-zinc-400" /> : <Maximize2 className="w-4 h-4 text-zinc-400" />}
          </button>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeTab === 'code' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          Code
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        
        <div className="flex-1" />
        
        {/* Actions */}
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Validate
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <Download className="w-3 h-3" />
          Download
        </button>
      </div>
      
      {/* Validation Results */}
      {validationResult && (
        <div className={`px-4 py-2 border-b border-zinc-800 ${
          validationResult.passed ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            {validationResult.passed ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">All checks passed!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400">{validationResult.errors.length} error(s) found</span>
              </>
            )}
          </div>
          {validationResult.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {validationResult.errors.map((error, i) => (
                <div key={i} className="text-xs text-red-400">• {error}</div>
              ))}
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {validationResult.warnings.map((warning, i) => (
                <div key={i} className="text-xs text-yellow-400"> {warning}</div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'code' ? (
          <div className="relative">
            {/* Line Numbers */}
            <div className="absolute left-0 top-0 w-12 bg-zinc-900 border-r border-zinc-800 text-right pr-3 py-4 select-none">
              {lines.map((_, i) => (
                <div key={i} className="text-xs text-zinc-600 leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            
            {/* Code */}
            <pre className="pl-16 pr-4 py-4 text-sm leading-6 overflow-x-auto">
              <code
                className="font-mono"
                dangerouslySetInnerHTML={{
                  __html: highlightCode(file.content, file.language)
                }}
              />
            </pre>
          </div>
        ) : (
          <LivePreview code={file.content} language={file.language} />
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>{file.language} · {lines.length} lines · {file.content.length} chars</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}

// Live Preview Component
function LivePreview({ code, language }: { code: string; language: string }) {
  const [error, setError] = useState<string | null>(null)
  
  // For React components, try to render a preview
  if (language === 'typescript' && code.includes('export')) {
    return (
      <div className="p-4">
        <div className="bg-zinc-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-zinc-500">Preview</span>
          </div>
          
          <div className="bg-white rounded-lg p-4 min-h-[200px]">
            {/* Simulated preview based on component type */}
            {code.includes('Button') && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Primary Button
                  </button>
                  <button className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600">
                    Secondary
                  </button>
                  <button className="px-4 py-2 border-2 border-zinc-600 text-zinc-700 rounded-lg hover:bg-zinc-100">
                    Outline
                  </button>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
                    Small
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                    Medium
                  </button>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg">
                    Large
                  </button>
                </div>
              </div>
            )}
            
            {code.includes('Form') && (
              <div className="max-w-sm space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Sign In
                </button>
              </div>
            )}
            
            {code.includes('ProductListing') && (
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                    <div className="w-full h-24 bg-gray-100 rounded-lg mb-3" />
                    <h3 className="font-semibold text-gray-800">Product {i}</h3>
                    <p className="text-gray-600">${(i * 29.99).toFixed(2)}</p>
                    <span className="text-sm text-gray-400">Electronics</span>
                  </div>
                ))}
              </div>
            )}
            
            {!code.includes('Button') && !code.includes('Form') && !code.includes('ProductListing') && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Component preview</p>
                  <p className="text-sm">Run the code to see live preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
            <Play className="w-4 h-4" />
            Run in Sandbox
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center h-full text-zinc-500">
      <div className="text-center">
        <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Preview not available for this file type</p>
      </div>
    </div>
  )
}

export default PreviewPanel
