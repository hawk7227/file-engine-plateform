// =====================================================
// FILE ENGINE - ChatMessage Component
// Displays individual chat messages with code blocks,
// file previews, copy buttons, etc.
// =====================================================

'use client'
import { BRAND_NAME } from '@/lib/brand'

import { useState, useMemo } from 'react'
import { Message, GeneratedFile, ToolCallEvent } from '@/hooks/useChat'

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
// WHITE-LABEL TOOL NAMES (hide real tool/API names)
// =====================================================

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  // File operations
  'create_file': { label: 'Creating file', icon: '' },
  'edit_file': { label: 'Editing file', icon: '' },
  'write_file': { label: 'Writing file', icon: '' },
  'read_file': { label: 'Reading file', icon: '' },
  'view_file': { label: 'Reading file', icon: '' },
  'delete_file': { label: 'Removing file', icon: '' },
  // Code operations
  'execute_code': { label: 'Running code', icon: '' },
  'run_command': { label: 'Running command', icon: '' },
  'bash': { label: 'Running command', icon: '' },
  'terminal': { label: 'Running command', icon: '' },
  // Search/research
  'web_search': { label: 'Searching the web', icon: '' },
  'search': { label: 'Searching', icon: '' },
  'fetch_url': { label: 'Fetching resource', icon: '' },
  // Analysis
  'analyze_image': { label: 'Analyzing image', icon: '' },
  'vision': { label: 'Analyzing image', icon: '' },
  // Deploy
  'deploy': { label: 'Deploying', icon: '' },
  'build': { label: 'Building project', icon: '' },
}

const PHASE_LABELS: Record<string, { label: string; icon: string }> = {
  'thinking': { label: 'Thinking...', icon: '' },
  'planning': { label: 'Planning approach...', icon: '' },
  'searching': { label: 'Searching...', icon: '' },
  'creating': { label: 'Writing code...', icon: '' },
  'editing': { label: 'Editing code...', icon: '' },
  'analyzing': { label: 'Analyzing...', icon: '' },
  'running': { label: 'Running...', icon: '' },
}

function getToolLabel(toolName: string): { label: string; icon: string } {
  return TOOL_LABELS[toolName] || { label: `Processing`, icon: '' }
}

function getPhaseLabel(phase: string): { label: string; icon: string } {
  return PHASE_LABELS[phase] || { label: 'Working...', icon: '' }
}

// =====================================================
// ACTIVITY LOG COMPONENT  
// =====================================================

interface ActivityLogProps {
  toolCalls: ToolCallEvent[]
  isStreaming: boolean
  statusPhase?: string
  statusMessage?: string
}

function ActivityLog({ toolCalls, isStreaming, statusPhase, statusMessage }: ActivityLogProps) {
  const [expanded, setExpanded] = useState(false)
  
  // Count completed vs total
  const completed = toolCalls.filter(tc => tc.success !== undefined).length
  const total = toolCalls.length
  const hasActivity = total > 0 || (isStreaming && statusPhase)
  
  if (!hasActivity) return null

  // Build summary text
  const summaryParts: string[] = []
  const uniqueTools = new Set(toolCalls.map(tc => getToolLabel(tc.tool).label))
  uniqueTools.forEach(t => summaryParts.push(t))
  
  const summaryText = isStreaming 
    ? (statusPhase ? getPhaseLabel(statusPhase).label : 'Working...')
    : `Ran ${total} action${total !== 1 ? 's' : ''}`

  return (
    <div className="my-2">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all
          bg-gray-100/60 dark:bg-white/[0.04] hover:bg-gray-200/60 dark:hover:bg-white/[0.07]
          text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300
          border border-transparent hover:border-gray-200 dark:hover:border-white/[0.06]"
      >
        {/* Spinner or check */}
        {isStreaming ? (
          <span className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 dark:border-gray-600/30 dark:border-t-gray-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        
        <span>{summaryText}</span>
        
        {total > 0 && !isStreaming && (
          <span className="text-gray-400 dark:text-gray-500">
            ({completed}/{total})
          </span>
        )}

        {/* Expand chevron */}
        <svg 
          className={`w-3 h-3 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && toolCalls.length > 0 && (
        <div className="mt-1 ml-1 pl-3 border-l-2 border-gray-200 dark:border-white/[0.06] space-y-1">
          {toolCalls.map((tc, i) => {
            const { label, icon } = getToolLabel(tc.tool)
            const isComplete = tc.success !== undefined
            const isFailed = tc.success === false
            
            // Extract filename from input if available
            const detail = tc.input?.path || tc.input?.filepath || tc.input?.filename || tc.input?.query || ''
            const shortDetail = detail.length > 40 ? '...' + detail.slice(-37) : detail

            return (
              <div key={i} className="flex items-center gap-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                {/* Status icon */}
                {!isComplete ? (
                  <span className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 dark:border-gray-600/30 dark:border-t-gray-400 rounded-full animate-spin flex-shrink-0" />
                ) : isFailed ? (
                  <svg className="w-3 h-3 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                
                <span>{icon}</span>
                <span>{label}</span>
                {shortDetail && (
                  <span className="text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">
                    {shortDetail}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =====================================================
// CODE STREAM PREVIEW — shows code being written
// =====================================================

function CodeStreamPreview({ content }: { content: string }) {
  // Extract the last few lines of code being streamed
  const codeMatch = content.match(/```\w*[^\n]*\n([\s\S]*)$/)
  if (!codeMatch) return null
  
  const codeLines = codeMatch[1].split('\n')
  const lastLines = codeLines.slice(-6) // Show last 6 lines
  
  if (lastLines.join('').trim().length === 0) return null
  
  return (
    <div className="relative my-2 rounded-lg overflow-hidden" style={{ maxHeight: '96px' }}>
      {/* Fade gradient at top */}
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-gray-900 to-transparent z-10 pointer-events-none" />
      {/* Fade gradient at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-gray-900 to-transparent z-10 pointer-events-none" />
      
      <pre className="px-4 py-3 bg-gray-900 dark:bg-gray-950 text-gray-300 text-xs font-mono overflow-hidden leading-4">
        {lastLines.map((line, i) => (
          <div 
            key={i} 
            className="truncate"
            style={{ opacity: 0.3 + (i / lastLines.length) * 0.7 }}
          >
            {line || ' '}
          </div>
        ))}
        <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />
      </pre>
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ChatMessage({ message, onRegenerate, onCopy }: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false)
  
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  
  // Check if currently streaming inside a code block (incomplete code block)
  const isStreamingCode = isStreaming && message.content && 
    (message.content.match(/```/g) || []).length % 2 !== 0
  
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
              {isUser ? 'You' : BRAND_NAME}
            </p>

            {/* Activity Log — tool calls and status phases */}
            {!isUser && (message.toolCalls?.length || (isStreaming && message.statusPhase)) && (
              <ActivityLog 
                toolCalls={message.toolCalls || []} 
                isStreaming={isStreaming}
                statusPhase={message.statusPhase}
                statusMessage={message.statusMessage}
              />
            )}
            
            {/* Message content */}
            <div className={`prose dark:prose-invert max-w-none ${
              isError ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {renderedContent}
              
              {/* Code stream preview — shows live code being written */}
              {isStreamingCode && (
                <CodeStreamPreview content={message.content} />
              )}
              
              {/* Streaming cursor (only when NOT in code stream) */}
              {isStreaming && !isStreamingCode && (
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
