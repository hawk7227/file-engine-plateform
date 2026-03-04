/* eslint-disable no-restricted-syntax */
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

const WorkplaceLayout = dynamic(
  () => import('@/components/workplace/WorkplaceLayout'),
  { ssr: false }
)

// =====================================================
// ZERO Supabase SDK on the client.
// Auth via direct REST calls to Supabase GoTrue API.
// Profile via direct REST call to PostgREST.
// No navigator.locks, no localStorage session, no hangs.
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || 'hawkinsmarcus127@gmail.com'
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'Horace120!'

type AuthState = 'loading' | 'authenticated' | 'error'

async function signInDirect(email: string, password: string): Promise<{ user: User | null; access_token: string | null; error: string | null }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { user: null, access_token: null, error: data.error_description || data.msg || `HTTP ${res.status}` }
    }
    return {
      user: data.user as User,
      access_token: data.access_token as string,
      error: null,
    }
  } catch (e) {
    return { user: null, access_token: null, error: e instanceof Error ? e.message : 'Network error' }
  }
}

async function loadProfileDirect(userId: string, accessToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    )
    if (!res.ok) {
      console.warn('[Workplace] Profile fetch failed:', res.status)
      return null
    }
    const rows = await res.json()
    return rows?.[0] || null
  } catch {
    return null
  }
}

export default function AdminWorkplacePage() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      console.log('[Workplace] Direct REST sign-in (no SDK)...')

      const { user: authUser, access_token, error } = await signInDirect(DEV_EMAIL, DEV_PASSWORD)

      if (cancelled) return

      if (error || !authUser || !access_token) {
        console.error('[Workplace] Sign-in failed:', error)
        setErrorMsg(error || 'Sign-in failed')
        setAuthState('error')
        return
      }

      console.log('[Workplace] Signed in:', authUser.email, 'token length:', access_token.length)
      setUser(authUser)
      setAccessToken(access_token)

      // Load profile
      const prof = await loadProfileDirect(authUser.id, access_token)
      if (cancelled) return

      if (prof) {
        setProfile(prof as Profile)
      } else {
        setProfile({
          id: authUser.id,
          email: DEV_EMAIL,
          full_name: 'Marcus',
          avatar_url: null,
          preferred_model: 'claude-sonnet-4-5-20250929',
          claude_api_key: null,
          openai_api_key: null,
          role: 'owner',
          team_id: authUser.id,
          skill_level: null,
          created_at: new Date().toISOString(),
        })
      }

      setAuthState('authenticated')
    }

    initAuth()
    return () => { cancelled = true }
  }, [])

  if (authState === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#040406', color: '#fff',
        fontFamily: "'DM Sans', sans-serif", flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>&#x26A1;</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Authenticating...</div>
        <div style={{ fontSize: 11, color: '#7878a0' }}>Connecting...</div>
      </div>
    )
  }

  if (authState === 'error' || !user || !profile) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#040406', color: '#ff3b5c',
        fontFamily: "'DM Sans', sans-serif", flexDirection: 'column',
        gap: 12, padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32 }}>&#x26A0;</div>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Auth Failed</div>
        <div style={{ fontSize: 12, color: '#7878a0', maxWidth: 400 }}>
          {errorMsg || 'Could not authenticate.'}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '8px 20px', borderRadius: 8,
            background: 'rgba(255,59,92,.1)', border: '1px solid rgba(255,59,92,.2)',
            color: '#ff3b5c', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return <WorkplaceLayout user={user} profile={profile} accessToken={accessToken} />
}
