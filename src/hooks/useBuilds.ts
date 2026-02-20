'use client'
import { useState, useCallback } from 'react'
import { supabase, getUser } from '@/lib/supabase'
import { Build, PLAN_LIMITS, PlanType } from '@/lib/types'

export function useBuilds() {
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBuilds = useCallback(async (projectId?: string) => {
    setLoading(true)
    setError(null)
    
    const user = await getUser()
    if (!user) {
      setLoading(false)
      return
    }

    let query = supabase
      .from('builds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      setError(error.message)
    } else {
      setBuilds(data as Build[])
    }
    
    setLoading(false)
  }, [])

  const createBuild = useCallback(async (projectId: string, prompt: string) => {
    const user = await getUser()
    if (!user) throw new Error('Not authenticated')

    // Check plan limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    const plan = (subscription?.plan || 'free') as PlanType
    const limits = PLAN_LIMITS[plan]

    // Count active builds
    const { count } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['queued', 'running'])

    if ((count || 0) >= limits.concurrent) {
      throw new Error(`Concurrent build limit reached (${limits.concurrent} for ${plan} plan)`)
    }

    // Create build
    const { data, error } = await supabase
      .from('builds')
      .insert({ 
        project_id: projectId, 
        user_id: user.id, 
        prompt, 
        status: 'queued' 
      })
      .select()
      .single()

    if (error) throw error
    
    setBuilds((prev: any[]) => [data as Build, ...prev])
    return data as Build
  }, [])

  const getActiveBuildsCount = useCallback(async () => {
    const user = await getUser()
    if (!user) return 0

    const { count } = await supabase
      .from('builds')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['queued', 'running'])

    return count || 0
  }, [])

  return {
    builds,
    loading,
    error,
    loadBuilds,
    createBuild,
    getActiveBuildsCount
  }
}
