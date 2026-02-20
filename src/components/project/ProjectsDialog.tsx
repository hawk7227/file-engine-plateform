import { useState, useEffect } from 'react'
import { X, Folder, Plus, Trash2, Calendar } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { Project } from '@/lib/types'

interface ProjectsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectProject: (project: Project) => void
  currentProjectId?: string | null
}

export function ProjectsDialog({ isOpen, onClose, onSelectProject, currentProjectId }: ProjectsDialogProps) {
  const { projects, loading, createProject, deleteProject, refresh } = useProjects()
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Refresh projects when dialog opens
  useEffect(() => {
    if (isOpen) {
      refresh()
    }
  }, [isOpen, refresh])

  const handleCreate = async () => {
    if (!newProjectName.trim()) return
    
    setIsCreating(true)
    try {
      const project = await createProject(newProjectName.trim(), 'app')
      onSelectProject(project)
      setNewProjectName('')
      onClose()
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project? All chats inside will be lost.')) {
      await deleteProject(projectId)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            Projects
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Project */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
            <button
              onClick={handleCreate}
              disabled={!newProjectName.trim() || isCreating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No projects found</p>
            </div>
          ) : (
            projects.map(project => (
              <div 
                key={project.id}
                className={`group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                  currentProjectId === project.id 
                    ? 'bg-blue-500/10 border-blue-500/50' 
                    : 'hover:bg-zinc-800/50 border-transparent hover:border-zinc-800'
                }`}
                onClick={() => {
                  onSelectProject(project)
                  onClose()
                }}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className={`text-sm font-medium truncate mb-1 ${
                    currentProjectId === project.id ? 'text-blue-400' : 'text-zinc-200'
                  }`}>
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
                  title="Delete project"
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
