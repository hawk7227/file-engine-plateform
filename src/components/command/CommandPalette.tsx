'use client'

// =====================================================
// FILE ENGINE - COMMAND PALETTE
// Quick actions with keyboard navigation
// =====================================================

import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Plus,
  MessageSquare,
  FolderOpen,
  Settings,
  BarChart3,
  Brain,
  Zap,
  FileCode,
  Code,
  Database,
  TestTube,
  Bug,
  Command
} from 'lucide-react'

interface Project {
  id: string
  name: string
  type: string
}

interface Chat {
  id: string
  title: string
}

interface CommandPaletteProps {
  onClose: () => void
  onNewChat: () => void
  onSelectProject: (project: Project) => void
  onSelectChat: (chat: Chat) => void
  projects: Project[]
  chats: Chat[]
}

export function CommandPalette({
  onClose,
  onNewChat,
  onSelectProject,
  onSelectChat,
  projects,
  chats
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // All commands
  const commands = [
    { id: 'new-chat', icon: <Plus className="w-4 h-4" />, label: 'New Chat', shortcut: '⌘N', action: onNewChat, category: 'Actions' },
    { id: 'new-component', icon: <Code className="w-4 h-4" />, label: 'Create Component', action: onNewChat, category: 'Templates' },
    { id: 'new-api', icon: <Database className="w-4 h-4" />, label: 'Create API Route', action: onNewChat, category: 'Templates' },
    { id: 'fix-bug', icon: <Bug className="w-4 h-4" />, label: 'Fix Bug', action: onNewChat, category: 'Templates' },
    { id: 'write-tests', icon: <TestTube className="w-4 h-4" />, label: 'Write Tests', action: onNewChat, category: 'Templates' },
    { id: 'analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'View Analytics', action: onClose, category: 'Navigation' },
    { id: 'memory', icon: <Brain className="w-4 h-4" />, label: 'Project Memory', action: onClose, category: 'Navigation' },
    { id: 'settings', icon: <Settings className="w-4 h-4" />, label: 'Settings', shortcut: '⌘,', action: onClose, category: 'Navigation' }
  ]
  
  // Filter by query
  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )
  
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )
  
  const filteredChats = chats.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)
  
  // All items for selection
  const allItems = [
    ...filteredCommands.map(c => ({ type: 'command' as const, ...c })),
    ...filteredProjects.map(p => ({ type: 'project' as const, id: p.id, label: p.name, icon: <FolderOpen className="w-4 h-4" />, project: p })),
    ...filteredChats.map(c => ({ type: 'chat' as const, id: c.id, label: c.title, icon: <MessageSquare className="w-4 h-4" />, chat: c }))
  ]
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, allItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = allItems[selectedIndex]
        if (item) {
          if (item.type === 'command' && item.action) item.action()
          if (item.type === 'project' && item.project) {
            onSelectProject(item.project)
            onClose()
          }
          if (item.type === 'chat' && item.chat) {
            onSelectChat(item.chat)
            onClose()
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, allItems, onSelectProject, onSelectChat, onClose])
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, projects, chats..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none"
          />
          <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">ESC</kbd>
        </div>
        
        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Commands */}
          {filteredCommands.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase">
                Commands
              </div>
              {filteredCommands.map((cmd, i) => (
                <CommandItem
                  key={cmd.id}
                  icon={cmd.icon}
                  label={cmd.label}
                  shortcut={cmd.shortcut}
                  isSelected={selectedIndex === i}
                  onClick={() => {
                    cmd.action()
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase">
                Projects
              </div>
              {filteredProjects.map((project, i) => (
                <CommandItem
                  key={project.id}
                  icon={<FolderOpen className="w-4 h-4" />}
                  label={project.name}
                  subtitle={project.type}
                  isSelected={selectedIndex === filteredCommands.length + i}
                  onClick={() => {
                    onSelectProject(project)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Recent Chats */}
          {filteredChats.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-2 text-xs font-semibold text-zinc-500 uppercase">
                Recent Chats
              </div>
              {filteredChats.map((chat, i) => (
                <CommandItem
                  key={chat.id}
                  icon={<MessageSquare className="w-4 h-4" />}
                  label={chat.title}
                  isSelected={selectedIndex === filteredCommands.length + filteredProjects.length + i}
                  onClick={() => {
                    onSelectChat(chat)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
          
          {/* No Results */}
          {allItems.length === 0 && (
            <div className="py-12 text-center text-zinc-500">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}

function CommandItem({
  icon,
  label,
  subtitle,
  shortcut,
  isSelected,
  onClick
}: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  shortcut?: string
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
        isSelected ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
      }`}
    >
      <span className="text-zinc-500">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {subtitle && <span className="text-xs text-zinc-600">{subtitle}</span>}
      {shortcut && <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">{shortcut}</kbd>}
    </button>
  )
}

export default CommandPalette
