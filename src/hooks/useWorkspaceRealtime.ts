'use client'

/**
 * WORKPLACE — Real-time Collaboration Hook
 * 
 * Uses Supabase Realtime for:
 * 1. Presence — who's online, what file they're editing
 * 2. Broadcast — cursor positions, live screen sharing
 * 3. Postgres Changes — activity feed from workspace_activity table
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================

export interface TeamMember {
  user_id: string
  user_name: string
  avatar_color: string
  current_file: string | null
  current_line: number | null
  action: 'editing' | 'viewing' | 'idle'
  device_preview: string | null
  status_message: string | null
  last_active: string
}

export interface ActivityEvent {
  id: string
  user_id: string
  user_name: string
  event_type: string
  detail: Record<string, unknown>
  created_at: string
}

export interface CursorPosition {
  user_id: string
  user_name: string
  file: string
  line: number
  col: number
}

export interface WatchedViewport {
  user_id: string
  activePanel: string
  editorFile: string | null
  editorContent: string | null
  editorScroll: number
  chatMessages: Array<{ role: string; content: string }>
  previewUrl: string | null
}

export interface UseWorkspaceRealtimeReturn {
  teamMembers: TeamMember[]
  activities: ActivityEvent[]
  cursors: Record<string, CursorPosition>
  watchedViewport: WatchedViewport | null
  watchingUserId: string | null
  isConnected: boolean
  updatePresence: (state: Partial<TeamMember>) => void
  sendCursor: (file: string, line: number, col: number) => void
  logActivity: (type: string, detail: Record<string, unknown>) => Promise<void>
  startWatching: (userId: string) => void
  stopWatching: () => void
  shareViewport: (viewport: Omit<WatchedViewport, 'user_id'>) => void
}

// ============================================
// HOOK
// ============================================

export function useWorkspaceRealtime(
  userId: string,
  userName: string,
  avatarColor?: string
): UseWorkspaceRealtimeReturn {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
  const [watchedViewport, setWatchedViewport] = useState<WatchedViewport | null>(null)
  const [watchingUserId, setWatchingUserId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const activityChannelRef = useRef<RealtimeChannel | null>(null)
  const presenceStateRef = useRef<Partial<TeamMember>>({})
  const cursorThrottleRef = useRef<number>(0)
  const viewportThrottleRef = useRef<number>(0)

  // ── Join workspace channel ──
  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel('workspace:main', {
      config: { presence: { key: userId } }
    })

    // Presence: sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const members: TeamMember[] = []
      for (const [, presences] of Object.entries(state)) {
        if ((presences as any[])[0]) members.push((presences as any[])[0] as TeamMember)
      }
      setTeamMembers(members)
    })

    // Broadcast: cursor positions
    channel.on('broadcast', { event: 'cursor' }, ({ payload }: any) => {
      if (payload?.user_id && payload.user_id !== userId) {
        setCursors(prev => ({ ...prev, [payload.user_id]: payload as CursorPosition }))
      }
    })

    // Broadcast: viewport sharing (for watch mode)
    channel.on('broadcast', { event: 'viewport' }, ({ payload }: any) => {
      if (payload?.user_id === watchingUserId) {
        setWatchedViewport(payload as WatchedViewport)
      }
    })

    channel.subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        await channel.track({
          user_id: userId,
          user_name: userName,
          avatar_color: avatarColor || '#34d399',
          current_file: null,
          current_line: null,
          action: 'idle' as const,
          device_preview: null,
          status_message: null,
          last_active: new Date().toISOString(),
        })
      }
    })

    channelRef.current = channel

    // Activity feed: listen for inserts
    const actChannel = supabase
      .channel('activity-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'workspace_activity',
      }, (payload: any) => {
        setActivities(prev => [payload.new as ActivityEvent, ...prev].slice(0, 100))
      })
      .subscribe()

    activityChannelRef.current = actChannel

    // Load recent activity
    supabase
      .from('workspace_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }: any) => {
        if (data) setActivities(data as ActivityEvent[])
      })

    return () => {
      channel.unsubscribe()
      actChannel.unsubscribe()
      channelRef.current = null
      activityChannelRef.current = null
      setIsConnected(false)
    }
  }, [userId, userName, avatarColor]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update presence ──
  const updatePresence = useCallback((state: Partial<TeamMember>) => {
    presenceStateRef.current = { ...presenceStateRef.current, ...state }
    channelRef.current?.track({
      user_id: userId,
      user_name: userName,
      avatar_color: avatarColor || '#34d399',
      current_file: null,
      current_line: null,
      action: 'idle' as const,
      device_preview: null,
      status_message: null,
      last_active: new Date().toISOString(),
      ...presenceStateRef.current,
    })
  }, [userId, userName, avatarColor])

  // ── Send cursor (throttled 50ms) ──
  const sendCursor = useCallback((file: string, line: number, col: number) => {
    const now = Date.now()
    if (now - cursorThrottleRef.current < 50) return
    cursorThrottleRef.current = now
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { user_id: userId, user_name: userName, file, line, col }
    })
  }, [userId, userName])

  // ── Log activity (persistent) ──
  const logActivity = useCallback(async (type: string, detail: Record<string, unknown>) => {
    try {
      await supabase.from('workspace_activity').insert({
        user_id: userId,
        user_name: userName,
        event_type: type,
        detail,
      })
    } catch (err) {
      console.error('[Workplace] Failed to log activity:', err)
    }
  }, [userId, userName])

  // ── Watch mode ──
  const startWatching = useCallback((targetUserId: string) => {
    setWatchingUserId(targetUserId)
    setWatchedViewport(null)
  }, [])

  const stopWatching = useCallback(() => {
    setWatchingUserId(null)
    setWatchedViewport(null)
  }, [])

  // ── Share viewport (throttled 200ms) ──
  const shareViewport = useCallback((viewport: Omit<WatchedViewport, 'user_id'>) => {
    const now = Date.now()
    if (now - viewportThrottleRef.current < 200) return
    viewportThrottleRef.current = now
    channelRef.current?.send({
      type: 'broadcast',
      event: 'viewport',
      payload: { user_id: userId, ...viewport }
    })
  }, [userId])

  return {
    teamMembers,
    activities,
    cursors,
    watchedViewport,
    watchingUserId,
    isConnected,
    updatePresence,
    sendCursor,
    logActivity,
    startWatching,
    stopWatching,
    shareViewport,
  }
}
