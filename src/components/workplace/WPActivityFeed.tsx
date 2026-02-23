'use client'

import { useState } from 'react'
import type { ActivityEvent } from '@/hooks/useWorkspaceRealtime'

const FILTERS = ['All', 'Edits', 'Deploys', 'Chat', 'System'] as const
type FilterType = typeof FILTERS[number]

const EVENT_ICONS: Record<string, string> = {
  file_open: '📂', file_edit: '✏️', file_save: '💾', file_close: '📄',
  git_push: '📄', git_pull: '📥', deploy_start: '🚀', deploy_pass: '✅',
  deploy_fail: '❌', chat_send: '💬', chat_receive: '🤖', auto_fix: '🔧',
  preview_load: '🖥', device_switch: '🖥', session_start: '🟢', session_end: '🔴',
  video_generate: '🎬', image_generate: '🖼',
}

const EVENT_FILTER_MAP: Record<FilterType, string[]> = {
  All: [],
  Edits: ['file_open', 'file_edit', 'file_save', 'file_close'],
  Deploys: ['deploy_start', 'deploy_pass', 'deploy_fail', 'git_push', 'git_pull'],
  Chat: ['chat_send', 'chat_receive'],
  System: ['auto_fix', 'session_start', 'session_end'],
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getEventDescription(evt: ActivityEvent): string {
  const icon = EVENT_ICONS[evt.event_type] || '📌'
  const d = evt.detail || {}
  switch (evt.event_type) {
    case 'file_edit': return `${icon} Edited ${d.file || 'file'}${d.line_start ? ` (lines ${d.line_start}-${d.line_end})` : ''}`
    case 'file_open': return `${icon} Opened ${d.file || 'file'}`
    case 'file_save': return `${icon} Saved ${d.file || 'file'}`
    case 'git_push': return `${icon} Pushed ${d.file_count || ''} files to GitHub`
    case 'deploy_start': return `${icon} Deployed to Vercel`
    case 'deploy_pass': return `${icon} Build PASS`
    case 'deploy_fail': return `${icon} Build FAIL`
    case 'chat_send': return `${icon} Chat: "${(d.message_preview as string)?.substring(0, 50) || '...'}"`
    case 'chat_receive': return `${icon} AI responded with ${(d.files as string[])?.length || 0} files`
    case 'auto_fix': return `${icon} Auto-fixed build error`
    case 'device_switch': return `${icon} Switched to ${d.device || 'device'} preview`
    default: return `${icon} ${evt.event_type.replace(/_/g, ' ')}`
  }
}

function getEventMeta(evt: ActivityEvent): string | null {
  const d = evt.detail || {}
  switch (evt.event_type) {
    case 'file_edit': return (d.message as string) || null
    case 'git_push': return `${(d.files as string[])?.join(', ') || ''} · ${d.commit_sha || ''}`
    case 'deploy_pass': return `${d.build_time || ''}s · ${d.url || ''}`
    case 'deploy_fail': return (d.error as string) || null
    case 'auto_fix': return `FIX: ${d.fix_description || 'Unknown'} · attempt ${d.attempt || '?'}/3`
    default: return null
  }
}

const S = {
  header: { padding: '8px 14px', fontSize: 8, fontWeight: 700, color: 'var(--wp-text-3)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--wp-border)' },
  live: { display: 'flex', alignItems: 'center', gap: 4 },
  liveDot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--wp-accent)', animation: 'wp-pulse 2s infinite' },
  filters: { display: 'flex', gap: 3, padding: '6px 8px', borderBottom: '1px solid var(--wp-border)' },
  fbtn: (on: boolean) => ({ padding: '3px 8px', borderRadius: 5, fontSize: 6, fontWeight: 700, border: `1px solid ${on ? 'rgba(52,211,153,.2)' : 'var(--wp-border)'}`, background: on ? 'var(--wp-accent-dim)' : 'none', color: on ? 'var(--wp-accent)' : 'var(--wp-text-4)', cursor: 'pointer', fontFamily: 'var(--wp-font)' }),
  item: { display: 'flex', gap: 8, padding: '8px 14px', borderBottom: '1px solid rgba(30,30,40,.5)', cursor: 'pointer', transition: 'background .1s' },
  dot: (color: string) => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: color }),
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  user: { fontSize: 9, fontWeight: 700, color: 'var(--wp-text-1)' },
  time: { fontSize: 7, color: 'var(--wp-text-4)', fontFamily: 'var(--wp-mono)' },
  desc: { fontSize: 9, color: 'var(--wp-text-3)', lineHeight: 1.4 },
  meta: { fontSize: 7, color: 'var(--wp-text-4)', fontFamily: 'var(--wp-mono)', marginTop: 2 },
}

interface Props {
  activities: ActivityEvent[]
}

export function WPActivityFeed({ activities }: Props) {
  const [filter, setFilter] = useState<FilterType>('All')

  const filtered = filter === 'All'
    ? activities
    : activities.filter(a => EVENT_FILTER_MAP[filter]?.includes(a.event_type))

  // Assign colors by user_id for consistency
  const userColors: Record<string, string> = {}
  const palette = ['var(--wp-accent)', 'var(--wp-purple)', 'var(--wp-blue)', 'var(--wp-yellow)', 'var(--wp-cyan)']
  let colorIdx = 0

  return (
    <div>
      <style>{`@keyframes wp-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={S.header}>
        <span>📡 ACTIVITY</span>
        <span style={S.live}><span style={S.liveDot} /><span style={{ color: 'var(--wp-accent)' }}>Live</span></span>
      </div>
      <div style={S.filters}>
        {FILTERS.map(f => (
          <button key={f} style={S.fbtn(filter === f)} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--wp-text-4)', fontSize: 10 }}>
          No activity yet. Start building to see events here.
        </div>
      )}

      {filtered.map(evt => {
        if (!userColors[evt.user_id]) {
          userColors[evt.user_id] = evt.user_name === 'System' ? 'var(--wp-blue)' : palette[colorIdx++ % palette.length]
        }
        const color = userColors[evt.user_id]
        const meta = getEventMeta(evt)

        return (
          <div
            key={evt.id}
            style={S.item}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--wp-bg-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div style={S.dot(color)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.head}>
                <span style={S.user}>{evt.user_name}</span>
                <span style={S.time}>{timeAgo(evt.created_at)}</span>
              </div>
              <div style={S.desc}>{getEventDescription(evt)}</div>
              {meta && <div style={S.meta}>{meta}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
