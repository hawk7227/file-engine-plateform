'use client'

// =====================================================
// FILE ENGINE - HEADER COMPONENT
// =====================================================

import {
  Menu,
  PanelRight,
  Command,
  Loader2,
  ChevronDown,
  Zap,
  Check,
  Cloud,
  Wifi,
  WifiOff,
  GitBranch,
  Play,
  Share2
} from 'lucide-react'

interface HeaderProps {
  currentProject: { name: string } | null
  currentChat: { title: string } | null
  viewMode: string
  onToggleSidebar: () => void
  onTogglePreview: () => void
  onOpenCommandPalette: () => void
  isGenerating: boolean
}

export function Header({
  currentProject,
  currentChat,
  viewMode,
  onToggleSidebar,
  onTogglePreview,
  onOpenCommandPalette,
  isGenerating
}: HeaderProps) {
  const titles: Record<string, string> = {
    'new-chat': 'New Chat',
    'chat': currentChat?.title || 'Chat',
    'analytics': 'Analytics Dashboard',
    'memory': 'Project Memory',
    'settings': 'Settings'
  }
  
  return (
    <header className="h-14 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5 text-zinc-400" />
        </button>
        
        <div className="h-6 w-px bg-zinc-800" />
        
        {currentProject && (
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
            <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-xs">
              ▲
            </div>
            <span className="text-sm font-medium">{currentProject.name}</span>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
        )}
        
        <h1 className="text-sm font-medium text-zinc-300">
          {titles[viewMode] || viewMode}
        </h1>
        
        {isGenerating && (
          <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-full">
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
            <span className="text-xs text-blue-400">Generating...</span>
          </div>
        )}
      </div>
      
      {/* Center - Status */}
      <div className="flex items-center gap-4">
        <StatusIndicator label="Connected" status="success" icon={<Wifi className="w-3 h-3" />} />
        <StatusIndicator label="Saved" status="success" icon={<Cloud className="w-3 h-3" />} />
      </div>
      
      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
          <Play className="w-4 h-4 text-green-400" />
          <span className="text-sm">Run</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
          <Share2 className="w-4 h-4 text-zinc-400" />
          <span className="text-sm">Share</span>
        </button>
        
        <div className="h-6 w-px bg-zinc-800" />
        
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <Command className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-400">⌘K</span>
        </button>
        
        {/* Toggle Preview */}
        {viewMode === 'chat' && (
          <button
            onClick={onTogglePreview}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <PanelRight className="w-5 h-5 text-zinc-400" />
          </button>
        )}
      </div>
    </header>
  )
}

function StatusIndicator({ 
  label, 
  status, 
  icon 
}: { 
  label: string
  status: 'success' | 'warning' | 'error'
  icon: React.ReactNode
}) {
  const colors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  }
  
  return (
    <div className={`flex items-center gap-1.5 text-xs ${colors[status]}`}>
      {icon}
      <span className="text-zinc-500">{label}</span>
    </div>
  )
}

export default Header
