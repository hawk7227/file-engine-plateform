'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getProfile, getSubscription, getUsageToday } from '@/lib/supabase'
import { Profile, Subscription, PLAN_LIMITS } from '@/lib/types'

interface AuthContextType {
  user: User | null
  authUser: User | null
  session: any | null
  profile: Profile | null
  subscription: Subscription | null
  loading: boolean
  usageToday: number
  planLimits: typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS]
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authUser: null,
  session: null,
  profile: null,
  subscription: null,
  loading: true,
  usageToday: 0,
  planLimits: PLAN_LIMITS['free'],
  refresh: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usageToday, setUsageToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)

  // ✅ Stable client reference
  const supabase = useMemo(() => createClient(), [])

  // ✅ Stable function reference (fixes exhaustive-deps + avoids stale closures)
  const loadUser = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        const [profileData, subData, usage] = await Promise.all([
          getProfile(u.id).catch((err) => { console.error('getProfile error:', err); return null }),
          getSubscription(u.id).catch((err) => { console.error('getSubscription error:', err); return null }),
          getUsageToday(u.id).catch((err) => { console.error('getUsageToday error:', err); return 0 }),
        ])
        setProfile(profileData as Profile | null)
        setSubscription(subData as Subscription | null)
        setUsageToday(usage)
      } else {
        setProfile(null)
        setSubscription(null)
        setUsageToday(0)
      }
    } catch (err) {
      console.error('Error in loadUser:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

useEffect(() => {
    loadUser()

    const listener = supabase.auth.onAuthStateChange(
      async (event: string, session: unknown) => {
        setSession(session)

        if (event === 'SIGNED_IN' && session) {
          await loadUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setSubscription(null)
          setUsageToday(0)
          setSession(null)
        }
      }
    )

    return () => { listener?.data?.subscription?.unsubscribe() }
  }, [loadUser, supabase])

  const plan = (subscription?.plan ?? 'free') as 'free' | 'pro' | 'enterprise'
  const planLimits = PLAN_LIMITS[plan]

  return (
    <AuthContext.Provider value={{
      user,
      authUser: user,
      session,
      profile,
      subscription,
      loading,
      usageToday,
      planLimits,
      refresh: loadUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
