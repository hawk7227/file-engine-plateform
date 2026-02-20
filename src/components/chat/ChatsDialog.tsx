import { useState, useEffect } from 'react'
import { X, Search, MessageSquare, Trash2, Clock, Calendar } from 'lucide-react'
import { useSavedChats, SavedChat } from '@/hooks/useSavedChats'

interface ChatsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectChat: (chat: SavedChat) => void
  projectId?: string
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export function ChatsDialog({ isOpen, onClose, onSelectChat, projectId }: ChatsDialogProps) {
  const { chats, loading, deleteChat, refresh } = useSavedChats(projectId)
  const [searchQuery, setSearchQuery] = useState('')

  // Refresh chats when dialog opens
  useEffect(() => {
    if (isOpen) {
      refresh()
    }
  }, [isOpen, refresh])

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    'Untitled Chat'.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            {projectId ? 'Project Chats' : 'All Saved Chats'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No chats found</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div 
                key={chat.id}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
                onClick={() => onSelectChat(chat)}
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
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {chat.messages?.length || 0} messages
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Are you sure you want to delete this chat?')) {
                      deleteChat(chat.id)
                    }
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
