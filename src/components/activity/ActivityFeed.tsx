'use client'
import { useState, useEffect, useRef } from 'react'

/**
 * ACTIVITY FEED - Tool Visualization System
 * 
 * Shows users what's happening during AI operations:
 * - Reading files
 * - Writing files
 * - Analyzing code
 * - Validating
 * - Fixing errors
 * - Searching
 * - Thinking
 * etc.
 * 
 * Similar to AI tool use visualization
 */

// ============================================
// TYPES
// ============================================

export type ToolType = 
  | 'thinking'
  | 'reading'
  | 'writing'
  | 'analyzing'
  | 'validating'
  | 'fixing'
  | 'searching'
  | 'generating'
  | 'parsing'
  | 'deploying'
  | 'uploading'
  | 'downloading'
  | 'connecting'
  | 'executing'

export type ActivityStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface Activity {
  id: string
  type: ToolType
  title: string
  description?: string
  status: ActivityStatus
  progress?: number
  startTime: number
  endTime?: number
  details?: string[]
  expandable?: boolean
  expanded?: boolean
  children?: Activity[]
}

interface ActivityFeedProps {
  activities: Activity[]
  onToggleExpand?: (id: string) => void
  compact?: boolean
  maxHeight?: number
}

// ============================================
// TOOL ICONS & COLORS
// ============================================

const TOOL_CONFIG: Record<ToolType, { icon: string; color: string; label: string }> = {
  thinking: { icon: '🧠', color: '#a78bfa', label: 'Thinking' },
  reading: { icon: '📖', color: '#60a5fa', label: 'Reading' },
  writing: { icon: '✍️', color: '#34d399', label: 'Writing' },
  analyzing: { icon: '🔍', color: '#fbbf24', label: 'Analyzing' },
  validating: { icon: '✅', color: '#10b981', label: 'Validating' },
  fixing: { icon: '🔧', color: '#f97316', label: 'Fixing' },
  searching: { icon: '🔎', color: '#8b5cf6', label: 'Searching' },
  generating: { icon: '⚡', color: '#06b6d4', label: 'Generating' },
  parsing: { icon: '📋', color: '#ec4899', label: 'Parsing' },
  deploying: { icon: '🚀', color: '#14b8a6', label: 'Deploying' },
  uploading: { icon: '📤', color: '#3b82f6', label: 'Uploading' },
  downloading: { icon: '📥', color: '#6366f1', label: 'Downloading' },
  connecting: { icon: '🔌', color: '#8b5cf6', label: 'Connecting' },
  executing: { icon: '▶️', color: '#22c55e', label: 'Executing' },
}

// ============================================
// ACTIVITY ITEM COMPONENT
// ============================================

