// =====================================================
// FILE ENGINE — ProjectsDialog Component
// Enterprise-grade project browser
//
// 4 render states: loading → error → empty → success
// Skeleton loading (not spinner)
// Retry button on error
// Create project inline
// Keyboard navigation (Escape to close, Enter to create)
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { X, Folder, Plus, Trash2, Calendar, AlertCircle, RefreshCw } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { Project } from '@/lib/types'

interface ProjectsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectProject: (project: Project) => void
  currentProjectId?: string | null
}

// ── Skeleton loader ──────────────────────────────────
function ProjectSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ opacity: 1 - i * 0.15 }}>
          <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${50 + Math.random() * 30}%` }} />
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse" style={{ width: '35%' }} />
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
      <p className="text-sm font-medium text-zinc-300 mb-1">Failed to load projects</p>
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
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
        <Folder className="w-6 h-6 text-zinc-600" />
      </div>
      <p className="text-sm text-zinc-400 mb-1">No projects yet</p>
      <p className="text-xs text-zinc-600">Create your first project above to get started</p>
    </div>
  )
}

// ── Main Component ───────────────────────────────────
export function ProjectsDialog({ isOpen, onClose, onSelectProject, currentProjectId }: ProjectsDialogProps) {
  const { projects, loading, error, isEmpty, createProject, deleteProject, refresh, retryCount } = useProjects()
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Refresh when dialog opens
  useEffect(() => {
    if (isOpen) {
      refresh()
      setNewProjectName('')
      setCreateError(null)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen]) // intentionally omit refresh — stable ref

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Handle create
  const handleCreate = async () => {
    const name = newProjectName.trim()
    if (!name || isCreating) return

    setIsCreating(true)
    setCreateError(null)

    try {
      const project = await createProject(name, 'app')
      onSelectProject(project)
      setNewProjectName('')
      onClose()
    } catch (err: unknown) {
      console.error('Failed to create project:', (err instanceof Error ? err.message : String(err)))
      setCreateError((err instanceof Error ? err.message : String(err)) || 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  // Handle delete with loading state
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (deletingId) return

    if (!confirm('Delete this project? All chats inside will be removed.')) return

    setDeletingId(projectId)
    try {
      await deleteProject(projectId)
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
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Projects"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            Projects
            {!loading && !error && (
              <span className="text-xs font-normal text-zinc-500 ml-2">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
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

        {/* Create Project */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="New project name..."
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value)
                setCreateError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              disabled={isCreating}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
            />
            <button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[90px] justify-center"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
          </div>
          {createError && (
            <p className="text-xs text-red-400 mt-2">{createError}</p>
          )}
        </div>

        {/* Content — 4 states */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <ProjectSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={() => refresh()} retryCount={retryCount} />
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    deletingId === project.id
                      ? 'opacity-50 pointer-events-none border-transparent'
                      : currentProjectId === project.id
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'hover:bg-zinc-800/50 border-transparent hover:border-zinc-800'
                  }`}
                  onClick={() => {
                    onSelectProject(project)
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      currentProjectId === project.id
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium truncate mb-0.5 ${
                        currentProjectId === project.id ? 'text-blue-400' : 'text-zinc-200'
                      }`}>
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}
                        </span>
                        {project.type && (
                          <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] uppercase tracking-wider">
                            {project.type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    disabled={deletingId === project.id}
                    className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all text-zinc-600"
                    title="Delete project"
                    aria-label={`Delete ${project.name}`}
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
