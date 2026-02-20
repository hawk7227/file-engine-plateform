'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase, getUser } from '@/lib/supabase'
import { Project } from '@/lib/types'

export interface ProjectFile {
  id: string
  file_path: string
  language: string | null
  file_size: number
  created_at: string
  updated_at: string
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)

    const user = await getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setProjects(data as Project[])
    }

    setLoading(false)
  }, [])

  const createProject = useCallback(async (name: string, type: Project['type']) => {
    const user = await getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, type, status: 'draft' })
      .select()
      .single()

    if (error) throw error

    setProjects((prev: any[]) => [data as Project, ...prev])
    return data as Project
  }, [])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    setProjects((prev: any[]) => prev.map((p: any) => p.id === id ? data as Project : p))
    return data as Project
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    setProjects((prev: any[]) => prev.filter((p: any) => p.id !== id))
  }, [])

  // Fetch files for a specific project
  const getProjectFiles = useCallback(async (projectId: string): Promise<ProjectFile[]> => {
    setLoadingFiles(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return []

      const res = await fetch(`/api/project-files?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })

      if (!res.ok) return []

      const { files } = await res.json()
      setProjectFiles(files || [])
      return files || []
    } catch (err) {
      console.error('[useProjects] Failed to load files:', err)
      return []
    } finally {
      setLoadingFiles(false)
    }
  }, [])

  // Fetch content of a specific file
  const getFileContent = useCallback(async (projectId: string, filePath: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return null

      const res = await fetch(
        `/api/project-files?projectId=${projectId}&path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )

      if (!res.ok) return null

      const { content } = await res.json()
      return content
    } catch (err) {
      console.error('[useProjects] Failed to load file content:', err)
      return null
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    projectFiles,
    loadingFiles,
    loading,
    error,
    refresh: loadProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectFiles,
    getFileContent
  }
}
