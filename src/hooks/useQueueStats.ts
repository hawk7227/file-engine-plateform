'use client'
import { useState, useEffect, useCallback } from 'react'

interface QueueStats {
  queue: {
    waiting: number
    active: number
    completed: number
    failed: number
  }
  user: {
    activeBuilds: number
  }
  performance: {
    avgDurationMs: number
    avgDurationFormatted: string
  }
}

export function useQueueStats(pollInterval = 5000) {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/queue/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch queue stats')
      }

      const data: QueueStats = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    
    const interval = setInterval(fetchStats, pollInterval)
    
    return () => clearInterval(interval)
  }, [fetchStats, pollInterval])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    activeBuilds: stats?.queue.active || 0,
    queuedBuilds: stats?.queue.waiting || 0,
    userActiveBuilds: stats?.user.activeBuilds || 0,
    avgDuration: stats?.performance.avgDurationFormatted || '--'
  }
}
