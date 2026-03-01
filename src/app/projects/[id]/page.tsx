'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, getUser } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import PreviewPanel from '@/components/preview/PreviewPanel'

interface Project {
  id: string
  name: string
  type: string
  status: string
  github_repo: string | null
  deploy_url: string | null
  created_at: string
  updated_at: string
}

interface ProjectFile {
  id: string
  name: string
  path: string
  content: string | null
  type: string
  created_at: string
}

interface Build {
  id: string
  prompt: string
  status: string
  error: string | null
  created_at: string
  completed_at: string | null
}

export default function ProjectPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const { user } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'files' | 'builds' | 'settings'>('files')

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Load files
      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .order('path')

      setFiles(filesData || [])
      if (filesData && filesData.length > 0) {
        setSelectedFile(filesData[0])
      }

      // Load builds
      const { data: buildsData } = await supabase
        .from('builds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

      setBuilds(buildsData || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId, loadProject])

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
      router.push('/dashboard')
    } catch (err: any) {
      alert('Failed to delete project: ' + err.message)
    }
  }

  async function handleDeploy() {
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      })

      const data = await res.json()
      
      if (data.error) {
        alert('Deploy failed: ' + data.error)
        return
      }

      alert('Deployment started! URL: ' + data.url)
      loadProject()
    } catch (err: any) {
      alert('Deploy failed: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="project-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading project...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="project-page">
        <div className="error-container">
          <h1>Project not found</h1>
          <p>{error || 'This project does not exist or you do not have access.'}</p>
          <Link href="/dashboard" className="back-link">← Back to Dashboard</Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  return (
    <div className="project-page">
      <header className="project-header">
        <div className="header-left">
          <Link href="/dashboard" className="back-btn">←</Link>
          <div className="project-info">
            <h1>{project.name}</h1>
            <div className="project-meta">
              <span className={`status-badge ${project.status}`}>{project.status}</span>
              <span className="project-type">{project.type}</span>
              <span className="project-date">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {project.deploy_url && (
            <a href={project.deploy_url} target="_blank" rel="noopener noreferrer" className="action-btn">
               View Site
            </a>
          )}
          <button onClick={handleDeploy} className="action-btn primary">
             Deploy
          </button>
          <button onClick={() => router.push('/dashboard')} className="action-btn">
             Continue Building
          </button>
        </div>
      </header>

      <div className="project-tabs">
        <button 
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
           Files ({files.length})
        </button>
        <button 
          className={`tab ${activeTab === 'builds' ? 'active' : ''}`}
          onClick={() => setActiveTab('builds')}
        >
           Builds ({builds.length})
        </button>
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
           Settings
        </button>
      </div>

      <main className="project-main">
        {activeTab === 'files' && (
          <div className="files-view">
            <div className="file-tree">
              <div className="file-tree-header">Files</div>
              {files.length === 0 ? (
                <p className="no-files">No files generated yet</p>
              ) : (
                <ul className="file-list">
                  {files.map(file => (
                    <li 
                      key={file.id}
                      className={`file-item ${selectedFile?.id === file.id ? 'active' : ''}`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <span className="file-icon">
                        {file.path.endsWith('.tsx') ? '' : 
                         file.path.endsWith('.ts') ? '' :
                         file.path.endsWith('.css') ? '' :
                         file.path.endsWith('.json') ? '' : ''}
                      </span>
                      <span className="file-name">{file.path}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="file-preview">
              {selectedFile ? (
                <PreviewPanel
                  file={{
                    path: selectedFile.path,
                    content: selectedFile.content || '',
                    language: selectedFile.path.split('.').pop() || 'txt',
                    status: 'validated'
                  }}
                  onClose={() => setSelectedFile(null)}
                />
              ) : (
                <div className="no-preview">
                  <p>Select a file to preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'builds' && (
          <div className="builds-view">
            {builds.length === 0 ? (
              <p className="no-builds">No builds yet</p>
            ) : (
              <ul className="builds-list">
                {builds.map(build => (
                  <li key={build.id} className={`build-item ${build.status}`}>
                    <div className="build-status">
                      {build.status === 'completed' ? '' :
                       build.status === 'failed' ? '' :
                       build.status === 'running' ? '' : '⏳'}
                    </div>
                    <div className="build-info">
                      <p className="build-prompt">{build.prompt.slice(0, 100)}...</p>
                      <div className="build-meta">
                        <span className={`build-badge ${build.status}`}>{build.status}</span>
                        <span className="build-date">
                          {new Date(build.created_at).toLocaleString()}
                        </span>
                      </div>
                      {build.error && (
                        <p className="build-error">{build.error}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-view">
            <div className="settings-section">
              <h3>Project Details</h3>
              <div className="settings-field">
                <label>Name</label>
                <input type="text" value={project.name} readOnly />
              </div>
              <div className="settings-field">
                <label>Type</label>
                <input type="text" value={project.type} readOnly />
              </div>
              <div className="settings-field">
                <label>Created</label>
                <input type="text" value={new Date(project.created_at).toLocaleString()} readOnly />
              </div>
            </div>

            <div className="settings-section">
              <h3>Deployment</h3>
              {project.deploy_url ? (
                <div className="settings-field">
                  <label>Live URL</label>
                  <a href={project.deploy_url} target="_blank" rel="noopener noreferrer">
                    {project.deploy_url}
                  </a>
                </div>
              ) : (
                <p className="settings-note">Not deployed yet</p>
              )}
            </div>

            <div className="settings-section danger">
              <h3>Danger Zone</h3>
              <p>Once you delete a project, there is no going back.</p>
              <button onClick={handleDelete} className="delete-btn">
                Delete Project
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{styles}</style>
    </div>
  )
}

const styles = `
  .project-page {
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .loading-container, .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--bg-tertiary);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .back-link {
    color: var(--accent-primary);
    text-decoration: none;
  }

  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 8px;
    text-decoration: none;
    color: var(--text-primary);
    font-size: 18px;
  }

  .project-info h1 {
    font-size: 20px;
    margin: 0 0 4px 0;
  }

  .project-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .status-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.draft { background: var(--bg-tertiary); }
  .status-badge.building { background: var(--accent-yellow); color: black; }
  .status-badge.completed { background: var(--accent-primary); color: white; }
  .status-badge.deployed { background: var(--accent-green); color: white; }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: none;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn.primary {
    background: var(--accent-primary);
    color: white;
  }

  .project-tabs {
    display: flex;
    gap: 0;
    padding: 0 24px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
  }

  .tab {
    padding: 12px 20px;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab.active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }

  .project-main {
    padding: 24px;
  }

  .files-view {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 24px;
    height: calc(100vh - 180px);
  }

  .file-tree {
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow: hidden;
  }

  .file-tree-header {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 13px;
    border-bottom: 1px solid var(--border-primary);
  }

  .file-list {
    list-style: none;
    padding: 8px;
    margin: 0;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
  }

  .file-item:hover {
    background: var(--bg-tertiary);
  }

  .file-item.active {
    background: var(--accent-primary);
    color: white;
  }

  .file-preview {
    background: var(--bg-secondary);
    border-radius: 8px;
    overflow: hidden;
  }

  .no-files, .no-builds, .no-preview {
    padding: 40px;
    text-align: center;
    color: var(--text-muted);
  }

  .builds-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .build-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
  }

  .build-status {
    font-size: 24px;
  }

  .build-info {
    flex: 1;
  }

  .build-prompt {
    margin: 0 0 8px 0;
    font-size: 14px;
  }

  .build-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .build-badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .build-badge.completed { background: var(--accent-green); color: white; }
  .build-badge.failed { background: var(--accent-orange); color: white; }
  .build-badge.running { background: var(--accent-yellow); color: black; }
  .build-badge.queued { background: var(--bg-tertiary); }

  .build-error {
    margin-top: 8px;
    padding: 8px;
    background: rgba(239, 68, 68, 0.1);
    color: var(--accent-orange);
    border-radius: 4px;
    font-size: 12px;
  }

  .settings-view {
    max-width: 600px;
  }

  .settings-section {
    background: var(--bg-secondary);
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 24px;
  }

  .settings-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
  }

  .settings-field {
    margin-bottom: 16px;
  }

  .settings-field label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .settings-field input {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
  }

  .settings-note {
    color: var(--text-secondary);
    font-size: 14px;
  }

  .settings-section.danger {
    border: 1px solid var(--accent-orange);
  }

  .settings-section.danger h3 {
    color: var(--accent-orange);
  }

  .delete-btn {
    margin-top: 16px;
    padding: 10px 20px;
    background: var(--accent-orange);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
  }
`
