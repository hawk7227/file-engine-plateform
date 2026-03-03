'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// useConversation — Conversation persistence hook
//
// Manages creating, loading, saving conversations and messages.
// Wires into useChat for automatic persistence.
// =====================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface ConversationMeta {
  id: string
  title: string
  model: string
  project_id: string | null
  settings_json: Record<string, unknown>
  archived: boolean
  pinned: boolean
  created_at: string
  updated_at: string
}

export interface PersistedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files_json: unknown[] | null
  tool_calls_json: unknown[] | null
  attachments_json: unknown[] | null
  thinking: string | null
  tokens_used: number | null
  model: string | null
  status: string
  sort_order: number
  created_at: string
}

interface UseConversationReturn {
  conversationId: string | null
  conversation: ConversationMeta | null
  recentChats: ConversationMeta[]
  isLoading: boolean
  error: string | null

  // Actions
  createConversation: (opts?: { project_id?: string; model?: string; title?: string }) => Promise<string>
  loadConversation: (id: string) => Promise<PersistedMessage[]>
  saveUserMessage: (content: string, attachments?: unknown[]) => Promise<string | null>
  saveAssistantMessage: (content: string, opts?: {
    files_json?: unknown[]
    tool_calls_json?: unknown[]
    thinking?: string
    tokens_used?: number
    model?: string
  }) => Promise<string | null>
  updateMessage: (messageId: string, updates: Record<string, unknown>) => Promise<void>
  deleteMessage: (messageId: string, cascade?: boolean) => Promise<void>
  renameConversation: (title: string) => Promise<void>
  deleteConversation: () => Promise<void>
  archiveConversation: () => Promise<void>
  generateTitle: (userMsg: string, assistantMsg: string) => Promise<string>
  loadRecentChats: (opts?: { limit?: number; search?: string }) => Promise<void>
  searchConversations: (query: string) => Promise<{ conversation_id: string; snippet: string }[]>
}

