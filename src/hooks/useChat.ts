// =====================================================
// FILE ENGINE - useChat Hook
// Powers the chat interface with agentic tool-use support
// Handles streaming text, tool calls, thinking, files
// =====================================================

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// =====================================================
// TYPES
// =====================================================

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  status?: 'sending' | 'streaming' | 'complete' | 'error'
  attachments?: Attachment[]
  files?: GeneratedFile[]
  toolCalls?: ToolCallEvent[]
  thinking?: string
}

export interface Attachment {
  id: string
  type: 'image' | 'pdf' | 'file' | 'url'
  content: string
  filename?: string
  mimeType?: string
  preview?: string
}

export interface GeneratedFile {
  path: string
  content: string
  language?: string
}

export interface ToolCallEvent {
  tool: string
  input: Record<string, any>
  success?: boolean
  result?: string
  timestamp: string
}

export interface ChatOptions {
  projectId?: string
  chatId?: string
  model?: string
  enableAgent?: boolean
  enableThinking?: boolean
  enableResearch?: boolean
  files?: Record<string, string>
  onMessage?: (message: Message) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  onToolCall?: (event: ToolCallEvent) => void
  onFilesUpdated?: (files: GeneratedFile[]) => void
  onThinking?: (text: string) => void
  onChatCreated?: (chatId: string, title?: string) => void
}

export interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>
  regenerate: (messageId: string) => Promise<void>
  clearMessages: () => void
  stopGeneration: () => void
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

