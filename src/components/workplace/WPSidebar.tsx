'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ConversationMeta } from '@/hooks/useConversation'

// =====================================================
// WPSidebar — Claude-style collapsible navigation sidebar
//
// Sections:
// - New chat button
// - Navigation: Chats, Projects, Artifacts, Code
// - Recent conversations list (from useConversation)
// - User profile at bottom
// =====================================================

const CSS = `
.wp-sidebar{display:flex;flex-direction:column;width:260px;min-width:260px;height:100%;background:var(--wp-bg-1);border-right:1px solid var(--wp-border);transition:width .2s ease,min-width .2s ease,opacity .2s ease;overflow:hidden;position:relative;z-index:20}
.wp-sidebar.collapsed{width:0;min-width:0;opacity:0;border-right:none;pointer-events:none}
.wp-sidebar-inner{display:flex;flex-direction:column;width:260px;height:100%;overflow:hidden}

.wp-sb-top{padding:12px;display:flex;align-items:center;gap:8px}
.wp-sb-toggle{width:32px;height:32px;border-radius:8px;border:none;background:none;color:var(--wp-text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:background .15s}
.wp-sb-toggle:hover{background:var(--wp-bg-3);color:var(--wp-text-1)}
.wp-sb-new{flex:1;padding:8px 12px;border-radius:12px;border:1px solid var(--wp-border);background:none;color:var(--wp-text-2);font:12px/1 var(--wp-font);cursor:pointer;text-align:left;transition:all .15s;white-space:nowrap;overflow:hidden}
.wp-sb-new:hover{background:var(--wp-bg-3);color:var(--wp-text-1);border-color:var(--wp-text-4)}

.wp-sb-search{margin:0 12px 8px;position:relative}
.wp-sb-search input{width:100%;padding:7px 10px 7px 28px;border-radius:8px;border:1px solid var(--wp-border);background:var(--wp-bg-2);color:var(--wp-text-2);font:11px/1.4 var(--wp-font);outline:none;transition:border-color .15s}
.wp-sb-search input:focus{border-color:var(--wp-accent)}
.wp-sb-search input::placeholder{color:var(--wp-text-4)}
.wp-sb-search-icon{position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--wp-text-4);font-size:11px;pointer-events:none}

.wp-sb-nav{padding:4px 8px;display:flex;flex-direction:column;gap:1px}
.wp-sb-navbtn{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;border:none;background:none;color:var(--wp-text-3);font:11px/1.4 var(--wp-font);cursor:pointer;text-align:left;transition:all .15s;white-space:nowrap}
.wp-sb-navbtn:hover{background:var(--wp-bg-3);color:var(--wp-text-1)}
.wp-sb-navbtn.active{background:var(--wp-bg-3);color:var(--wp-text-1);font-weight:600}
.wp-sb-navicon{width:16px;text-align:center;flex-shrink:0;font-size:13px}

.wp-sb-divider{height:1px;background:var(--wp-border);margin:6px 12px}

.wp-sb-section-label{padding:6px 12px 4px;font:600 10px/1 var(--wp-font);color:var(--wp-text-4);text-transform:uppercase;letter-spacing:.04em}

.wp-sb-recents{flex:1;overflow-y:auto;padding:0 8px;display:flex;flex-direction:column;gap:1px}
.wp-sb-recents::-webkit-scrollbar{width:3px}
.wp-sb-recents::-webkit-scrollbar-thumb{background:var(--wp-border);border-radius:2px}
.wp-sb-chat{display:flex;align-items:center;gap:6px;padding:7px 8px;border-radius:8px;border:none;background:none;color:var(--wp-text-3);font:11px/1.3 var(--wp-font);cursor:pointer;text-align:left;width:100%;transition:all .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;position:relative}
.wp-sb-chat:hover{background:var(--wp-bg-3);color:var(--wp-text-1)}
.wp-sb-chat.active{background:var(--wp-bg-4);color:var(--wp-text-1);font-weight:500}
.wp-sb-chat-dot{width:6px;height:6px;border-radius:999px;background:var(--wp-accent);flex-shrink:0}
.wp-sb-chat-title{flex:1;overflow:hidden;text-overflow:ellipsis}
.wp-sb-chat-menu{opacity:0;padding:2px 4px;border-radius:4px;border:none;background:none;color:var(--wp-text-4);cursor:pointer;font-size:11px;flex-shrink:0;transition:opacity .15s}
.wp-sb-chat:hover .wp-sb-chat-menu{opacity:1}
.wp-sb-chat-menu:hover{color:var(--wp-text-1);background:var(--wp-bg-2)}

.wp-sb-dropdown{position:absolute;right:4px;top:100%;background:var(--wp-bg-2);border:1px solid var(--wp-border);border-radius:8px;padding:4px;z-index:30;min-width:120px;box-shadow:var(--wp-shadow-2)}
.wp-sb-dropdown button{display:block;width:100%;padding:6px 8px;border:none;background:none;color:var(--wp-text-2);font:11px/1.3 var(--wp-font);cursor:pointer;text-align:left;border-radius:4px;white-space:nowrap}
.wp-sb-dropdown button:hover{background:var(--wp-bg-3);color:var(--wp-text-1)}
.wp-sb-dropdown .danger{color:#ef4444}
.wp-sb-dropdown .danger:hover{background:rgba(239,68,68,.1)}

.wp-sb-profile{padding:12px;border-top:1px solid var(--wp-border);display:flex;align-items:center;gap:8px}
.wp-sb-avatar{width:28px;height:28px;border-radius:999px;background:var(--wp-accent);color:#fff;display:flex;align-items:center;justify-content:center;font:600 11px/1 var(--wp-font);flex-shrink:0}
.wp-sb-pname{font:500 11px/1.3 var(--wp-font);color:var(--wp-text-1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wp-sb-pplan{font:10px/1 var(--wp-font);color:var(--wp-text-4)}

.wp-sb-empty{padding:16px 12px;font:11px/1.5 var(--wp-font);color:var(--wp-text-4);text-align:center}

@media(max-width:1023px){
  .wp-sidebar{position:fixed;left:0;top:0;z-index:50;box-shadow:var(--wp-shadow-3)}
  .wp-sidebar.collapsed{transform:translateX(-100%)}
  .wp-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:49;opacity:1;transition:opacity .2s}
  .wp-sidebar-backdrop.hidden{opacity:0;pointer-events:none}
}
`