export function useConversation(initialChatId?: string): UseConversationReturn {
  const [conversationId, setConversationId] = useState<string | null>(initialChatId || null)
  const [conversation, setConversation] = useState<ConversationMeta | null>(null)
  const [recentChats, setRecentChats] = useState<ConversationMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleGenerated = useRef(false)

  // Get auth headers
  const getHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }
      }
    } catch { /* non-fatal */ }
    return { 'Content-Type': 'application/json' }
  }, [])

  // Create a new conversation
  const createConversation = useCallback(async (opts?: { project_id?: string; model?: string; title?: string }): Promise<string> => {
    const headers = await getHeaders()
    const resp = await fetch('/api/conversations', {
      method: 'POST',
      headers,
      body: JSON.stringify(opts || {}),
    })
    if (!resp.ok) throw new Error('Failed to create conversation')
    const data = await resp.json()
    setConversationId(data.id)
    setConversation(data)
    titleGenerated.current = false

    // Update URL without full page reload
    const url = new URL(window.location.href)
    url.searchParams.set('chat', data.id)
    window.history.replaceState({}, '', url.toString())

    return data.id
  }, [getHeaders])

  // Load a conversation and its messages
  const loadConversation = useCallback(async (id: string): Promise<PersistedMessage[]> => {
    setIsLoading(true)
    setError(null)
    try {
      const headers = await getHeaders()

      // Fetch conversation metadata
      const convResp = await fetch(`/api/conversations/${id}`, { headers })
      if (!convResp.ok) {
        if (convResp.status === 404) {
          setError('Conversation not found')
          return []
        }
        throw new Error('Failed to load conversation')
      }
      const convData = await convResp.json()
      setConversation(convData)
      setConversationId(id)
      titleGenerated.current = convData.title !== 'New chat'

      // Fetch messages
      const msgResp = await fetch(`/api/conversations/${id}/messages?limit=200&sort=asc`, { headers })
      if (!msgResp.ok) throw new Error('Failed to load messages')
      const msgData = await msgResp.json()

      return msgData.messages || []
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      return []
    } finally {
      setIsLoading(false)
    }
  }, [getHeaders])

  // Save a user message
  const saveUserMessage = useCallback(async (content: string, attachments?: unknown[]): Promise<string | null> => {
    if (!conversationId) return null
    try {
      const headers = await getHeaders()
      const resp = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          role: 'user',
          content,
          attachments_json: attachments || null,
        }),
      })
      if (!resp.ok) return null
      const data = await resp.json()
      return data.id
    } catch {
      return null
    }
  }, [conversationId, getHeaders])

  // Save an assistant message
  const saveAssistantMessage = useCallback(async (content: string, opts?: {
    files_json?: unknown[]
    tool_calls_json?: unknown[]
    thinking?: string
    tokens_used?: number
    model?: string
  }): Promise<string | null> => {
    if (!conversationId) return null
    try {
      const headers = await getHeaders()
      const resp = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          role: 'assistant',
          content,
          files_json: opts?.files_json || null,
          tool_calls_json: opts?.tool_calls_json || null,
          thinking: opts?.thinking || null,
          tokens_used: opts?.tokens_used || null,
          model: opts?.model || null,
        }),
      })
      if (!resp.ok) return null
      const data = await resp.json()
      return data.id
    } catch {
      return null
    }
  }, [conversationId, getHeaders])

  // Update a message
  const updateMessage = useCallback(async (messageId: string, updates: Record<string, unknown>): Promise<void> => {
    if (!conversationId) return
    const headers = await getHeaders()
    await fetch(`/api/conversations/${conversationId}/messages/${messageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    })
  }, [conversationId, getHeaders])

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string, cascade = false): Promise<void> => {
    if (!conversationId) return
    const headers = await getHeaders()
    await fetch(`/api/conversations/${conversationId}/messages/${messageId}?cascade=${cascade}`, {
      method: 'DELETE',
      headers,
    })
  }, [conversationId, getHeaders])

  // Rename conversation
  const renameConversation = useCallback(async (title: string): Promise<void> => {
    if (!conversationId) return
    const headers = await getHeaders()
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ title }),
    })
    setConversation(prev => prev ? { ...prev, title } : prev)
  }, [conversationId, getHeaders])

  // Delete conversation
  const deleteConversation = useCallback(async (): Promise<void> => {
    if (!conversationId) return
    const headers = await getHeaders()
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE', headers })
    setConversationId(null)
    setConversation(null)

    // Clear URL
    const url = new URL(window.location.href)
    url.searchParams.delete('chat')
    window.history.replaceState({}, '', url.toString())
  }, [conversationId, getHeaders])

  // Archive conversation
  const archiveConversation = useCallback(async (): Promise<void> => {
    if (!conversationId) return
    const headers = await getHeaders()
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ archived: true }),
    })
    setConversation(prev => prev ? { ...prev, archived: true } : prev)
  }, [conversationId, getHeaders])

  // Generate title from first exchange
  const generateTitle = useCallback(async (userMsg: string, assistantMsg: string): Promise<string> => {
    if (!conversationId || titleGenerated.current) return conversation?.title || 'New chat'
    titleGenerated.current = true
    try {
      const headers = await getHeaders()
      const resp = await fetch(`/api/conversations/${conversationId}/title`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_message: userMsg, assistant_message: assistantMsg }),
      })
      if (!resp.ok) return 'New chat'
      const data = await resp.json()
      setConversation(prev => prev ? { ...prev, title: data.title } : prev)
      return data.title
    } catch {
      return 'New chat'
    }
  }, [conversationId, conversation?.title, getHeaders])

  // Load recent chats for sidebar
  const loadRecentChats = useCallback(async (opts?: { limit?: number; search?: string }): Promise<void> => {
    try {
      const headers = await getHeaders()
      const params = new URLSearchParams()
      params.set('limit', String(opts?.limit || 50))
      if (opts?.search) params.set('search', opts.search)
      const resp = await fetch(`/api/conversations?${params}`, { headers })
      if (!resp.ok) return
      const data = await resp.json()
      setRecentChats(data.conversations || [])
    } catch { /* non-fatal */ }
  }, [getHeaders])

  // Search conversations
  const searchConversations = useCallback(async (query: string): Promise<{ conversation_id: string; snippet: string }[]> => {
    try {
      const headers = await getHeaders()
      const resp = await fetch(`/api/conversations/search?q=${encodeURIComponent(query)}`, { headers })
      if (!resp.ok) return []
      const data = await resp.json()
      return data.results || []
    } catch {
      return []
    }
  }, [getHeaders])

  // Load conversation from URL on mount
  useEffect(() => {
    if (initialChatId && !conversation) {
      loadConversation(initialChatId)
    }
  }, [initialChatId, conversation, loadConversation])

  return {
    conversationId,
    conversation,
    recentChats,
    isLoading,
    error,
    createConversation,
    loadConversation,
    saveUserMessage,
    saveAssistantMessage,
    updateMessage,
    deleteMessage,
    renameConversation,
    deleteConversation,
    archiveConversation,
    generateTitle,
    loadRecentChats,
    searchConversations,
  }
}
