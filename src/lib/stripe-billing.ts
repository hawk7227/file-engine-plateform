// =====================================================
// FILE ENGINE - STRIPE INTEGRATION
// Complete payment system with subscriptions
// =====================================================

import Stripe from 'stripe'
import { supabase } from './supabase'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
})

// =====================================================
// PRICE IDS (Configure in Stripe Dashboard)
// =====================================================

export const STRIPE_PRICES = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
  max_monthly: process.env.STRIPE_PRICE_MAX_MONTHLY || 'price_max_monthly',
  max_yearly: process.env.STRIPE_PRICE_MAX_YEARLY || 'price_max_yearly',
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
  enterprise_yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || 'price_enterprise_yearly'
}

export const PLAN_PRICE_MAP: Record<string, { monthly: string; yearly: string; name: string }> = {
  starter: {
    monthly: STRIPE_PRICES.starter_monthly,
    yearly: STRIPE_PRICES.starter_yearly,
    name: 'Starter'
  },
  pro: {
    monthly: STRIPE_PRICES.pro_monthly,
    yearly: STRIPE_PRICES.pro_yearly,
    name: 'Pro'
  },
  max: {
    monthly: STRIPE_PRICES.max_monthly,
    yearly: STRIPE_PRICES.max_yearly,
    name: 'Max'
  },
  enterprise: {
    monthly: STRIPE_PRICES.enterprise_monthly,
    yearly: STRIPE_PRICES.enterprise_yearly,
    name: 'Enterprise'
  }
}

// =====================================================
// CREATE OR GET STRIPE CUSTOMER
// =====================================================

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()
  
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id
  }
  
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId, source: 'file-engine' }
  })
  
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customer.id,
      plan: 'free',
      status: 'active'
    })
  
  return customer.id
}

// =====================================================
// CREATE CHECKOUT SESSION
// =====================================================

export interface CheckoutOptions {
  userId: string
  email: string
  plan: 'pro' | 'enterprise'
  interval: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
}

export async function createCheckoutSession(options: CheckoutOptions): Promise<string> {
  const { userId, email, plan, interval, successUrl, cancelUrl } = options
  
  const customerId = await getOrCreateStripeCustomer(userId, email)
  const planConfig = PLAN_PRICE_MAP[plan]
  if (!planConfig) throw new Error(`Invalid plan: ${plan}`)
  
  const priceId = interval === 'yearly' ? planConfig.yearly : planConfig.monthly
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: { metadata: { userId, plan } },
    metadata: { userId, plan },
    allow_promotion_codes: true,
    billing_address_collection: 'required'
  })
  
  return session.url || ''
}

// =====================================================
// CREATE CUSTOMER PORTAL SESSION
// =====================================================

