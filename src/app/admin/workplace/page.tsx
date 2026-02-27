'use client'

import { User } from '@supabase/supabase-js'
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
  // AUTH BYPASS FOR TESTING — remove when going to production
  const mockUser = { id: 'test-user', email: 'test@fileengine.com' } as User
  const mockProfile = { id: 'test-user', email: 'test@fileengine.com', full_name: 'Test User', role: 'owner', avatar_url: null } as Profile

  return (
    <>
      <AdminNavPill />
      <WorkplaceLayout user={mockUser} profile={mockProfile} />
    </>
  )
}

