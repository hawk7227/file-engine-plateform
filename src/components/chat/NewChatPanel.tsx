'use client'

// =====================================================
// FILE ENGINE - NEW CHAT PANEL (COMPLETE)
// Notifications, Smart Prompts, One-Click Start
// =====================================================

import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Sparkles,
  Zap,
  Code,
  Database,
  Palette,
  TestTube,
  Bug,
  Star,
  Play,
  ArrowRight,
  Clock,
  TrendingUp
} from 'lucide-react'

interface Notification {
  id: string
  type: 'welcome' | 'continue_project' | 'suggested_task' | 'daily_prompt'
  title: string
  description: string
  prompt?: { userPrompt: string }
  priority?: number
}

interface NewChatPanelProps {
  notifications: Notification[]
  onStartChat: (systemPrompt: string, userPrompt: string) => void
  onQuickPrompt: (prompt: string) => void
  projectMemory?: any
}

export function NewChatPanel({
  notifications,
  onStartChat,
  onQuickPrompt,
  projectMemory
}: NewChatPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  
  const categories = [
    { id: 'all', label: 'All', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'component', label: 'Components', icon: <Code className="w-4 h-4" /> },
    { id: 'api', label: 'APIs', icon: <Database className="w-4 h-4" /> },
    { id: 'styling', label: 'Styling', icon: <Palette className="w-4 h-4" /> },
    { id: 'testing', label: 'Testing', icon: <TestTube className="w-4 h-4" /> },
    { id: 'fix', label: 'Bug Fixes', icon: <Bug className="w-4 h-4" /> }
  ]
  
  const templates = [
    {
      id: 'tpl_component',
      category: 'component',
      icon: '🧩',
      color: '#6366F1',
      name: 'Create Component',
      description: 'Build a new React component with TypeScript and Tailwind',
      prompt: 'Create a React component called [ComponentName] that [description]. Include TypeScript types, proper props, and Tailwind styling.',
      tags: ['react', 'component', 'typescript'],
      popularity: 95
    },
    {
      id: 'tpl_api',
      category: 'api',
      icon: '🔌',
      color: '#F59E0B',
      name: 'Build API Route',
      description: 'Create a Next.js API route with validation',
      prompt: 'Create an API route at /api/[endpoint] that handles [methods]. Include input validation, error handling, and proper status codes.',
      tags: ['api', 'nextjs', 'backend'],
      popularity: 88
    },
    {
      id: 'tpl_form',
      category: 'component',
      icon: '📝',
      color: '#10B981',
      name: 'Form with Validation',
      description: 'Create a form with React Hook Form and Zod',
      prompt: 'Create a form component for [purpose] with fields: [fields]. Use React Hook Form and Zod for validation.',
      tags: ['form', 'validation'],
      popularity: 92
    },
    {
      id: 'tpl_auth',
      category: 'api',
      icon: '🔐',
      color: '#8B5CF6',
      name: 'Authentication Flow',
      description: 'Implement auth with login, signup, and session',
      prompt: 'Create an authentication system with login, signup, and session management.',
      tags: ['auth', 'security'],
      popularity: 85
    },
    {
      id: 'tpl_dashboard',
      category: 'component',
      icon: '📊',
      color: '#EC4899',
      name: 'Dashboard Layout',
      description: 'Build a dashboard with sidebar and cards',
      prompt: 'Create a dashboard layout with a sidebar, header, and main content area with cards.',
      tags: ['dashboard', 'layout'],
      popularity: 90
    },
    {
      id: 'tpl_table',
      category: 'component',
      icon: '📋',
      color: '#14B8A6',
      name: 'Data Table',
      description: 'Sortable, filterable table with pagination',
      prompt: 'Create a data table component with sorting, filtering, and pagination.',
      tags: ['table', 'data'],
      popularity: 87
    },
    {
      id: 'tpl_modal',
      category: 'component',
      icon: '🪟',
      color: '#F97316',
      name: 'Modal Dialog',
      description: 'Accessible modal with animations',
      prompt: 'Create a reusable modal component with animations and keyboard accessibility.',
      tags: ['modal', 'a11y'],
      popularity: 89
    },
    {
      id: 'tpl_test',
      category: 'testing',
      icon: '🧪',
      color: '#22C55E',
      name: 'Write Tests',
      description: 'Generate tests for existing code',
      prompt: 'Write comprehensive tests for [component/function]. Include unit tests and edge cases.',
      tags: ['testing', 'jest'],
      popularity: 82
    },
    {
      id: 'tpl_fix',
      category: 'fix',
      icon: '🔧',
      color: '#EF4444',
      name: 'Fix Bug',
      description: 'Debug and fix an error',
      prompt: 'Fix this error: [error message]. Make ONLY the minimal changes needed.',
      tags: ['bug', 'fix'],
      popularity: 94
    },
    {
      id: 'tpl_refactor',
      category: 'fix',
      icon: '♻️',
      color: '#3B82F6',
      name: 'Refactor Code',
      description: 'Clean up and improve existing code',
      prompt: 'Refactor [file/component] to improve readability. Explain each change.',
      tags: ['refactor', 'cleanup'],
      popularity: 78
    },
    {
      id: 'tpl_style',
      category: 'styling',
      icon: '🎨',
      color: '#D946EF',
      name: 'Style Component',
      description: 'Add styling with Tailwind CSS',
      prompt: 'Add Tailwind CSS styling to make [component] look modern and professional.',
      tags: ['tailwind', 'css'],
      popularity: 86
    },
    {
      id: 'tpl_animate',
      category: 'styling',
      icon: '✨',
      color: '#FBBF24',
      name: 'Add Animations',
      description: 'Add smooth animations and transitions',
      prompt: 'Add animations to [component] using Framer Motion or CSS transitions.',
      tags: ['animation', 'ux'],
      popularity: 80
    }
  ]
  
  const quickPrompts = [
    { icon: '📖', label: 'Explain this code', prompt: 'Explain this code step by step' },
    { icon: '🔧', label: 'Fix this error', prompt: 'Fix this error' },
    { icon: '✨', label: 'Improve this', prompt: 'Suggest improvements for this code' },
    { icon: '🧪', label: 'Write tests', prompt: 'Write tests for this code' },
    { icon: '📝', label: 'Add docs', prompt: 'Add documentation to this code' },
    { icon: '📘', label: 'Add types', prompt: 'Add TypeScript types to this code' }
  ]
  
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesCategory = !selectedCategory || selectedCategory === 'all' || t.category === selectedCategory
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery])
  
  const handleTemplateClick = (template: typeof templates[0]) => {
    onStartChat('', template.prompt)
  }
  
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customPrompt.trim()) {
      onStartChat('', customPrompt.trim())
      setCustomPrompt('')
    }
  }
  
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Hero Section */}
      <div className="relative px-6 py-12 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent" />
        
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
            <Zap className="w-4 h-4" />
            500+ Validation Checks · Smart Guardrails · Project Memory
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            What do you want to build?
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Start with a template or describe what you need. File Engine will write production-ready code.
          </p>
        </div>
      </div>
      
      {/* Custom Input */}
      <div className="max-w-3xl mx-auto px-6 -mt-4 mb-8">
        <form onSubmit={handleCustomSubmit}>
          <div className="relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe what you want to build..."
              className="w-full pl-12 pr-32 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-lg"
            />
            <button
              type="submit"
              disabled={!customPrompt.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                customPrompt.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          </div>
        </form>
      </div>
      
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" />
            Suggested for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {notifications.slice(0, 3).map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                onClick={() => onStartChat('', notif.prompt?.userPrompt || notif.title)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Prompts */}
      <div className="max-w-6xl mx-auto px-6 mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp) => (
            <button
              key={qp.label}
              onClick={() => onQuickPrompt(qp.prompt)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm transition-all hover:scale-[1.02]"
            >
              <span>{qp.icon}</span>
              {qp.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Templates Section */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Templates
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-64"
            />
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === 'all' ? null : cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                (selectedCategory === cat.id) || (cat.id === 'all' && !selectedCategory)
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
        
        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Notification Card
function NotificationCard({
  notification,
  onClick
}: {
  notification: Notification
  onClick: () => void
}) {
  const typeConfig: Record<string, { color: string; bg: string; icon: string }> = {
    welcome: { color: 'border-l-green-500', bg: 'bg-green-500/10', icon: '👋' },
    continue_project: { color: 'border-l-blue-500', bg: 'bg-blue-500/10', icon: '▶️' },
    suggested_task: { color: 'border-l-yellow-500', bg: 'bg-yellow-500/10', icon: '💡' },
    daily_prompt: { color: 'border-l-purple-500', bg: 'bg-purple-500/10', icon: '✨' }
  }
  
  const config = typeConfig[notification.type] || typeConfig.welcome
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-l-4 ${config.color} ${config.bg} text-left transition-all hover:scale-[1.02] hover:shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white mb-1 truncate">{notification.title}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2">{notification.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>~5 min</span>
            <ArrowRight className="w-3 h-3 ml-auto text-zinc-600" />
          </div>
        </div>
      </div>
    </button>
  )
}

// Template Card
function TemplateCard({
  template,
  onClick
}: {
  template: {
    id: string
    icon: string
    color: string
    name: string
    description: string
    tags: string[]
    popularity: number
  }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="p-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all hover:scale-[1.02] group"
      style={{ borderTopColor: template.color, borderTopWidth: '3px' }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{template.icon}</span>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <TrendingUp className="w-3 h-3" />
          {template.popularity}%
        </div>
      </div>
      
      <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
        {template.name}
      </h3>
      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{template.description}</p>
      
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

export default NewChatPanel