// =====================================================
// HELPERS
// =====================================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function parseCodeBlocks(content: string): GeneratedFile[] {
  const files: GeneratedFile[] = []

  // Match: ```language:filepath\ncontent\n```
  const filePathRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g
  let match
  while ((match = filePathRegex.exec(content)) !== null) {
    const language = match[1] || 'text'
    const filepath = match[2]?.trim()
    const code = match[3]?.trim()
    if (code) {
      files.push({ path: filepath || `file.${language}`, content: code, language })
    }
  }

  // Fallback: ```language\n...\n``` or ```language // filename\n...\n```
  if (files.length === 0) {
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/\s*(.+?)\n)?([\s\S]*?)```/g
    let blockIndex = 0
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text'
      const filename = match[2]?.trim()
      const code = match[3]?.trim()
      if (code) {
        files.push({ path: filename || `file_${blockIndex}.${language}`, content: code, language })
        blockIndex++
      }
    }
  }

  return files
}

// =====================================================
// useChat HOOK
// =====================================================

export function useChat(options: ChatOptions = {}): UseChatReturn {
  const {
    projectId,
    model = 'fast',
    enableAgent = true,
    enableThinking = false,
    enableResearch = false,
    files: projectFiles,
    onMessage,
    onError,
    onComplete,
    onToolCall,
    onFilesUpdated,
    onThinking
  } = options

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentMessageRef = useRef<string>('')
  const currentThinkingRef = useRef<string>('')
  const currentToolCallsRef = useRef<ToolCallEvent[]>([])
  const agentFilesRef = useRef<GeneratedFile[]>([])
  const chatIdRef = useRef<string | undefined>(options.chatId)

  // Send a message
  const sendMessage = useCallback(async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return

    setIsLoading(true)
    setError(null)

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      status: 'complete',
      attachments
    }

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      status: 'streaming'
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    onMessage?.(userMessage)

    abortControllerRef.current = new AbortController()
    currentMessageRef.current = ''
    currentThinkingRef.current = ''
    currentToolCallsRef.current = []
    agentFilesRef.current = []

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }))

      const apiAttachments = attachments?.map(a => ({
        type: a.type,
        content: a.content,
        filename: a.filename,
        mimeType: a.mimeType
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          projectId,
          stream: true,
          attachments: apiAttachments,
          files: projectFiles || {},
          enableAgent,
          enableThinking,
          enableResearch
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)

            // ── Status events (instant response feedback) ──
            if (parsed.type === 'status') {
              // The assistant placeholder was already added — just ensure it's visible
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = { ...updated[last], status: 'streaming' }
                }
                return updated
              })
              continue
            }

            // ── Text content ──
            if (parsed.text && !parsed.type) {
              currentMessageRef.current += parsed.text
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = {
                    ...updated[last],
                    content: currentMessageRef.current,
                    thinking: currentThinkingRef.current || undefined,
                    toolCalls: currentToolCallsRef.current.length > 0 ? [...currentToolCallsRef.current] : undefined
                  }
                }
                return updated
              })
            }

            // ── Thinking ──
            if (parsed.type === 'thinking') {
              currentThinkingRef.current += parsed.text
              onThinking?.(currentThinkingRef.current)
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = {
                    ...updated[last],
                    thinking: currentThinkingRef.current
                  }
                }
                return updated
              })
            }

            // ── Tool call started ──
            if (parsed.type === 'tool_call') {
              const toolEvent: ToolCallEvent = {
                tool: parsed.tool,
                input: parsed.input || {},
                timestamp: new Date().toISOString()
              }
              currentToolCallsRef.current.push(toolEvent)
              onToolCall?.(toolEvent)
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = {
                    ...updated[last],
                    toolCalls: [...currentToolCallsRef.current]
                  }
                }
                return updated
              })
            }

            // ── Tool result ──
            if (parsed.type === 'tool_result') {
              // Update the last tool call with its result
              const calls = currentToolCallsRef.current
              for (let i = calls.length - 1; i >= 0; i--) {
                if (calls[i].tool === parsed.tool && calls[i].success === undefined) {
                  calls[i].success = parsed.success
                  calls[i].result = parsed.result
                  break
                }
              }
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = {
                    ...updated[last],
                    toolCalls: [...currentToolCallsRef.current]
                  }
                }
                return updated
              })
            }

            // ── Files updated (from agent tool use) ──
            if (parsed.type === 'files_updated') {
              agentFilesRef.current = parsed.files || []
              onFilesUpdated?.(agentFilesRef.current)
              // Also attach to the message
              setMessages(prev => {
                const updated = [...prev]
                const last = updated.length - 1
                if (updated[last]?.role === 'assistant') {
                  updated[last] = {
                    ...updated[last],
                    files: agentFilesRef.current
                  }
                }
                return updated
              })
            }

            // ── Error ──
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e // Re-throw real errors, skip parse errors
            }
          }
        }
      }

      // ── Finalize message ──
      const finalContent = currentMessageRef.current
      const finalThinking = currentThinkingRef.current
      const finalToolCalls = currentToolCallsRef.current

      // Use agent files if available, otherwise parse from content
      const finalFiles = agentFilesRef.current.length > 0
        ? agentFilesRef.current
        : parseCodeBlocks(finalContent)

      setMessages(prev => {
        const updated = [...prev]
        const last = updated.length - 1
        if (updated[last]?.role === 'assistant') {
          updated[last] = {
            ...updated[last],
            content: finalContent,
            status: 'complete',
            files: finalFiles.length > 0 ? finalFiles : undefined,
            thinking: finalThinking || undefined,
            toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined
          }
        }
        return updated
      })

      onComplete?.()

      // ── Auto-save chat to DB ──
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const allMessages = [...messages, userMessage, {
            ...assistantMessage,
            content: finalContent,
            status: 'complete' as const,
            files: finalFiles.length > 0 ? finalFiles : undefined,
            thinking: finalThinking || undefined,
            toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined
          }]

          if (chatIdRef.current) {
            // Update existing chat
            await supabase.from('chats').update({
              messages: allMessages,
              updated_at: new Date().toISOString()
            }).eq('id', chatIdRef.current)
          } else {
            // Create new chat
            const title = content.trim().split('\n')[0].slice(0, 40) || 'New Chat'
            const { data: newChat } = await supabase.from('chats').insert({
              user_id: user.id,
              project_id: projectId || null,
              title,
              messages: allMessages,
              updated_at: new Date().toISOString()
            }).select('id, title').single()

            if (newChat) {
              chatIdRef.current = newChat.id
              options.onChatCreated?.(newChat.id, newChat.title)
            }
          }
        }
      } catch (saveErr: any) {
        console.error('[useChat] Auto-save failed:', saveErr.message)
        // Non-fatal — chat still works, just not persisted
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated.length - 1
          if (updated[last]?.role === 'assistant') {
            updated[last] = {
              ...updated[last],
              content: currentMessageRef.current || 'Generation stopped.',
              status: 'complete'
            }
          }
          return updated
        })
      } else {
        console.error('[useChat] Error:', err)
        setError(err.message)
        onError?.(err)
        setMessages(prev => {
          const updated = [...prev]
          const last = updated.length - 1
          if (updated[last]?.role === 'assistant') {
            updated[last] = {
              ...updated[last],
              content: `Error: ${err.message}`,
              status: 'error'
            }
          }
          return updated
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, model, projectId, enableAgent, enableThinking, enableResearch, projectFiles, onMessage, onError, onComplete, onToolCall, onFilesUpdated, onThinking])

  // Regenerate a response
  const regenerate = useCallback(async (messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId)
    if (idx === -1) return

    let userIdx = idx - 1
    while (userIdx >= 0 && messages[userIdx].role !== 'user') userIdx--
    if (userIdx < 0) return

    const userMsg = messages[userIdx]
    setMessages(prev => prev.slice(0, idx))
    await sendMessage(userMsg.content, userMsg.attachments)
  }, [messages, sendMessage])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    chatIdRef.current = undefined
  }, [])

  // Stop ongoing generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    regenerate,
    clearMessages,
    stopGeneration,
    setMessages
  }
}

export default useChat
