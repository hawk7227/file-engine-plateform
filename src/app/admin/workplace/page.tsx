'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'
import { supabase } from '@/lib/supabase'
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
          width: 40, height: 40, borderRadius: 12,
          background: '#10b981',
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
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAuth() {
      try {
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
        if (userError || !authUser) {
          setAuthError('Not authenticated. Redirecting...')
          setTimeout(() => { window.location.href = '/auth/login?redirect=/admin/workplace' }, 1500)
          return
        }
        setUser(authUser)

        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (prof) {
          setProfile(prof as Profile)
          if (prof.role !== 'owner' && prof.role !== 'admin') {
            setAuthError('Admin access required.')
            setTimeout(() => { window.location.href = '/dashboard' }, 1500)
            return
          }
        }
      } catch {
        setAuthError('Auth check failed.')
      } finally {
        setLoading(false)
      }
    }
    loadAuth()
  }, [])

  if (loading) return null // dynamic loading screen handles this
  if (authError) {
    return (
      <div style={{
        height: '100vh', background: '#040406', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#f87171', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
      }}>
        {authError}
      </div>
    )
  }
  if (!user || !profile) return null

  return (
    <>
      <AdminNavPill />
      <WorkplaceLayout user={user} profile={profile} />
    </>
  )
}
