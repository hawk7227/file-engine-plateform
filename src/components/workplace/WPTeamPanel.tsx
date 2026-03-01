'use client'

import type { TeamMember } from '@/hooks/useWorkspaceRealtime'

const COLORS = ['var(--wp-accent)', 'var(--wp-purple)', 'var(--wp-blue)', 'var(--wp-cyan)', 'var(--wp-yellow)']

const S = {
  header: { padding: '8px 14px', fontSize: 8, fontWeight: 700, color: 'var(--wp-text-3)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--wp-border)' },
  card: { padding: '10px 14px', borderBottom: '1px solid var(--wp-border)', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'background .1s', cursor: 'default' },
  avt: (bg: string) => ({ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, position: 'relative' as const, background: bg, color: bg.includes('34d399') ? '#000' : '#fff' }),
  dot: (on: boolean) => ({ position: 'absolute' as const, bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', border: '2px solid var(--wp-bg-1)', background: on ? 'var(--wp-accent)' : 'var(--wp-text-4)' }),
  name: { fontSize: 11, fontWeight: 700, color: 'var(--wp-text-1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 },
  you: { fontSize: 6, background: 'var(--wp-accent-dim)', color: 'var(--wp-accent)', padding: '1px 4px', borderRadius: 3, fontWeight: 700 },
  file: { fontSize: 8, color: 'var(--wp-text-3)', fontFamily: 'var(--wp-mono)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 },
  action: { fontSize: 8, color: 'var(--wp-text-4)', display: 'flex', alignItems: 'center', gap: 4 },
  btns: { display: 'flex', gap: 4, marginTop: 4 },
  btn: { padding: '2px 6px', fontSize: 6, fontWeight: 700, borderRadius: 4, border: '1px solid var(--wp-border)', background: 'none', color: 'var(--wp-text-3)', cursor: 'pointer', fontFamily: 'var(--wp-font)' },
  watchBtn: { padding: '2px 6px', fontSize: 6, fontWeight: 700, borderRadius: 4, border: '1px solid rgba(96,165,250,.2)', background: 'rgba(96,165,250,.04)', color: 'var(--wp-blue)', cursor: 'pointer', fontFamily: 'var(--wp-font)' },
  lockSection: { padding: '8px 14px', background: 'var(--wp-bg-3)', borderBottom: '1px solid var(--wp-border)', fontSize: 8 },
  lockLabel: { fontSize: 7, fontWeight: 700, color: 'var(--wp-text-4)', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: 4 },
  lockItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', color: 'var(--wp-text-3)', fontSize: 8 },
}

interface Props {
  currentUserId: string
  teamMembers: TeamMember[]
  onWatch: (userId: string) => void
  toast: (t: string, m: string, type?: string) => void
}

export function WPTeamPanel({ currentUserId, teamMembers, onWatch, toast }: Props) {
  const onlineMembers = teamMembers.filter(m => m.action !== 'idle' || m.user_id === currentUserId)
  const offlineCount = Math.max(0, teamMembers.length - onlineMembers.length)

  // File locks: any member editing a file
  const locks = teamMembers.filter(m => m.action === 'editing' && m.current_file)

  return (
    <div>
      <div style={S.header}>
        <span> TEAM</span>
        <span style={{ color: 'var(--wp-accent)' }}>{onlineMembers.length} online{offlineCount > 0 ? ` / ${teamMembers.length}` : ''}</span>
      </div>

      {teamMembers.length === 0 && (
        <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--wp-text-4)', fontSize: 10 }}>
          Connecting to workspace...
        </div>
      )}

      {teamMembers.map((m, i) => {
        const isYou = m.user_id === currentUserId
        const isOnline = m.action !== 'idle' || isYou
        const actionIcon = m.action === 'editing' ? '' : m.action === 'viewing' ? '' : ''
        const actionText = m.action === 'editing'
          ? `Editing${m.current_line ? ` · line ${m.current_line}` : ''}`
          : m.action === 'viewing' ? 'Viewing' : 'Idle'

        return (
          <div key={m.user_id} style={{ ...S.card, opacity: isOnline ? 1 : 0.5 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--wp-bg-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div style={S.avt(COLORS[i % COLORS.length])}>
              {m.user_name?.[0]?.toUpperCase() || '?'}
              <div style={S.dot(isOnline)} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.name}>
                {m.user_name || 'Unknown'} {isYou && <span style={S.you}>YOU</span>}
              </div>
              {m.current_file && (
                <div style={S.file}> {m.current_file}</div>
              )}
              <div style={S.action}>
                {actionIcon} {actionText}
                {m.device_preview && ` ·  ${m.device_preview}`}
              </div>
              {m.status_message && (
                <div style={{ fontSize: 8, color: 'var(--wp-blue)', marginTop: 2, fontStyle: 'italic' }}>
                  &ldquo;{m.status_message}&rdquo;
                </div>
              )}
              <div style={S.btns}>
                {isYou ? (
                  <button style={S.btn} onClick={() => toast('Sharing', 'Your screen is now visible', 'nfo')}>
                     Share
                  </button>
                ) : isOnline ? (
                  <>
                    <button style={S.watchBtn} onClick={() => { onWatch(m.user_id); toast('Watching', `${m.user_name}'s workspace`, 'nfo') }}>
                       Watch
                    </button>
                    <button style={S.btn} onClick={() => toast('Message', `Opening DM with ${m.user_name}`, 'nfo')}>
                       Message
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}

      {locks.length > 0 && (
        <div style={S.lockSection}>
          <div style={S.lockLabel}> Active Locks</div>
          {locks.map(m => (
            <div key={m.user_id + '-lock'} style={S.lockItem}>
               <span style={{ fontFamily: 'var(--wp-mono)' }}>{m.current_file?.split('/').pop()}</span>
              — <span style={{ color: m.user_id === currentUserId ? 'var(--wp-accent)' : 'var(--wp-purple)' }}>{m.user_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
