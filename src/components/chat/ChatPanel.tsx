'use client'
import { BRAND_NAME } from '@/lib/brand'

// =====================================================
// FILE ENGINE - CHAT PANEL
// Messages, Input, File References
// =====================================================

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  Sparkles,
  Code,
  FileText,
  Image as ImageIcon,
  Link,
  Loader2,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileCode,
  Play,
  Eye,
  Download,
  MoreHorizontal,
  Zap,
  Bot,
  User
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  files?: GeneratedFile[]
  thinking?: string
  tokens?: { input: number; output: number }
  model?: string
}

interface GeneratedFile {
  path: string
  content: string
  language: string
  status: 'pending' | 'validated' | 'error'
  errors?: string[]
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface ChatPanelProps {
  chat: Chat
  isGenerating: boolean
  onSendMessage: (content: string) => void
  onFileSelect: (file: GeneratedFile) => void
}

export function ChatPanel({
  chat,
  isGenerating,
  onSendMessage,
  onFileSelect
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])
  
  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
    }
  }, [input])
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isGenerating) return
    
    onSendMessage(input.trim())
    setInput('')
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  const quickActions = [
    { icon: '', label: 'Explain this', prompt: 'Explain this code step by step' },
    { icon: '', label: 'Fix error', prompt: 'Fix this error' },
    { icon: '', label: 'Improve', prompt: 'Suggest improvements' },
    { icon: '', label: 'Add tests', prompt: 'Write tests for this' },
    { icon: '', label: 'Add docs', prompt: 'Add documentation' },
    { icon: '', label: 'Optimize', prompt: 'Optimize performance' }
  ]
  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {chat.messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              onFileSelect={onFileSelect}
              isLast={index === chat.messages.length - 1}
            />
          ))}
          
          {isGenerating && (
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{BRAND_NAME}</span>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-zinc-500">Generating...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Quick Actions */}
          {showQuickActions && (
            <div className="flex flex-wrap gap-2 mb-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.prompt)
                    setShowQuickActions(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm transition-colors"
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-zinc-800 rounded-xl border border-zinc-700 focus-within:border-zinc-600 p-2">
              {/* Attachments */}
              <div className="flex gap-1 pb-1">
                <button
                  type="button"
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5 text-zinc-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className={`p-2 rounded-lg transition-colors ${showQuickActions ? 'bg-zinc-700' : 'hover:bg-zinc-700'}`}
                  title="Quick actions"
                >
                  <Sparkles className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              
              {/* Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${BRAND_NAME} to build something...`}
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 resize-none focus:outline-none py-2 max-h-[200px]"
              />
              
              {/* Send */}
              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                className={`p-2 rounded-lg transition-colors ${
                  input.trim() && !isGenerating
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Hint */}
            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
              <span>claude-3-haiku · Pro Plan</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// MESSAGE BUBBLE
// =====================================================

function MessageBubble({
  message,
  onFileSelect,
  isLast
}: {
  message: Message
  onFileSelect: (file: GeneratedFile) => void
  isLast: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
  
  const isUser = message.role === 'user'
  
  const copyContent = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
          : 'bg-gradient-to-br from-purple-500 to-pink-500'
      }`}>
        {isUser ? (
          <span className="text-sm font-semibold text-white">M</span>
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>
      
      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="font-medium">{isUser ? 'You' : BRAND_NAME}</span>
          <span className="text-xs text-zinc-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.model && !isUser && (
            <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
              {message.model}
            </span>
          )}
        </div>
        
        {/* Thinking (if exists) */}
        {message.thinking && (
          <div className="mb-3">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400"
            >
              {showThinking ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Thinking...
            </button>
            {showThinking && (
              <div className="mt-2 p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-400 border-l-2 border-zinc-700">
                {message.thinking}
              </div>
            )}
          </div>
        )}
        
        {/* Message Content */}
        <div className={`prose prose-invert max-w-none ${isUser ? 'text-right' : ''}`}>
          {isUser ? (
            <div className="inline-block text-left bg-blue-600/20 px-4 py-2 rounded-2xl rounded-tr-sm">
              <p className="text-white whitespace-pre-wrap">{message.content}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {message.content.split('\n\n').map((paragraph, i) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return <h4 key={i} className="font-semibold text-white">{paragraph.slice(2, -2)}</h4>
                }
                if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
                  return (
                    <ul key={i} className="space-y-1">
                      {paragraph.split('\n').map((item, j) => (
                        <li key={j} className="text-zinc-300">{item.replace(/^[-\d.]\s*/, '')}</li>
                      ))}
                    </ul>
                  )
                }
                return <p key={i} className="text-zinc-300">{paragraph}</p>
              })}
            </div>
          )}
        </div>
        
        {/* Generated Files */}
        {message.files && message.files.length > 0 && (
          <div className="mt-4 space-y-2">
            {message.files.map((file, index) => (
              <FileCard
                key={index}
                file={file}
                onClick={() => onFileSelect(file)}
              />
            ))}
          </div>
        )}
        
        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={copyContent}
              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors">
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors">
              <ThumbsDown className="w-3 h-3" />
            </button>
            <button className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors">
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
            {message.tokens && (
              <span className="ml-auto text-xs text-zinc-600">
                {message.tokens.input + message.tokens.output} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// FILE CARD
// =====================================================

function FileCard({
  file,
  onClick
}: {
  file: GeneratedFile
  onClick: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  
  const languageIcons: Record<string, string> = {
    typescript: '',
    javascript: '',
    css: '',
    html: '',
    json: '',
    markdown: ''
  }
  
  const statusColors = {
    pending: 'border-yellow-500/30 bg-yellow-500/10',
    validated: 'border-green-500/30 bg-green-500/10',
    error: 'border-red-500/30 bg-red-500/10'
  }
  
  const statusIcons = {
    pending: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
    validated: <Check className="w-4 h-4 text-green-500" />,
    error: <span className="w-4 h-4 text-red-500">!</span>
  }
  
  const lines = file.content.split('\n').length
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group cursor-pointer rounded-lg border ${statusColors[file.status]} p-3 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-zinc-400" />
          <div>
            <div className="font-medium text-sm">{file.path}</div>
            <div className="text-xs text-zinc-500">
              {languageIcons[file.language] || ''} {file.language} · {lines} lines
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {statusIcons[file.status]}
          
          {isHovered && (
            <div className="flex gap-1">
              <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors">
                <Eye className="w-4 h-4 text-zinc-400" />
              </button>
              <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors">
                <Download className="w-4 h-4 text-zinc-400" />
              </button>
              <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors">
                <Play className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Code Preview */}
      <div className="mt-2 p-2 bg-zinc-900/50 rounded text-xs font-mono text-zinc-400 overflow-hidden">
        <pre className="line-clamp-3">
          {file.content.slice(0, 200)}
          {file.content.length > 200 && '...'}
        </pre>
      </div>
      
      {/* Errors */}
      {file.errors && file.errors.length > 0 && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          {file.errors.map((error, i) => (
            <div key={i}>• {error}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChatPanel
