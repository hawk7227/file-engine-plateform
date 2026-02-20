'use client'

// =====================================================
// FILE ENGINE - PROJECT MEMORY PANEL
// View and manage project memory
// =====================================================

import { useState } from 'react'
import {
  Brain,
  FolderTree,
  GitBranch,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  FileCode,
  Component,
  Database,
  Plug,
  Code,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  X
} from 'lucide-react'

interface ProjectMemoryPanelProps {
  memory: any
}

export function ProjectMemoryPanel({ memory }: ProjectMemoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'registry' | 'decisions' | 'style' | 'history'>('registry')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>(['components', 'hooks'])
  
  // Demo data
  const demoMemory = {
    name: 'E-Commerce Dashboard',
    type: 'nextjs',
    status: 'active',
    registry: {
      components: [
        { name: 'Button', path: 'components/ui/Button.tsx', exports: ['Button', 'ButtonProps'], version: 3 },
        { name: 'ProductCard', path: 'components/ProductCard.tsx', exports: ['ProductCard'], version: 1 },
        { name: 'Sidebar', path: 'components/Sidebar.tsx', exports: ['Sidebar'], version: 2 },
        { name: 'Header', path: 'components/Header.tsx', exports: ['Header'], version: 1 },
        { name: 'Modal', path: 'components/ui/Modal.tsx', exports: ['Modal', 'ModalProps'], version: 2 }
      ],
      hooks: [
        { name: 'useAuth', path: 'hooks/useAuth.ts', exports: ['useAuth', 'AuthContext'], version: 2 },
        { name: 'useProducts', path: 'hooks/useProducts.ts', exports: ['useProducts'], version: 1 },
        { name: 'useCart', path: 'hooks/useCart.ts', exports: ['useCart', 'CartProvider'], version: 3 }
      ],
      apiRoutes: [
        { name: 'users', path: 'app/api/users/route.ts', methods: ['GET', 'POST'], version: 1 },
        { name: 'products', path: 'app/api/products/route.ts', methods: ['GET', 'POST', 'DELETE'], version: 2 },
        { name: 'auth', path: 'app/api/auth/route.ts', methods: ['POST'], version: 1 }
      ],
      pages: [
        { name: 'Home', path: 'app/page.tsx', version: 1 },
        { name: 'Dashboard', path: 'app/dashboard/page.tsx', version: 2 },
        { name: 'Products', path: 'app/products/page.tsx', version: 1 }
      ]
    },
    decisions: [
      { id: 1, category: 'architecture', decision: 'Use App Router for routing', reasoning: 'Better performance and RSC support', status: 'active', date: '2024-01-15' },
      { id: 2, category: 'library', decision: 'Use Zustand for state management', reasoning: 'Simpler than Redux, good DX', status: 'active', date: '2024-01-16' },
      { id: 3, category: 'pattern', decision: 'Use Server Components by default', reasoning: 'Better performance, smaller bundles', status: 'active', date: '2024-01-16' },
      { id: 4, category: 'style', decision: 'Use Tailwind CSS', reasoning: 'Fast development, consistent design', status: 'active', date: '2024-01-15' },
      { id: 5, category: 'library', decision: 'Use React Query for data fetching', reasoning: 'Caching, loading states built-in', status: 'superseded', date: '2024-01-17' }
    ],
    styleGuide: {
      naming: {
        components: 'PascalCase',
        hooks: 'use{Name}',
        utils: 'camelCase',
        files: 'kebab-case'
      },
      patterns: {
        stateManagement: 'zustand',
        styling: 'tailwind',
        forms: 'react-hook-form',
        dataFetching: 'tanstack-query'
      },
      preferences: {
        semicolons: false,
        singleQuotes: true,
        tabWidth: 2
      }
    },
    sessions: [
      { id: 1, date: '2024-01-20', summary: 'Built authentication system', filesCreated: 5 },
      { id: 2, date: '2024-01-19', summary: 'Created product listing page', filesCreated: 3 },
      { id: 3, date: '2024-01-18', summary: 'Set up project structure', filesCreated: 8 }
    ]
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }
  
  const tabs = [
    { id: 'registry', label: 'Registry', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'decisions', label: 'Decisions', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'style', label: 'Style Guide', icon: <Settings className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> }
  ]
  
  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      {/* Header */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{demoMemory.name}</h1>
            <p className="text-zinc-400">Project Memory · {demoMemory.type} · {demoMemory.status}</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {activeTab === 'registry' && (
          <RegistryView
            registry={demoMemory.registry}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
          />
        )}
        
        {activeTab === 'decisions' && (
          <DecisionsView decisions={demoMemory.decisions} />
        )}
        
        {activeTab === 'style' && (
          <StyleGuideView styleGuide={demoMemory.styleGuide} />
        )}
        
        {activeTab === 'history' && (
          <HistoryView sessions={demoMemory.sessions} />
        )}
      </div>
    </div>
  )
}

// Registry View
function RegistryView({
  registry,
  expandedSections,
  onToggleSection
}: {
  registry: any
  expandedSections: string[]
  onToggleSection: (section: string) => void
}) {
  const sections = [
    { key: 'components', label: 'Components', icon: <Component className="w-4 h-4" />, items: registry.components },
    { key: 'hooks', label: 'Hooks', icon: <Code className="w-4 h-4" />, items: registry.hooks },
    { key: 'apiRoutes', label: 'API Routes', icon: <Plug className="w-4 h-4" />, items: registry.apiRoutes },
    { key: 'pages', label: 'Pages', icon: <FileCode className="w-4 h-4" />, items: registry.pages }
  ]
  
  return (
    <div className="space-y-4">
      {sections.map(section => (
        <div key={section.key} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <button
            onClick={() => onToggleSection(section.key)}
            className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors"
          >
            {expandedSections.includes(section.key) ? (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            )}
            {section.icon}
            <span className="font-medium text-white">{section.label}</span>
            <span className="ml-auto text-sm text-zinc-500">{section.items.length} items</span>
          </button>
          
          {expandedSections.includes(section.key) && (
            <div className="border-t border-zinc-800">
              {section.items.map((item: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50 last:border-0"
                >
                  <FileCode className="w-4 h-4 text-zinc-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-200">{item.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{item.path}</div>
                  </div>
                  {item.exports && (
                    <div className="text-xs text-zinc-500">
                      exports: {item.exports.join(', ')}
                    </div>
                  )}
                  {item.methods && (
                    <div className="flex gap-1">
                      {item.methods.map((m: string) => (
                        <span key={m} className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="text-xs text-zinc-600">v{item.version}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Decisions View
function DecisionsView({ decisions }: { decisions: any[] }) {
  const categoryColors: Record<string, string> = {
    architecture: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    library: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pattern: 'bg-green-500/20 text-green-400 border-green-500/30',
    style: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Decision Log</h3>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" />
          Add Decision
        </button>
      </div>
      
      {decisions.map(decision => (
        <div
          key={decision.id}
          className={`bg-zinc-900 rounded-xl border border-zinc-800 p-4 ${
            decision.status === 'superseded' ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded border text-xs ${categoryColors[decision.category]}`}>
                {decision.category}
              </span>
              {decision.status === 'superseded' && (
                <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500">
                  superseded
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">{decision.date}</span>
          </div>
          
          <h4 className="font-medium text-white mb-2">{decision.decision}</h4>
          <p className="text-sm text-zinc-400">{decision.reasoning}</p>
          
          <div className="flex gap-2 mt-3">
            <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
              <Edit2 className="w-4 h-4 text-zinc-500" />
            </button>
            <button className="p-1.5 hover:bg-zinc-800 rounded transition-colors">
              <Trash2 className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Style Guide View
function StyleGuideView({ styleGuide }: { styleGuide: any }) {
  return (
    <div className="space-y-6">
      {/* Naming Conventions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Naming Conventions</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(styleGuide.naming).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-zinc-400 capitalize">{key}</span>
              <code className="text-sm text-blue-400">{value as string}</code>
            </div>
          ))}
        </div>
      </div>
      
      {/* Patterns */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Patterns & Libraries</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(styleGuide.patterns).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <code className="text-sm text-green-400">{value as string}</code>
            </div>
          ))}
        </div>
      </div>
      
      {/* Preferences */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Code Preferences</h3>
        <div className="space-y-3">
          {Object.entries(styleGuide.preferences).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className={`text-sm ${value ? 'text-green-400' : 'text-zinc-500'}`}>
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// History View
function HistoryView({ sessions }: { sessions: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Session History</h3>
      
      {sessions.map(session => (
        <div
          key={session.id}
          className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-400">{session.date}</span>
            </div>
            <span className="text-xs text-zinc-500">{session.filesCreated} files created</span>
          </div>
          <p className="text-white">{session.summary}</p>
        </div>
      ))}
    </div>
  )
}

export default ProjectMemoryPanel