function ActivityItem({ 
  activity, 
  onToggleExpand,
  isChild = false 
}: { 
  activity: Activity
  onToggleExpand?: (id: string) => void
  isChild?: boolean 
}) {
  const config = TOOL_CONFIG[activity.type]
  const duration = activity.endTime 
    ? ((activity.endTime - activity.startTime) / 1000).toFixed(1)
    : null

  const isRunning = activity.status === 'running'
  const hasChildren = activity.children && activity.children.length > 0

  return (
    <div 
      className={`activity-item ${activity.status} ${isChild ? 'child' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: isChild ? '6px 10px 6px 24px' : '8px 12px',
        borderLeft: `3px solid ${activity.status === 'running' ? config.color : 'transparent'}`,
        background: activity.status === 'running' 
          ? `linear-gradient(90deg, ${config.color}10, transparent)`
          : 'transparent',
        marginBottom: 2,
        borderRadius: isChild ? 0 : 'var(--radius-sm)',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Icon with animation */}
        <span 
          style={{ 
            fontSize: isChild ? 14 : 16,
            animation: isRunning ? 'pulse 1.5s infinite' : 'none'
          }}
        >
          {activity.status === 'completed' ? '✓' : 
           activity.status === 'failed' ? '✗' : 
           config.icon}
        </span>

        {/* Title and description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            fontSize: isChild ? 12 : 13,
            fontWeight: 500,
            color: activity.status === 'failed' ? 'var(--accent-orange)' : 'var(--text-primary)'
          }}>
            <span>{activity.title}</span>
            
            {/* Expand toggle */}
            {(activity.expandable || hasChildren) && (
              <button
                onClick={() => onToggleExpand?.(activity.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0 4px',
                  fontSize: 10
                }}
              >
                {activity.expanded ? '▼' : '▶'}
              </button>
            )}
          </div>
          
          {activity.description && (
            <div style={{ 
              fontSize: 11, 
              color: 'var(--text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {activity.description}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Progress */}
          {isRunning && activity.progress !== undefined && (
            <div style={{
              width: 50,
              height: 4,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${activity.progress}%`,
                height: '100%',
                background: config.color,
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          {/* Spinner for running */}
          {isRunning && activity.progress === undefined && (
            <div 
              className="activity-spinner"
              style={{
                width: 14,
                height: 14,
                border: `2px solid ${config.color}30`,
                borderTopColor: config.color,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
          )}

          {/* Duration */}
          {duration && (
            <span style={{ 
              fontSize: 10, 
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)'
            }}>
              {duration}s
            </span>
          )}

          {/* Status badge */}
          <span style={{
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 10,
            background: activity.status === 'completed' ? 'var(--accent-primary)20' :
                       activity.status === 'failed' ? 'var(--accent-orange)20' :
                       activity.status === 'running' ? `${config.color}20` :
                       'var(--bg-tertiary)',
            color: activity.status === 'completed' ? 'var(--accent-primary)' :
                   activity.status === 'failed' ? 'var(--accent-orange)' :
                   activity.status === 'running' ? config.color :
                   'var(--text-muted)'
          }}>
            {activity.status === 'running' ? 'Running' :
             activity.status === 'completed' ? 'Done' :
             activity.status === 'failed' ? 'Failed' : 'Cancelled'}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {activity.expanded && activity.details && activity.details.length > 0 && (
        <div style={{
          marginTop: 8,
          paddingLeft: 26,
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          background: 'var(--bg-tertiary)',
          padding: '8px 12px 8px 26px',
          borderRadius: 'var(--radius-sm)',
          maxHeight: 150,
          overflow: 'auto'
        }}>
          {activity.details.map((detail, i) => (
            <div key={i} style={{ marginBottom: 2 }}>{detail}</div>
          ))}
        </div>
      )}

      {/* Children activities */}
      {activity.expanded && hasChildren && (
        <div style={{ marginTop: 4 }}>
          {activity.children!.map(child => (
            <ActivityItem 
              key={child.id} 
              activity={child} 
              onToggleExpand={onToggleExpand}
              isChild 
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN ACTIVITY FEED COMPONENT
// ============================================

export function ActivityFeed({ 
  activities, 
  onToggleExpand,
  compact = false,
  maxHeight = 300
}: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new activities are added
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [activities, autoScroll])

  // Handle scroll to detect if user scrolled up
  function handleScroll() {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50)
  }

  const runningCount = activities.filter((a: Activity) => a.status === 'running').length
  const completedCount = activities.filter((a: Activity) => a.status === 'completed').length

  if (activities.length === 0) return null

  return (
    <div 
      className="activity-feed"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-tertiary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>⚙️</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Activity</span>
          {runningCount > 0 && (
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 10,
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)'
            }}>
              {runningCount} running
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {completedCount}/{activities.length} completed
        </div>
      </div>

      {/* Activity list */}
      <div 
        ref={feedRef}
        onScroll={handleScroll}
        style={{
          maxHeight: maxHeight,
          overflowY: 'auto',
          padding: compact ? 4 : 8
        }}
      >
        {activities.map(activity => (
          <ActivityItem 
            key={activity.id} 
            activity={activity}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

// ============================================
// ACTIVITY MANAGER HOOK
// ============================================

export function useActivityManager() {
  const [activities, setActivities] = useState<Activity[]>([])
  const activityIdRef = useRef(0)

  // Start a new activity
  const startActivity = (
    type: ToolType, 
    title: string, 
    description?: string,
    options?: { expandable?: boolean; parentId?: string }
  ): string => {
    const id = `activity-${++activityIdRef.current}`
    const newActivity: Activity = {
      id,
      type,
      title,
      description,
      status: 'running',
      startTime: Date.now(),
      expandable: options?.expandable,
      expanded: false,
      details: [],
      children: []
    }

    setActivities((prev: Activity[]) => {
      if (options?.parentId) {
        return prev.map(a => 
          a.id === options.parentId 
            ? { ...a, children: [...(a.children || []), newActivity] }
            : a
        )
      }
      return [...prev, newActivity]
    })

    return id
  }

  // Update activity progress
  const updateProgress = (id: string, progress: number) => {
    setActivities((prev: Activity[]) => prev.map((a: Activity) => 
      a.id === id ? { ...a, progress } : a
    ))
  }

  // Add detail to activity
  const addDetail = (id: string, detail: string) => {
    setActivities((prev: Activity[]) => prev.map((a: Activity) => 
      a.id === id ? { ...a, details: [...(a.details || []), detail] } : a
    ))
  }

  // Update activity description
  const updateDescription = (id: string, description: string) => {
    setActivities((prev: Activity[]) => prev.map((a: Activity) => 
      a.id === id ? { ...a, description } : a
    ))
  }

  // Complete activity
  const completeActivity = (id: string, status: 'completed' | 'failed' | 'cancelled' = 'completed') => {
    setActivities((prev: Activity[]) => prev.map((a: Activity) => 
      a.id === id ? { ...a, status, endTime: Date.now() } : a
    ))
  }

  // Toggle expand
  const toggleExpand = (id: string) => {
    setActivities((prev: Activity[]) => prev.map((a: Activity) => 
      a.id === id ? { ...a, expanded: !a.expanded } : a
    ))
  }

  // Clear all activities
  const clearActivities = () => {
    setActivities([])
  }

  // Clear completed activities
  const clearCompleted = () => {
    setActivities((prev: Activity[]) => prev.filter(a => a.status === 'running'))
  }

  return {
    activities,
    startActivity,
    updateProgress,
    addDetail,
    updateDescription,
    completeActivity,
    toggleExpand,
    clearActivities,
    clearCompleted,
    hasRunning: activities.some((a: Activity) => a.status === 'running'),
    runningCount: activities.filter((a: Activity) => a.status === 'running').length
  }
}

// ============================================
// INLINE ACTIVITY INDICATOR
// ============================================

export function InlineActivity({ 
  type, 
  text,
  subtext 
}: { 
  type: ToolType
  text: string
  subtext?: string 
}) {
  const config = TOOL_CONFIG[type]

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      background: `${config.color}15`,
      border: `1px solid ${config.color}30`,
      borderRadius: 'var(--radius-md)',
      fontSize: 13
    }}>
      <span style={{ animation: 'pulse 1.5s infinite' }}>{config.icon}</span>
      <span style={{ color: 'var(--text-primary)' }}>{text}</span>
      {subtext && (
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{subtext}</span>
      )}
      <div 
        style={{
          width: 12,
          height: 12,
          border: `2px solid ${config.color}30`,
          borderTopColor: config.color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  )
}

// ============================================
// THINKING INDICATOR (AI-style)
// ============================================

export function ThinkingIndicator({ 
  text = 'Thinking...',
  variant = 'default' 
}: { 
  text?: string
  variant?: 'default' | 'compact' | 'minimal'
}) {
  if (variant === 'minimal') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="thinking-dots">
          <span>•</span><span>•</span><span>•</span>
        </span>
        <style jsx>{`
          .thinking-dots span {
            animation: thinking 1.4s infinite;
            opacity: 0.3;
          }
          .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
          .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes thinking {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }
        `}</style>
      </span>
    )
  }

  if (variant === 'compact') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }}>
        <span style={{ animation: 'pulse 1.5s infinite' }}>🧠</span>
        <span>{text}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: 'linear-gradient(90deg, rgba(167, 139, 250, 0.1), transparent)',
      border: '1px solid rgba(167, 139, 250, 0.2)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 12
    }}>
      <span style={{ fontSize: 20, animation: 'pulse 1.5s infinite' }}>🧠</span>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{text}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Processing your request...
        </div>
      </div>
    </div>
  )
}