export async function createPortalSession(userId: string, returnUrl: string): Promise<string> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()
  
  if (!subscription?.stripe_customer_id) throw new Error('No Stripe customer found')
  
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: returnUrl
  })
  
  return session.url
}

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan
  const subscriptionId = session.subscription as string
  
  if (!userId || !plan) {
    console.error('Missing metadata in checkout session')
    return
  }
  
  await supabase
    .from('subscriptions')
    .update({
      plan,
      status: 'active',
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
  
  console.log(`[Stripe] User ${userId} subscribed to ${plan}`)
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', subscription.customer as string)
    .single()
  
  if (!data) {
    console.error('Could not find user for subscription')
    return
  }
  
  let plan = 'free'
  const priceId = subscription.items.data[0]?.price.id
  
  if (priceId === STRIPE_PRICES.starter_monthly || priceId === STRIPE_PRICES.starter_yearly) {
    plan = 'starter'
  } else if (priceId === STRIPE_PRICES.pro_monthly || priceId === STRIPE_PRICES.pro_yearly) {
    plan = 'pro'
  } else if (priceId === STRIPE_PRICES.max_monthly || priceId === STRIPE_PRICES.max_yearly) {
    plan = 'max'
  } else if (priceId === STRIPE_PRICES.enterprise_monthly || priceId === STRIPE_PRICES.enterprise_yearly) {
    plan = 'enterprise'
  }
  
  let status = 'active'
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled'
    plan = 'free'
  } else if (subscription.status === 'past_due') {
    status = 'past_due'
  }
  
  await supabase
    .from('subscriptions')
    .update({
      plan,
      status,
      stripe_subscription_id: subscription.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', data.user_id)
  
  console.log(`[Stripe] Subscription updated for user ${data.user_id}: ${plan} (${status})`)
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()
  
  if (!data) {
    console.error('Could not find user for deleted subscription')
    return
  }
  
  await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', data.user_id)
  
  console.log(`[Stripe] Subscription canceled for user ${data.user_id}`)
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return
  
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
  
  if (!data) return
  
  await supabase.from('payments').insert({
    user_id: data.user_id,
    stripe_invoice_id: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: 'paid',
    paid_at: new Date().toISOString()
  })
  
  console.log(`[Stripe] Invoice paid for user ${data.user_id}: $${invoice.amount_paid / 100}`)
}

export async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return
  
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
  
  if (!data) return
  
  await supabase
    .from('subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('user_id', data.user_id)
  
  console.log(`[Stripe] Invoice failed for user ${data.user_id}`)
}

// =====================================================
// VERIFY WEBHOOK SIGNATURE
// =====================================================

export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) throw new Error('Stripe webhook secret not configured')
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

// =====================================================
// GET SUBSCRIPTION INFO
// =====================================================

export interface SubscriptionInfo {
  plan: string
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  pricePerMonth: number
}

export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (!data) return null
  
  let cancelAtPeriodEnd = false
  let pricePerMonth = 0
  
  if (data.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id)
      cancelAtPeriodEnd = subscription.cancel_at_period_end
      const price = subscription.items.data[0]?.price
      if (price) {
        pricePerMonth = (price.unit_amount || 0) / 100
        if (price.recurring?.interval === 'year') pricePerMonth = pricePerMonth / 12
      }
    } catch (error) {
      console.error('Error fetching Stripe subscription:', error)
    }
  }
  
  return {
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    cancelAtPeriodEnd,
    pricePerMonth
  }
}

// =====================================================
// CANCEL SUBSCRIPTION
// =====================================================

export async function cancelSubscription(userId: string, immediately: boolean = false): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .single()
  
  if (!data?.stripe_subscription_id) throw new Error('No active subscription found')
  
  if (immediately) {
    await stripe.subscriptions.cancel(data.stripe_subscription_id)
  } else {
    await stripe.subscriptions.update(data.stripe_subscription_id, { cancel_at_period_end: true })
  }
  
  console.log(`[Stripe] Subscription cancellation requested for user ${userId}`)
}

// =====================================================
// RESUME SUBSCRIPTION
// =====================================================

export async function resumeSubscription(userId: string): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .single()
  
  if (!data?.stripe_subscription_id) throw new Error('No subscription found')
  
  await stripe.subscriptions.update(data.stripe_subscription_id, { cancel_at_period_end: false })
  console.log(`[Stripe] Subscription resumed for user ${userId}`)
}

// =====================================================
// CHANGE PLAN
// =====================================================

export async function changePlan(
  userId: string,
  newPlan: 'pro' | 'enterprise',
  interval: 'monthly' | 'yearly'
): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .single()
  
  if (!data?.stripe_subscription_id) throw new Error('No active subscription found')
  
  const subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id)
  const planConfig = PLAN_PRICE_MAP[newPlan]
  const newPriceId = interval === 'yearly' ? planConfig.yearly : planConfig.monthly
  
  await stripe.subscriptions.update(data.stripe_subscription_id, {
    items: [{ id: subscription.items.data[0].id, price: newPriceId }],
    proration_behavior: 'create_prorations'
  })
  
  console.log(`[Stripe] Plan changed to ${newPlan} for user ${userId}`)
}

// =====================================================
// GET INVOICES
// =====================================================

export async function getInvoices(userId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()
  
  if (!data?.stripe_customer_id) return []
  
  const invoices = await stripe.invoices.list({ customer: data.stripe_customer_id, limit })
  return invoices.data
}

export { stripe }
