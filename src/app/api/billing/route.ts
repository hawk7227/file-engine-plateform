// =====================================================
// FILE ENGINE - BILLING PORTAL API
// Manage subscriptions via Stripe portal
// =====================================================

import { NextRequest } from 'next/server'
import { getUser } from '@/lib/supabase'
import { createPortalSession, getSubscriptionInfo, cancelSubscription, resumeSubscription } from '@/lib/stripe-billing'
import { parseBody, parseBillingRequest, validationErrorResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

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
  } catch (error: unknown) {
    console.error('Billing info error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
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

    const parsed = await parseBody(request, parseBillingRequest)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const { action } = parsed.data
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

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
  } catch (error: unknown) {
    console.error('Billing action error:', error)
    return new Response(JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
