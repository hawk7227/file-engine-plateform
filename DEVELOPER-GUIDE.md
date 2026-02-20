# File Engine - Developer Wiring Guide
## Complete Setup & Integration Instructions

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Authentication Wiring](#authentication-wiring)
5. [AI Provider Wiring](#ai-provider-wiring)
6. [Stripe Payment Wiring](#stripe-payment-wiring)
7. [API Routes Reference](#api-routes-reference)
8. [Component Integration](#component-integration)
9. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

```bash
# 1. Extract and install
unzip file-engine-merged.zip
cd file-engine-merged
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Fill in your keys (see below)

# 4. Run database migrations
# (Paste schema.sql into Supabase SQL Editor)

# 5. Start development
npm run dev
```

---

## 🔐 Environment Setup

### Required Environment Variables

Create `.env.local` with these values:

```bash
# ═══════════════════════════════════════════════════
# SUPABASE (Required)
# Get from: https://supabase.com/dashboard → Settings → API
# ═══════════════════════════════════════════════════
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # For server-side operations

# ═══════════════════════════════════════════════════
# AI PROVIDERS (At least 1 required)
# Multiple keys enable auto-failover
# ═══════════════════════════════════════════════════

# Primary: Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxxxx          # Main key
ANTHROPIC_API_KEY_1=sk-ant-xxxxx        # Backup 1
ANTHROPIC_API_KEY_2=sk-ant-xxxxx        # Backup 2

# Fallback: OpenAI (GPT-4)
OPENAI_API_KEY=sk-xxxxx                 # Main key
OPENAI_API_KEY_1=sk-xxxxx               # Backup 1
OPENAI_API_KEY_2=sk-xxxxx               # Backup 2

# ═══════════════════════════════════════════════════
# STRIPE (Required for payments)
# Get from: https://dashboard.stripe.com/apikeys
# ═══════════════════════════════════════════════════
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Price IDs (create products in Stripe Dashboard)
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxx

# ═══════════════════════════════════════════════════
# DEPLOYMENT (Optional)
# ═══════════════════════════════════════════════════
GITHUB_TOKEN=ghp_xxxxx
VERCEL_TOKEN=xxxxx
VERCEL_TEAM_ID=xxxxx
```

---

## 🗄️ Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to provision (~2 minutes)

### Step 2: Run Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Paste contents of `supabase/schema.sql`
3. Click **Run**

### Step 3: Enable Auth Providers

1. Go to **Authentication → Providers**
2. Enable:
   - Email (default)
   - Google (optional)
   - GitHub (optional)

### Step 4: Create Storage Bucket

1. Go to **Storage**
2. Create bucket named `attachments`
3. Set to public

### Tables Created

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `subscriptions` | User subscription plans |
| `projects` | User projects |
| `builds` | Build history |
| `files` | Generated files |
| `chats` | Chat history |
| `usage` | Usage tracking |
| `payments` | Payment history |
| `user_preferences` | User settings |
| `user_memories` | AI memory/context |

---

## 🔑 Authentication Wiring

### How It Works

```
src/lib/supabase.ts          → Supabase client & auth functions
src/middleware.ts            → Route protection
src/app/auth/login/page.tsx  → Login page
src/app/auth/signup/page.tsx → Signup page
src/app/auth/callback/page.tsx → OAuth callback
```

### Key Functions in `src/lib/supabase.ts`

```typescript
// Sign up new user
signUp(email, password, fullName)

// Log in existing user
login(email, password)

// OAuth login (Google/GitHub)
loginWithOAuth('google' | 'github')

// Log out
logout()

// Get current user
getUser()

// Get user profile
getProfile(userId)

// Get subscription
getSubscription(userId)
```

### Wiring Auth to Components

The `FileEngineApp.tsx` currently has **hardcoded user**. To wire real auth:

```typescript
// In src/components/FileEngineApp.tsx

import { useEffect, useState } from 'react'
import { supabase, getUser, getProfile, getSubscription } from '@/lib/supabase'

export function FileEngineApp() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const authUser = await getUser()
      if (authUser) {
        const profile = await getProfile(authUser.id)
        const subscription = await getSubscription(authUser.id)
        setUser({
          id: authUser.id,
          name: profile?.full_name || 'User',
          email: authUser.email,
          plan: subscription?.plan || 'free'
        })
      }
      setLoading(false)
    }
    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          loadUser()
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <LoadingScreen />
  if (!user) return <LoginRedirect />

  // ... rest of component
}
```

---

## 🤖 AI Provider Wiring

### How Auto-Failover Works

```
src/lib/key-pool.ts  → Manages multiple API keys
src/lib/ai.ts        → AI client creation & streaming
```

### Flow Diagram

```
User sends prompt
       ↓
Check Anthropic Key #1 → Success → Return
       ↓ (failed)
Check Anthropic Key #2 → Success → Return
       ↓ (failed)
Check Anthropic Key #3 → Success → Return
       ↓ (all failed)
Switch to OpenAI Key #1 → Success → Return
       ↓ (failed)
... continues through OpenAI keys
```

### Key Functions in `src/lib/ai.ts`

```typescript
// Generate with streaming (auto-selects provider)
generate(prompt, model, apiKey, context)

// Parse AI response into files
parseCodeBlocks(response)

// Model options
type AIModel = 'claude-sonnet-4' | 'claude-opus-4' | 'gpt-4o' | 'o1'
```

### Key Functions in `src/lib/key-pool.ts`

```typescript
// Get next available key (with failover)
getKeyWithFailover(preferredProvider?: 'anthropic' | 'openai')

// Mark key as rate limited
markRateLimited(key, resetInMs)

// Get pool status (for monitoring)
getPoolStatus()
```

---

## 💳 Stripe Payment Wiring

### Setup Steps

1. **Create Products in Stripe Dashboard**
   - Product: "Pro Plan" → Monthly ($29) + Yearly ($290)
   - Product: "Enterprise Plan" → Monthly ($99) + Yearly ($990)

2. **Copy Price IDs to .env.local**
   ```
   STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
   STRIPE_PRICE_PRO_YEARLY=price_xxxxx
   STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
   STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxxxx
   ```

3. **Setup Webhook**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhook/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Files

```
src/lib/stripe.ts           → Stripe client
src/lib/stripe-billing.ts   → Billing logic
src/app/api/checkout/route.ts    → Create checkout session
src/app/api/webhook/stripe/route.ts → Handle webhooks
src/app/api/billing/route.ts     → Get billing info
```

### Key Functions

```typescript
// Create checkout session (in src/lib/stripe-billing.ts)
createCheckoutSession(userId, priceId)

// Handle successful payment
handlePaymentSuccess(sessionId)

// Cancel subscription
cancelSubscription(subscriptionId)

// Get billing portal URL
getBillingPortalUrl(customerId)
```

---

## 📡 API Routes Reference

### Core Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-validated` | POST | Main generation with validation |
| `/api/generate` | POST | Simple generation (no validation) |
| `/api/validate` | POST | Validate code only |
| `/api/chat` | POST | Chat completions |

### User Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET/POST | List/create projects |
| `/api/builds` | GET/POST | List/create builds |
| `/api/usage` | GET | Get usage stats |

### Payment Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/checkout` | POST | Create Stripe checkout |
| `/api/billing` | GET | Get billing info |
| `/api/webhook/stripe` | POST | Stripe webhooks |

### Generate Route Request Format

```typescript
// POST /api/generate-validated
{
  prompt: string,           // Required: What to build
  projectId?: string,       // Optional: Project context
  buildId?: string,         // Optional: Build tracking
  model?: string,           // Optional: 'claude-sonnet-4' (default)
  strictMode?: boolean,     // Optional: Extra validation
  maxFixIterations?: number // Optional: Max AI fix attempts
}
```

### Generate Route Response (SSE Stream)

```typescript
// Server-Sent Events format
data: { type: 'phase', phase: 'generating', message: '...' }
data: { type: 'chunk', content: '...' }  // Streamed content
data: { type: 'phase', phase: 'validating', message: '...' }
data: { type: 'validation', errors: 0, warnings: 1, autoFixed: 3 }
data: { type: 'complete', files: [...], validation: {...} }
```

---

## 🧩 Component Integration

### Main App Structure

```
src/components/
├── FileEngineApp.tsx      → Main app (sidebar + chat + settings)
├── sidebar/
│   └── Sidebar.tsx        → Navigation sidebar
├── settings/
│   └── SettingsPage.tsx   → Settings modal (8 tabs)
├── chat/
│   ├── NewChatPanel.tsx   → Welcome screen with templates
│   ├── ChatInput.tsx      → Message input
│   └── ChatMessage.tsx    → Message display
└── ui/
    └── ...                → Reusable UI components
```

### Wiring Chat to API

Current `FileEngineApp.tsx` calls `/api/generate-validated`. To handle SSE properly:

```typescript
const handleSendMessage = async (content: string) => {
  // ... add user message to state

  const response = await fetch('/api/generate-validated', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: content, model: selectedModel })
  })

  // Handle Server-Sent Events
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        
        switch (data.type) {
          case 'chunk':
            // Append to assistant message
            break
          case 'validation':
            // Show validation status
            break
          case 'complete':
            // Handle completed generation
            break
          case 'error':
            // Handle error
            break
        }
      }
    }
  }
}
```

### Wiring Settings to Database

Current `SettingsPage.tsx` has local state. To persist:

```typescript
// In GeneralSettings component
const saveProfile = async () => {
  const user = await getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({
      full_name: displayName,
      preferred_model: selectedModel
    })
    .eq('id', user.id)
}

const loadProfile = async () => {
  const user = await getUser()
  if (!user) return

  const profile = await getProfile(user.id)
  setDisplayName(profile?.full_name || '')
  setSelectedModel(profile?.preferred_model || 'claude-sonnet-4')
}

useEffect(() => { loadProfile() }, [])
```

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Unauthorized" errors | Check Supabase keys in .env.local |
| AI not responding | Check API keys, verify they have credits |
| Stripe webhook failing | Verify webhook secret, check URL is accessible |
| Build errors | Run `npm run type-check` to find TypeScript errors |
| SSR errors | Check for `window`/`document` usage outside `useEffect` |

### Verifying Setup

```bash
# Check TypeScript
npm run type-check

# Check linting
npm run lint

# Build for production
npm run build

# If all pass, you're ready to deploy!
```

### Debug Mode

Add to `.env.local`:
```
NODE_ENV=development
DEBUG=true
```

Then check console for detailed logs.

---

## 📝 What Dev MUST Do

### Required Steps (Do these first)

- [ ] Create Supabase project
- [ ] Copy Supabase URL and keys to .env.local
- [ ] Run schema.sql in Supabase SQL Editor
- [ ] Get at least 1 Anthropic or OpenAI API key
- [ ] Add API key(s) to .env.local
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Test signup/login flow
- [ ] Test chat generation

### Optional Steps (For full features)

- [ ] Add multiple API keys for failover
- [ ] Create Stripe account and products
- [ ] Setup Stripe webhook
- [ ] Connect GitHub for deployment
- [ ] Connect Vercel for preview deploys

### Files That Need Customization

| File | What to Change |
|------|----------------|
| `src/components/FileEngineApp.tsx` | Wire real auth instead of hardcoded user |
| `src/components/settings/SettingsPage.tsx` | Wire to Supabase for persistence |
| `src/app/page.tsx` | Customize landing page content |
| `src/app/pricing/page.tsx` | Update pricing to match your Stripe products |

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import to Vercel
3. Add all environment variables
4. Deploy

### Environment Variables in Vercel

Go to Project Settings → Environment Variables and add ALL the variables from `.env.local`.

### Post-Deployment

1. Update Stripe webhook URL to production domain
2. Switch Stripe to live mode
3. Test payment flow with real card

---

**Questions?** Check the code comments or search for `TODO` in the codebase.
