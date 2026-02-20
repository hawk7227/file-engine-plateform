// =====================================================
// FILE ENGINE - USAGE API
// Get usage stats and limits
// =====================================================

import { NextRequest } from 'next/server'
import { getUser } from '@/lib/supabase'
import { getUsageStats, checkUsageAlerts, canUserGenerate } from '@/lib/usage-limits'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const [stats, alerts, canGenerate] = await Promise.all([
      getUsageStats(user.id),
      checkUsageAlerts(user.id),
      canUserGenerate(user.id)
    ])

    return new Response(JSON.stringify({
      stats,
      alerts,
      canGenerate: canGenerate.allowed,
      remaining: {
        today: canGenerate.remainingToday,
        month: canGenerate.remainingThisMonth
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Usage API error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
