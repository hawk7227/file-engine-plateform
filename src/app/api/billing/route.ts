// =====================================================
// FILE ENGINE - BILLING PORTAL API
// Manage subscriptions via Stripe portal
// =====================================================

import { NextRequest } from 'next/server'
import { getUser } from '@/lib/supabase'
import { createPortalSession, getSubscriptionInfo, cancelSubscription, resumeSubscription } from '@/lib/stripe-billing'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id)

    return new Response(JSON.stringify({ subscription: subscriptionInfo }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Billing info error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { action } = await request.json()
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    switch (action) {
      case 'portal': {
        const portalUrl = await createPortalSession(user.id, `${origin}/dashboard`)
        return new Response(JSON.stringify({ url: portalUrl }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'cancel': {
        await cancelSubscription(user.id, false) // Cancel at period end
        return new Response(JSON.stringify({ success: true, message: 'Subscription will be canceled at period end' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'cancel_immediately': {
        await cancelSubscription(user.id, true)
        return new Response(JSON.stringify({ success: true, message: 'Subscription canceled' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'resume': {
        await resumeSubscription(user.id)
        return new Response(JSON.stringify({ success: true, message: 'Subscription resumed' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error: any) {
    console.error('Billing action error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
