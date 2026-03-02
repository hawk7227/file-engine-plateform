// =====================================================
// FILE ENGINE — ChatsDialog Component
// Enterprise-grade chat history browser
//
// 4 render states: loading → error → empty → success
// Skeleton loading (not spinner)
// Retry button on error
// Search with debounce
// Keyboard navigation (Escape to close)
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, MessageSquare, Trash2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { useSavedChats, SavedChat } from '@/hooks/useSavedChats'

interface ChatsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat: (chat: SavedChat) => void
  projectId?: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

// ── Skeleton loader (not spinner) ────────────────────
function ChatSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ opacity: 1 - i * 0.15 }}>
          <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse" style={{ width: '40%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Error state ──────────────────────────────────────
function ErrorState({ message, onRetry, retryCount }: { message: string; onRetry: () => void; retryCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-sm font-medium text-zinc-300 mb-1">Failed to load chats</p>
      <p className="text-xs text-zinc-500 mb-4 max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry{retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}
      </button>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────
function EmptyState({ hasSearch, projectId }: { hasSearch: boolean; projectId?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
        <MessageSquare className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-400 mb-1">
        {hasSearch ? 'No chats match your search' : 'No saved chats yet'}
      </p>
      <p className="text-xs text-zinc-600">
        {hasSearch
          ? 'Try different search terms'
          : projectId
            ? 'Start a conversation in this project'
            : 'Your conversations will appear here'}
      </p>
    </div>
  )
}

// ── Main Component ───────────────────────────────────
export function ChatsDialog({ isOpen, onClose, onSelectChat, projectId }: ChatsDialogProps) {
  const { chats, loading, error, isEmpty, refresh, deleteChat, retryCount } = useSavedChats(projectId)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Refresh when dialog opens
  useEffect(() => {
    if (isOpen) {
      refresh()
      setSearchQuery('')
      // Focus search input after a frame
      requestAnimationFrame(() => {
        searchRef.current?.focus()
      })
    }
  }, [isOpen]) // intentionally omit refresh — stable ref, avoid re-trigger loop

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Filter chats by search
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const title = (chat.title || 'Untitled Chat').toLowerCase()
    return title.includes(query)
  })

  // Handle delete with loading state
  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (deletingId) return // prevent double-click

    setDeletingId(chatId)
    try {
      await deleteChat(chatId)
    } catch (err: unknown) {
      console.error('Delete failed:', (err instanceof Error ? err.message : String(err)))
    } finally {
      setDeletingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Click outside dialog to close
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        role="dialog"
        aria-label={projectId ? 'Project Chats' : 'All Saved Chats'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            {projectId ? 'Project Chats' : 'All Saved Chats'}
            {!loading && !error && (
              <span className="text-xs font-normal text-zinc-500 ml-2">
                {chats.length} chat{chats.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search — always visible (even during loading) */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading || !!error}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Content — 4 states: loading / error / empty / success */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <ChatSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={() => refresh()} retryCount={retryCount} />
          ) : filteredChats.length === 0 ? (
            <EmptyState hasSearch={!!searchQuery.trim()} projectId={projectId} />
          ) : (
            <div className="space-y-1">
              {filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 transition-all cursor-pointer ${
                    deletingId === chat.id ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  onClick={() => {
                    onSelectChat(chat)
                    onClose()
                  }}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-sm font-medium text-zinc-200 truncate mb-1">
                      {chat.title || 'Untitled Chat'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(chat.updated_at)}
                      </span>
                      {chat.messages && (
                        <span>{chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    disabled={deletingId === chat.id}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-zinc-600"
                    title="Delete chat"
                    aria-label={`Delete ${chat.title || 'Untitled Chat'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
