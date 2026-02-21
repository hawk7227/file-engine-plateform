// =====================================================
// FILE ENGINE - ChatInput Component
// The main input where users type their prompts
// Supports text, attachments, and keyboard shortcuts
// =====================================================

'use client'
import { BRAND_NAME } from '@/lib/brand'

import { useState, useRef, useCallback, KeyboardEvent, ChangeEvent } from 'react'
import { Attachment } from '@/hooks/useChat'

// =====================================================
// TYPES
// =====================================================

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  onStop?: () => void
}

// =====================================================
// ICONS
// =====================================================

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
)

const AttachIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const FileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// =====================================================
// COMPONENT
// =====================================================

export default function ChatInput({
  onSend,
  isLoading = false,
  placeholder = "Ask ${BRAND_NAME} to build something...",
  disabled = false,
  onStop
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])
  
  // Handle input change
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustTextareaHeight()
  }
  
  // Handle send
  const handleSend = useCallback(() => {
    if ((!input.trim() && attachments.length === 0) || disabled) return
    
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined)
    setInput('')
    setAttachments([])
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, attachments, disabled, onSend])
  
  // Handle keyboard
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        handleSend()
      }
    }
  }
  
  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return
    
    const newAttachments: Attachment[] = []
    
    for (const file of Array.from(files)) {
      const id = `att_${Date.now()}_${Math.random().toString(36).slice(2)}`
      
      if (file.type.startsWith('image/')) {
        // Convert image to base64
        const base64 = await fileToBase64(file)
        newAttachments.push({
          id,
          type: 'image',
          content: base64,
          filename: file.name,
          mimeType: file.type,
          preview: base64
        })
      } else if (file.type === 'application/pdf') {
        const base64 = await fileToBase64(file)
        newAttachments.push({
          id,
          type: 'pdf',
          content: base64,
          filename: file.name,
          mimeType: file.type
        })
      } else {
        // Text files
        const text = await file.text()
        newAttachments.push({
          id,
          type: 'file',
          content: text,
          filename: file.name,
          mimeType: file.type
        })
      }
    }
    
    setAttachments(prev => [...prev, ...newAttachments])
  }, [])
  
  // File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }
  
  return (
    <div 
      className={`relative border rounded-xl bg-white dark:bg-gray-900 transition-all ${
        isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'
      } ${disabled ? 'opacity-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-gray-100 dark:border-gray-800">
          {attachments.map(att => (
            <div 
              key={att.id}
              className="relative flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              {att.type === 'image' ? (
                <>
                  <ImageIcon />
                  {att.preview && (
                    <img 
                      src={`data:${att.mimeType};base64,${att.preview}`}
                      alt={att.filename}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                </>
              ) : (
                <FileIcon />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[100px] truncate">
                {att.filename}
              </span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Attach files"
        >
          <AttachIcon />
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md,.js,.jsx,.ts,.tsx,.json,.html,.css"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-base leading-6 max-h-[200px]"
        />
        
        {/* Send/Stop button */}
        {isLoading ? (
          <button
            onClick={onStop}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            title="Stop generation"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && attachments.length === 0)}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
          >
            <SendIcon />
          </button>
        )}
      </div>
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-xl pointer-events-none">
          <p className="text-blue-500 font-medium">Drop files here</p>
        </div>
      )}
    </div>
  )
}
