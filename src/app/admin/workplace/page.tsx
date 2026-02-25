'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'
import { AdminNavPill } from '@/components/AdminNavPill'

const WorkplaceLayout = dynamic(() => import('@/components/workplace/WorkplaceLayout'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100vh',
      background: '#040406',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#606070',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #34d399, #60a5fa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 900, color: '#000',
          margin: '0 auto 12px', animation: 'pulse 1.5s infinite',
        }}>FE</div>
        Loading Workplace...
      </div>
    </div>
  ),
})

export default function AdminWorkplacePage() {
  const { user, profile, loading, refresh } = useAuth()
  const [authorized, setAuthorized] = useState(false)
  const [retried, setRetried] = useState(false)
  const router = useRouter()

  // Retry auth once if user is null after loading (session race condition)
  useEffect(() => {
    if (!loading && !user && !retried) {
      setRetried(true)
      const timer = setTimeout(() => {
        refresh()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, user, retried, refresh])

  useEffect(() => {
    if (!loading && profile) {
      const isAdmin = profile.role === 'owner' || profile.role === 'admin'
      setAuthorized(isAdmin)
    }
  }, [loading, profile])

  // Still loading or retrying auth
  if (loading || (!user && !retried)) {
    return (
      <div style={{
        height: '100vh',
        background: '#040406',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#606070',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #34d399, #60a5fa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#000',
            margin: '0 auto 12px', animation: 'pulse 1.5s infinite',
          }}>FE</div>
          Loading Workplace...
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        height: '100vh', background: '#040406', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px',
        color: '#f87171', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
      }}>
        <div>Not authenticated. Please log in.</div>
        <button
          onClick={() => router.push('/auth/login?redirect=/admin/workplace')}
          style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #34d399, #60a5fa)',
            color: '#000', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          }}
        >
          Go to Login
        </button>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div style={{
        height: '100vh', background: '#040406', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px',
        color: '#f87171', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
      }}>
        <div>Admin access required. Your role: {profile?.role || 'unknown'}</div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '10px 24px', borderRadius: '8px',
            background: '#18181f', color: '#a0a0b0',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            border: '1px solid #2a2a38',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <>
      <AdminNavPill />
      <WorkplaceLayout user={user} profile={profile!} />
    </>
  )
}

