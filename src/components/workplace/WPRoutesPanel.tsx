'use client'

const ROUTES = [
  { group: 'File Engine App', items: [
    { name: 'Landing Page', path: 'page.tsx', status: 'live', icon: '' },
    { name: 'Pricing', path: 'pricing/page.tsx', status: 'live', icon: '' },
    { name: 'Dashboard', path: 'dashboard/page.tsx', status: 'live', icon: '' },
    { name: 'Login', path: 'auth/login', status: 'live', icon: '' },
  ]},
  { group: 'API Routes', items: [
    { name: 'Chat SSE', path: 'api/chat', status: 'live', icon: '' },
    { name: 'Deploy', path: 'api/deploy', status: 'live', icon: '' },
    { name: 'Generate', path: 'api/generate', status: 'warn', icon: '' },
  ]},
  { group: 'Admin', items: [
    { name: 'Workplace (this)', path: 'admin/workplace', status: 'live', icon: '' },
    { name: 'Settings', path: 'admin/settings', status: 'live', icon: '' },
  ]},
]

const S = {
  label: { fontSize: 7, color: 'var(--wp-text-4)', textTransform: 'uppercase' as const, letterSpacing: '1.2px', fontWeight: 700, padding: '12px 14px 4px' },
  item: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', fontSize: 10, color: 'var(--wp-text-2)', cursor: 'pointer', transition: 'all .1s', borderRadius: 0 },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  path: { fontSize: 7, color: 'var(--wp-text-4)', fontFamily: 'var(--wp-mono)', marginLeft: 'auto', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
}

interface Props {
  toast: (t: string, m: string, type?: string) => void
}

export function WPRoutesPanel({ toast }: Props) {
  return (
    <div>
      {ROUTES.map(g => (
        <div key={g.group}>
          <div style={S.label}>{g.group}</div>
          {g.items.map(r => (
            <div
              key={r.path}
              style={S.item}
              onClick={() => toast('Navigate', r.name, 'nfo')}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--wp-bg-3)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--wp-text-1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.color = 'var(--wp-text-2)' }}
            >
              <span style={{ ...S.dot, background: r.status === 'live' ? 'var(--wp-accent)' : 'var(--wp-yellow)', boxShadow: r.status === 'live' ? '0 0 4px rgba(52,211,153,.4)' : '0 0 4px rgba(251,191,36,.4)' }} />
              {r.icon || ''} <span style={{ flex: 1 }}>{r.name}</span>
              <span style={S.path}>{r.path}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
