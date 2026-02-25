'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const router = useRouter()

  const loadAuth = useCallback(async () => {
    try {
      const supabase = createClient()

      // Try getUser first (more reliable than getSession)
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !authUser) {
        // Fallback: try getSession
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profileData) {
            setProfile(profileData as Profile)
            const isAdmin = profileData.role === 'owner' || profileData.role === 'admin'
            setAuthorized(isAdmin)
          }
        }
      } else {
        setUser(authUser)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profileData) {
          setProfile(profileData as Profile)
          const isAdmin = profileData.role === 'owner' || profileData.role === 'admin'
          setAuthorized(isAdmin)
        }
      }
    } catch (err) {
      console.error('Admin workplace auth error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAuth()
  }, [loadAuth])

  if (loading) {
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
        <button
          onClick={() => { setLoading(true); loadAuth() }}
          style={{
            padding: '8px 20px', borderRadius: '8px',
            background: 'transparent', color: '#606070',
            fontWeight: 600, fontSize: '12px', cursor: 'pointer',
            border: '1px solid #2a2a38', marginTop: '8px',
          }}
        >
          Retry
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

