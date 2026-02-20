// =====================================================
// FILE ENGINE - ChatMessage Component
// Displays individual chat messages with code blocks,
// file previews, copy buttons, etc.
// =====================================================

'use client'

import { useState, useMemo } from 'react'
import { Message, GeneratedFile } from '@/hooks/useChat'

// =====================================================
// TYPES
// =====================================================

interface ChatMessageProps {
  message: Message
  onRegenerate?: () => void
  onCopy?: (content: string) => void
}

// =====================================================
// ICONS
// =====================================================

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const BotIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

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

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

// =====================================================
// CODE BLOCK COMPONENT
// =====================================================

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

function CodeBlock({ code, language = 'text', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="relative my-4 rounded-lg overflow-hidden bg-gray-900 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <span className="text-sm text-gray-400">
          {filename || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Code */}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className={`language-${language} text-gray-100`}>
          {code}
        </code>
      </pre>
    </div>
  )
}

// =====================================================
// MESSAGE CONTENT RENDERER
// =====================================================

function renderContent(content: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?)\n)?([\s\S]*?)```/g
  
  let lastIndex = 0
  let match
  let key = 0
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index)
      elements.push(
        <span key={key++} className="whitespace-pre-wrap">
          {formatText(text)}
        </span>
      )
    }
    
    // Add code block
    const language = match[1] || 'text'
    const filename = match[2]?.trim()
    const code = match[3]?.trim()
    
    elements.push(
      <CodeBlock 
        key={key++} 
        code={code} 
        language={language}
        filename={filename}
      />
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    elements.push(
      <span key={key++} className="whitespace-pre-wrap">
        {formatText(text)}
      </span>
    )
  }
  
  return elements
}

// Format text with inline code and links
function formatText(text: string): React.ReactNode {
  // Handle inline code
  const parts = text.split(/(`[^`]+`)/g)
  
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code 
          key={i}
          className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    
    // Handle links
    const linkRegex = /(https?:\/\/[^\s]+)/g
    const linkParts = part.split(linkRegex)
    
    return linkParts.map((linkPart, j) => {
      if (linkPart.match(linkRegex)) {
        return (
          <a 
            key={`${i}-${j}`}
            href={linkPart}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {linkPart}
          </a>
        )
      }
      return linkPart
    })
  })
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ChatMessage({ message, onRegenerate, onCopy }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  
  // Parse content
  const renderedContent = useMemo(() => {
    if (!message.content) return null
    return renderContent(message.content)
  }, [message.content])
  
  return (
    <div 
      className={`group py-6 ${isUser ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
          }`}>
            {isUser ? <UserIcon /> : <BotIcon />}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <p className="font-medium text-gray-900 dark:text-white mb-1">
              {isUser ? 'You' : 'File Engine'}
            </p>
            
            {/* Message content */}
            <div className={`prose dark:prose-invert max-w-none ${
              isError ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {renderedContent}
              
              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
              )}
            </div>
            
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {message.attachments.map(att => (
                  <div 
                    key={att.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    {att.type === 'image' && att.preview && (
                      <img 
                        src={`data:${att.mimeType};base64,${att.preview}`}
                        alt={att.filename}
                        className="w-6 h-6 object-cover rounded"
                      />
                    )}
                    <span className="text-gray-600 dark:text-gray-400">
                      {att.filename}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Generated files */}
            {message.files && message.files.length > 0 && (
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generated Files ({message.files.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {message.files.map((file, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400"
                    >
                      {file.path}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Actions */}
          {!isUser && !isStreaming && showActions && (
            <div className="flex-shrink-0 flex gap-1">
              <button
                onClick={() => onCopy?.(message.content)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Copy message"
              >
                <CopyIcon />
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Regenerate"
                >
                  <RefreshIcon />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
