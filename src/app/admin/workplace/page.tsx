/* eslint-disable no-restricted-syntax */
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { supabase } from '@/lib/supabase'

const WorkplaceLayout = dynamic(
  () => import('@/components/workplace/WorkplaceLayout'),
  { ssr: false }
)

// Dev Auth — reads env vars, falls back to hardcoded for staging
// After confirming, rotate password and set NEXT_PUBLIC_DEV_EMAIL / NEXT_PUBLIC_DEV_PASSWORD in Vercel
const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL || 'hawkinsmarcus127@gmail.com'
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'Horace120!'

type AuthState = 'loading' | 'authenticated' | 'error'

export default function AdminWorkplacePage() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.warn('[Workplace] Profile load failed, using defaults:', error?.message)
        setProfile({
          id: userId,
          email: DEV_EMAIL,
          full_name: 'Marcus',
          avatar_url: null,
          preferred_model: 'claude-sonnet-4-5-20250929',
          claude_api_key: null,
          openai_api_key: null,
          role: 'owner',
          team_id: null,
          skill_level: null,
          created_at: new Date().toISOString(),
        })
        return
      }
      setProfile(data as Profile)
    }

    // Hard timeout: if auth takes longer than 8s, force reload (clears stale locks)
    const authTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[Workplace] Auth timeout — force reloading')
        window.location.reload()
      }
    }, 8000)

    async function initAuth() {
      try {
        // 1. Skip getSession entirely — it's the #1 cause of hangs.
        // Go straight to signInWithPassword which always works.
        console.log('[Workplace] Direct sign-in...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        })

        if (error || !data.user) {
          if (cancelled) return
          console.error('[Workplace] Sign-in failed:', error?.message)
          setErrorMsg(error?.message || 'Sign-in failed')
          setAuthState('error')
          return
        }

        if (cancelled) return
        console.log('[Workplace] Signed in as:', data.user.email)
        setUser(data.user)
        setAccessToken(data.session?.access_token || null)
        await loadProfile(data.user.id)
        setAuthState('authenticated')
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Workplace] Auth error:', msg)
        setErrorMsg(msg)
        setAuthState('error')
      } finally {
        clearTimeout(authTimeout)
      }
    }

    initAuth()
    return () => { cancelled = true; clearTimeout(authTimeout) }
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
        <div style={{ fontSize: 11, color: '#7878a0' }}>Connecting to Supabase</div>
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
          {errorMsg || 'Could not authenticate. Check Supabase connection and credentials.'}
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
