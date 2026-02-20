'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface BuildStatus {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  prompt: string
  error: string | null
  project: { name: string; type: string } | null
  files: Array<{
    id: string
    name: string
    path: string
    content: string
    mime_type: string
  }>
  filesCount: number
  duration: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface UseBuildStatusOptions {
  pollInterval?: number
  onComplete?: (status: BuildStatus) => void
  onError?: (status: BuildStatus) => void
}

export function useBuildStatus(
  buildId: string | null,
  options: UseBuildStatusOptions = {}
) {
  const { pollInterval = 2000, onComplete, onError } = options
  
  const [status, setStatus] = useState<BuildStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const completedRef = useRef(false)

  const fetchStatus = useCallback(async () => {
    if (!buildId || completedRef.current) return

    try {
      const response = await fetch(`/api/builds/${buildId}/status`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch build status')
      }

      const data: BuildStatus = await response.json()
      setStatus(data)
      setError(null)

      // Check if build is done
      if (data.status === 'completed') {
        completedRef.current = true
        onComplete?.(data)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (data.status === 'failed') {
        completedRef.current = true
        onError?.(data)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [buildId, onComplete, onError])

  // Start polling when buildId changes
  useEffect(() => {
    if (!buildId) {
      setStatus(null)
      setLoading(false)
      completedRef.current = false
      return
    }

    setLoading(true)
    completedRef.current = false
    
    // Initial fetch
    fetchStatus().finally(() => setLoading(false))

    // Start polling
    intervalRef.current = setInterval(fetchStatus, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [buildId, pollInterval, fetchStatus])

  const refetch = useCallback(() => {
    completedRef.current = false
    return fetchStatus()
  }, [fetchStatus])

  return {
    status,
    loading,
    error,
    refetch,
    isRunning: status?.status === 'running' || status?.status === 'queued',
    isComplete: status?.status === 'completed',
    isFailed: status?.status === 'failed'
  }
}
