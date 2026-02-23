'use client'

import { useEffect, useState } from 'react'
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
  const { user, profile, loading } = useAuth()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!loading && profile) {
      const isAdmin = profile.role === 'owner' || profile.role === 'admin'
      setAuthorized(isAdmin)
    }
  }, [loading, profile])

  if (loading) return null

  if (!user) {
    return (
      <div style={{
        height: '100vh', background: '#040406', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#f87171', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
      }}>
        Not authenticated. Please log in.
      </div>
    )
  }

  if (!authorized) {
    return (
      <div style={{
        height: '100vh', background: '#040406', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#f87171', fontFamily: "'DM Sans', sans-serif", fontSize: 14,
      }}>
        Admin access required. Your role: {profile?.role || 'unknown'}
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
