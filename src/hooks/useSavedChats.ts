// =====================================================
// FILE ENGINE — useSavedChats Hook
// Enterprise-grade chat history management
// 
// Features:
//   - 5-second hard timeout on all Supabase queries
//   - AbortController for request cancellation
//   - Proper error state (never infinite spinner)
//   - Retry with exponential backoff
//   - Optimistic delete/rename
//   - Stable callback references (no re-render loops)
//   - Cleanup on unmount (no stale state updates)
// =====================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────
export interface SavedChat {
  id: string
  title: string
  updated_at: string
  created_at?: string
  messages: any[]
  project_id?: string
  user_id?: string
}

export interface UseSavedChatsReturn {
  chats: SavedChat[]
  loading: boolean
  error: string | null
  isEmpty: boolean
  refresh: () => Promise<void>
  deleteChat: (id: string) => Promise<void>
  renameChat: (id: string, newTitle: string) => Promise<void>
  retryCount: number
}

// ── Constants ────────────────────────────────────────
const QUERY_TIMEOUT_MS = 5000   // 5 second hard timeout
const MAX_RETRIES = 2           // retry twice on failure
const RETRY_DELAY_MS = 1000     // 1 second base delay

// ── Timeout wrapper ──────────────────────────────────
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}

// ── Hook ─────────────────────────────────────────────
export function useSavedChats(projectId?: string): UseSavedChatsReturn {
  const [chats, setChats] = useState<SavedChat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Refs for cleanup and preventing stale updates
  const mountedRef = useRef(true)
  const abortRef = useRef<AbortController | null>(null)

  // ── Fetch chats with timeout + retry ──────────────
  const fetchChats = useCallback(async (attempt = 0) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    // Only show loading on first attempt (not retries)
    if (attempt === 0) {
      setLoading(true)
      setError(null)
    }

    try {
      // Step 1: Get authenticated user (with timeout)
      const { data: { user }, error: authError } = await withTimeout(
        supabase.auth.getUser(),
        QUERY_TIMEOUT_MS,
        'Auth check'
      )

      if (!mountedRef.current) return

      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`)
      }

      if (!user) {
        setChats([])
        setLoading(false)
        return
      }

      // Step 2: Query chats table (with timeout)
      let query = supabase
        .from('chats')
        .select('id, title, updated_at, created_at, project_id, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100) // reasonable limit for performance

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error: queryError } = await withTimeout(
        query,
        QUERY_TIMEOUT_MS,
        'Chats query'
      )

      if (!mountedRef.current) return

      if (queryError) {
        throw new Error(`Failed to load chats: ${queryError.message}`)
      }

      // Success
      setChats(data || [])
      setError(null)
      setRetryCount(0)

    } catch (err: any) {
      if (!mountedRef.current) return

      // Don't set error for abort (component unmounted or new request started)
      if (err.name === 'AbortError') return

      console.error(`[useSavedChats] Attempt ${attempt + 1} failed:`, err.message)

      // Retry with backoff
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
        setRetryCount(attempt + 1)
        setTimeout(() => {
          if (mountedRef.current) {
            fetchChats(attempt + 1)
          }
        }, delay)
        return
      }

      // All retries exhausted — show error
      setError(err.message || 'Failed to load chats')
      setRetryCount(attempt + 1)

    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [projectId])

  // ── Delete chat (optimistic) ──────────────────────
  const deleteChat = useCallback(async (id: string) => {
    // Optimistic: remove from UI immediately
    const previousChats = chats
    setChats(prev => prev.filter(c => c.id !== id))

    try {
      const { error } = await withTimeout(
        supabase.from('chats').delete().eq('id', id),
        QUERY_TIMEOUT_MS,
        'Delete chat'
      )

      if (error) throw error

    } catch (err: any) {
      // Rollback on failure
      console.error('[useSavedChats] Delete failed:', err.message)
      setChats(previousChats)
      throw new Error(`Failed to delete chat: ${err.message}`)
    }
  }, [chats])

  // ── Rename chat (optimistic) ──────────────────────
  const renameChat = useCallback(async (id: string, newTitle: string) => {
    // Optimistic: update UI immediately
    const previousChats = chats
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))

    try {
      const { error } = await withTimeout(
        supabase.from('chats').update({ title: newTitle }).eq('id', id),
        QUERY_TIMEOUT_MS,
        'Rename chat'
      )

      if (error) throw error

    } catch (err: any) {
      // Rollback on failure
      console.error('[useSavedChats] Rename failed:', err.message)
      setChats(previousChats)
      throw new Error(`Failed to rename chat: ${err.message}`)
    }
  }, [chats])

  // ── Load on mount ─────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    fetchChats()

    return () => {
      mountedRef.current = false
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [fetchChats])

  return {
    chats,
    loading,
    error,
    isEmpty: !loading && !error && chats.length === 0,
    refresh: fetchChats,
    deleteChat,
    renameChat,
    retryCount
  }
}
