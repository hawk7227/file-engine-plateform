'use client'
import { BRAND_NAME } from '@/lib/brand'

// =====================================================
// FILE ENGINE - SIDEBAR (Claude/ChatGPT Style)
// Complete navigation with all features
// =====================================================

import { useState } from 'react'
import {
  Plus,
  Search,
  MessageSquare,
  FolderOpen,
  Box,
  Code,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  HelpCircle,
  Globe,
  CreditCard,
  User,
  Sparkles
} from 'lucide-react'
import { ChatsDialog } from '@/components/chat/ChatsDialog'

interface Project {
  id: string
  name: string
  type?: string
}

interface Chat {
  id: string
  title: string
  updatedAt: string
  projectId?: string
}

interface SidebarProps {
  isOpen: boolean
  projects: Project[]
  currentProject: Project | null
  chats: Chat[]
  currentChat: Chat | null
  user: { name: string; email: string; plan: string } | null
  onSelectProject: (project: Project) => void
  onSelectChat: (chat: Chat) => void
  onNewChat: () => void
  onNewProject: () => void
  onToggle: () => void
  onOpenSettings: () => void
  onLogout: () => void
}

export function Sidebar({
  isOpen,
  projects,
  currentProject,
  chats,
  currentChat,
  user,
  onSelectProject,
  onSelectChat,
  onNewChat,
  onNewProject,
  onToggle,
  onOpenSettings,
  onLogout
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChatsDialog, setShowChatsDialog] = useState(false)
  
  // Filter chats
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  // Group chats by date
  const todayChats = filteredChats.filter(c => isToday(new Date(c.updatedAt)))
  const yesterdayChats = filteredChats.filter(c => isYesterday(new Date(c.updatedAt)))
  const olderChats = filteredChats.filter(c => 
    !isToday(new Date(c.updatedAt)) && !isYesterday(new Date(c.updatedAt))
  )

  // Collapsed sidebar
  if (!isOpen) {
    return (
      <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-2">
        <button onClick={onToggle} className="p-2 hover:bg-zinc-800 rounded-lg">
          <PanelLeft className="w-5 h-5 text-zinc-400" />
        </button>
        <button onClick={onNewChat} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <button onClick={onOpenSettings} className="p-2 hover:bg-zinc-800 rounded-lg">
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    )
  }
  
  return (
    <>
      <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
        {/* Header with Logo */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">{BRAND_NAME}</span>
            </div>
            <button onClick={onToggle} className="p-1.5 hover:bg-zinc-800 rounded-lg">
              <PanelLeftClose className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
        
        {/* Main Navigation */}
        <div className="p-3 space-y-1">
          <NavItem icon={<Plus className="w-4 h-4" />} label="New chat" onClick={onNewChat} />
          <NavItem icon={<Search className="w-4 h-4" />} label="Search" onClick={() => {}} />
          <NavItem 
            icon={<MessageSquare className="w-4 h-4" />} 
            label="Chats" 
            onClick={() => setShowChatsDialog(true)} 
            active={showChatsDialog}
          />
          <NavItem icon={<FolderOpen className="w-4 h-4" />} label="Projects" onClick={() => {}} />
          <NavItem icon={<Box className="w-4 h-4" />} label="Artifacts" onClick={() => {}} />
          <NavItem icon={<Code className="w-4 h-4" />} label="Code" onClick={() => {}} />
        </div>
        
        {/* Projects Section */}
        <div className="px-3 py-2">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide hover:text-zinc-300"
          >
            {projectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Projects
          </button>
          
          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={onNewProject}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                New project
              </button>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={`w-full flex items-center gap-2 px-2 py-2 text-sm rounded-lg text-left ${
                    currentProject?.id === project.id
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="truncate">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Recents Section */}
        <div className="flex-1 overflow-y-auto px-3">
          <div className="py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide px-2">
            Recents
          </div>
          
          {/* Today */}
          {todayChats.length > 0 && (
            <ChatGroup
              label="Today"
              chats={todayChats}
              currentChatId={currentChat?.id}
              onSelectChat={onSelectChat}
            />
          )}
          
          {/* Yesterday */}
          {yesterdayChats.length > 0 && (
            <ChatGroup
              label="Yesterday"
              chats={yesterdayChats}
              currentChatId={currentChat?.id}
              onSelectChat={onSelectChat}
            />
          )}
          
          {/* Older */}
          {olderChats.length > 0 && (
            <ChatGroup
              label="Previous 7 Days"
              chats={olderChats.slice(0, 10)}
              currentChatId={currentChat?.id}
              onSelectChat={onSelectChat}
            />
          )}
          
          {filteredChats.length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-zinc-500">
              No chats yet.<br />Start a new conversation!
            </div>
          )}
        </div>
        
        {/* User Footer */}
        <div className="p-3 border-t border-zinc-800 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || 'User'}</div>
              <div className="text-xs text-zinc-500">{user?.plan || 'Free'} plan</div>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-zinc-700">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-zinc-500">{user?.email}</div>
              </div>
              
              <div className="py-1">
                <MenuButton icon={<Settings className="w-4 h-4" />} label="Settings" shortcut="⌘+," onClick={() => { onOpenSettings(); setShowUserMenu(false); }} />
                <MenuButton icon={<Globe className="w-4 h-4" />} label="Language" onClick={() => {}} hasArrow />
                <MenuButton icon={<HelpCircle className="w-4 h-4" />} label="Get help" onClick={() => {}} />
              </div>
              
              <div className="py-1 border-t border-zinc-700">
                <MenuButton icon={<CreditCard className="w-4 h-4" />} label="View all plans" onClick={() => {}} />
                <MenuButton icon={<User className="w-4 h-4" />} label="My account" onClick={() => {}} />
              </div>
              
              <div className="py-1 border-t border-zinc-700">
                <MenuButton icon={<LogOut className="w-4 h-4" />} label="Log out" onClick={onLogout} />
              </div>
            </div>
          )}
        </div>
      </div>

      <ChatsDialog 
        isOpen={showChatsDialog} 
        onClose={() => setShowChatsDialog(false)}
        onSelectChat={(chat) => {
          onSelectChat({
            id: chat.id,
            title: chat.title,
            updatedAt: chat.updated_at,
            projectId: undefined
          })
          setShowChatsDialog(false)
        }}
      />
    </>
  )
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

function NavItem({ 
  icon, 
  label, 
  onClick, 
  active = false 
}: { 
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active 
          ? 'bg-zinc-800 text-white' 
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function MenuButton({
  icon,
  label,
  shortcut,
  hasArrow,
  onClick
}: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  hasArrow?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-xs text-zinc-500">{shortcut}</span>}
      {hasArrow && <ChevronRight className="w-4 h-4 text-zinc-500" />}
    </button>
  )
}

function ChatGroup({
  label,
  chats,
  currentChatId,
  onSelectChat
}: {
  label: string
  chats: Chat[]
  currentChatId?: string
  onSelectChat: (chat: Chat) => void
}) {
  return (
    <div className="mb-4">
      <div className="px-2 py-1 text-xs text-zinc-600">{label}</div>
      <div className="space-y-0.5">
        {chats.map(chat => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors group ${
              chat.id === currentChatId
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
            }`}
          >
            <span className="flex-1 truncate">{chat.title}</span>
            <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-opacity">
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// HELPERS
// =====================================================

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

export default Sidebar
