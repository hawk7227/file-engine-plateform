'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

/**
 * AdminNavPill — floating tab switcher shown on the Workplace page.
 * Provides navigation back to Admin Dashboard and highlights active page.
 */

const TABS = [
  { href: '/admin', label: ' Admin Dashboard' },
  { href: '/admin/workplace', label: ' Workplace IDE' },
]

const S = {
  pill: {
    position: 'fixed' as const,
    top: 6,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    display: 'flex',
    background: 'rgba(10,10,14,.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,.06)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
    boxShadow: '0 4px 20px rgba(0,0,0,.5)',
  },
  tab: (active: boolean) => ({
    padding: '5px 14px',
    borderRadius: 7,
    fontSize: 11,
    fontWeight: active ? 800 : 500,
    fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif",
    color: active ? '#000' : 'rgba(255,255,255,.5)',
    background: active
      ? 'var(--accent-primary)'
      : 'transparent',
    textDecoration: 'none',
    transition: 'all .15s',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }),
}

export function AdminNavPill() {
  const pathname = usePathname()

  return (
    <nav style={S.pill}>
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href} style={S.tab(active)}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default AdminNavPill
