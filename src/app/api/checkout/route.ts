// =====================================================
// FILE ENGINE - CHECKOUT API
// Create Stripe checkout sessions
// =====================================================

import { NextRequest } from 'next/server'
import { getUser, getProfile } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/stripe-billing'
import { parseBody, parseCheckoutRequest, validationErrorResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const parsed = await parseBody(request, parseCheckoutRequest)
    if (!parsed.success) return validationErrorResponse(parsed.error)
    const { plan, interval = 'monthly' } = parsed.data

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!['monthly', 'yearly'].includes(interval)) {
      return new Response(JSON.stringify({ error: 'Invalid interval' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const profile = await getProfile(user.id)
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    const checkoutUrl = await createCheckoutSession({
      userId: user.id,
      email: user.email || '',
      plan: plan as 'pro' | 'enterprise',
      interval,
      successUrl: `${origin}/dashboard?upgrade=success`,
      cancelUrl: `${origin}/pricing?upgrade=canceled`
    })

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Checkout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