interface Props {
  collapsed: boolean
  onToggle: () => void
  recentChats: ConversationMeta[]
  activeChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onRenameChat: (id: string, title: string) => void
  onDeleteChat: (id: string) => void
  onArchiveChat: (id: string) => void
  onSearch: (query: string) => void
  activeNav: string
  onNavChange: (nav: string) => void
  userName: string
  userEmail: string
}

export function WPSidebar({
  collapsed,
  onToggle,
  recentChats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onArchiveChat,
  onSearch,
  activeNav,
  onNavChange,
  userName,
  userEmail,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    if (!menuOpenId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  // Focus rename input
  useEffect(() => {
    if (renameId && renameRef.current) renameRef.current.focus()
  }, [renameId])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    onSearch(q)
  }, [onSearch])

  const handleRenameSubmit = useCallback((id: string) => {
    if (renameValue.trim()) {
      onRenameChat(id, renameValue.trim())
    }
    setRenameId(null)
    setRenameValue('')
  }, [renameValue, onRenameChat])

  const filtered = searchQuery
    ? recentChats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : recentChats

  // Group by time
  const now = Date.now()
  const today = filtered.filter(c => now - new Date(c.updated_at).getTime() < 86400000)
  const week = filtered.filter(c => {
    const d = now - new Date(c.updated_at).getTime()
    return d >= 86400000 && d < 604800000
  })
  const older = filtered.filter(c => now - new Date(c.updated_at).getTime() >= 604800000)

  const initial = (userName || userEmail || 'U').charAt(0).toUpperCase()

  const NAV_ITEMS = [
    { id: 'chats', icon: '💬', label: 'Chats' },
    { id: 'projects', icon: '📁', label: 'Projects' },
    { id: 'artifacts', icon: '🧩', label: 'Artifacts' },
    { id: 'code', icon: '</>', label: 'Code' },
  ]

  const renderChat = (c: ConversationMeta) => (
    <div key={c.id} className={`wp-sb-chat${activeChatId === c.id ? ' active' : ''}`} style={{ position: 'relative' }}>
      <span className="wp-sb-chat-dot" />
      {renameId === c.id ? (
        <input
          ref={renameRef}
          className="wp-sb-chat-title"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
          onBlur={() => handleRenameSubmit(c.id)}
          onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(c.id); if (e.key === 'Escape') { setRenameId(null); setRenameValue('') } }}
          style={{ background: 'var(--wp-bg-2)', border: '1px solid var(--wp-accent)', borderRadius: 4, padding: '1px 4px', font: '11px/1.3 var(--wp-font)', color: 'var(--wp-text-1)', outline: 'none', width: '100%' }}
        />
      ) : (
        <span className="wp-sb-chat-title" onClick={() => onSelectChat(c.id)}>{c.title}</span>
      )}
      <button
        className="wp-sb-chat-menu"
        onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id) }}
      >⋯</button>
      {menuOpenId === c.id && (
        <div className="wp-sb-dropdown" ref={menuRef}>
          <button onClick={() => { setRenameId(c.id); setRenameValue(c.title); setMenuOpenId(null) }}>Rename</button>
          <button onClick={() => { onArchiveChat(c.id); setMenuOpenId(null) }}>Archive</button>
          <button className="danger" onClick={() => { onDeleteChat(c.id); setMenuOpenId(null) }}>Delete</button>
        </div>
      )}
    </div>
  )

  const renderSection = (label: string, chats: ConversationMeta[]) => {
    if (chats.length === 0) return null
    return (
      <>
        <div className="wp-sb-section-label">{label}</div>
        {chats.map(renderChat)}
      </>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={`wp-sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="wp-sidebar-inner">
          {/* Top: Toggle + New Chat */}
          <div className="wp-sb-top">
            <button className="wp-sb-toggle" onClick={onToggle} title="Collapse sidebar">☰</button>
            <button className="wp-sb-new" onClick={onNewChat}>+ New chat</button>
          </div>

          {/* Search */}
          <div className="wp-sb-search">
            <span className="wp-sb-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {/* Navigation */}
          <nav className="wp-sb-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`wp-sb-navbtn${activeNav === item.id ? ' active' : ''}`}
                onClick={() => onNavChange(item.id)}
              >
                <span className="wp-sb-navicon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="wp-sb-divider" />

          {/* Recent chats */}
          <div className="wp-sb-recents">
            {filtered.length === 0 ? (
              <div className="wp-sb-empty">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </div>
            ) : (
              <>
                {renderSection('Today', today)}
                {renderSection('This week', week)}
                {renderSection('Older', older)}
              </>
            )}
          </div>

          {/* User profile */}
          <div className="wp-sb-profile">
            <div className="wp-sb-avatar">{initial}</div>
            <div>
              <div className="wp-sb-pname">{userName || userEmail}</div>
              <div className="wp-sb-pplan">Pro plan</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
