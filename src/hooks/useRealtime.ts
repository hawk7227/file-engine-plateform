'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface PresenceUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
  color: string
  cursor?: { x: number; y: number }
  activeFile?: string
  lastSeen: string
}

interface UseRealtimeOptions {
  projectId: string
  userId: string
  userEmail: string
  userName?: string
  userAvatar?: string
}

// Generate consistent color from user ID
function getUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function useRealtimePresence(options: UseRealtimeOptions) {
  const { projectId, userId, userEmail, userName, userAvatar } = options
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<any>(null)
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null)

  // Update presence
  const updatePresence = useCallback((data: Partial<PresenceUser>) => {
    if (!channelRef.current) return

    channelRef.current.track({
      id: userId,
      email: userEmail,
      name: userName || null,
      avatar: userAvatar || null,
      color: getUserColor(userId),
      lastSeen: new Date().toISOString(),
      ...data
    })
  }, [userId, userEmail, userName, userAvatar])

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    cursorPositionRef.current = { x, y }
    updatePresence({ cursor: { x, y } })
  }, [updatePresence])

  // Update active file
  const updateActiveFile = useCallback((filePath: string | null) => {
    updatePresence({ activeFile: filePath || undefined })
  }, [updatePresence])

  // Connect to presence channel
  useEffect(() => {
    if (!projectId || !userId) return

    const channel = supabase.channel(`project:${projectId}`, {
      config: {
        presence: {
          key: userId
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeUsers: PresenceUser[] = [];

        (Object.values(state) as any[]).forEach((presences: any[]) => {
          presences.forEach(presence => {
            if (presence.id !== userId) {
              activeUsers.push(presence as PresenceUser)
            }
          })
        })

        setUsers(activeUsers)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: any[] }) => {
        console.log('User left:', key)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          updatePresence({})
        } else {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      if (channelRef.current) {
        updatePresence({
          cursor: cursorPositionRef.current || undefined
        })
      }
    }, 30000) // Every 30 seconds

    return () => {
      clearInterval(heartbeat)
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [projectId, userId, updatePresence])

  return {
    users,
    isConnected,
    updateCursor,
    updateActiveFile,
    updatePresence,
    userCount: users.length + 1 // Include self
  }
}

// Hook for realtime file changes
export function useRealtimeFileChanges(projectId: string, onFileChange: (change: any) => void) {
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`files:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `project_id=eq.${projectId}`
        },
        (payload: any) => {
          onFileChange(payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, onFileChange])
}

// Hook for realtime build updates
export function useRealtimeBuildUpdates(projectId: string, onBuildUpdate: (build: any) => void) {
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`builds:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'builds',
          filter: `project_id=eq.${projectId}`
        },
        (payload: any) => {
          onBuildUpdate(payload)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [projectId, onBuildUpdate])
}

// Hook for realtime chat messages
export function useRealtimeChat(projectId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!projectId) return

    const channel = supabase.channel(`chat:${projectId}`)

    channel
      .on('broadcast', { event: 'message' }, ({ payload }: { payload: any }) => {
        setMessages((prev: any[]) => [...prev, payload])
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
    }
  }, [projectId])

  const sendMessage = useCallback((message: {
    userId: string
    userName: string
    content: string
  }) => {
    if (!channelRef.current) return

    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    })
  }, [])

  return {
    messages,
    sendMessage,
    clearMessages: () => setMessages([])
  }
}
