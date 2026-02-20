'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { BRAND_SHORT, BRAND_NAME } from '@/lib/brand'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: `Perfect for trying out ${BRAND_NAME}`,
    features: [
      '3 concurrent builds',
      '10 builds per day',
      'Basic validation',
      'Community support',
      '1 project'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professional developers',
    features: [
      '10 concurrent builds',
      '100 builds per day',
      'Advanced validation + AI fixing',
      'Priority support',
      'Unlimited projects',
      'Vercel deployment',
      'Custom API keys',
      'Activity history'
    ],
    cta: 'Start Pro Trial',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    description: 'For teams and organizations',
    features: [
      '20 concurrent builds',
      'Unlimited builds',
      'All Pro features',
      'Team collaboration',
      'SSO/SAML',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option'
    ],
    cta: 'Contact Sales',
    popular: false
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelectPlan(planId: string) {
    if (!user) {
      router.push('/auth/signup')
      return
    }

    if (planId === 'free') {
      router.push('/dashboard')
      return
    }

    setLoading(planId)
    
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      })
      
      const { url, error } = await res.json()
      
      if (error) {
        alert(error)
        setLoading(null)
        return
      }
      
      window.location.href = url
    } catch (err) {
      alert('Failed to start checkout')
      setLoading(null)
    }
  }

  return (
    <div className="pricing-page">
      <div className="pricing-bg" />
      
      <header className="pricing-header">
        <Link href="/" className="pricing-logo">
          <span className="pricing-logo-mark">{BRAND_SHORT}</span>
          <span className="pricing-logo-text">{BRAND_NAME}</span>
        </Link>
        
        <nav className="pricing-nav">
          {user ? (
            <Link href="/dashboard" className="pricing-nav-link">Dashboard</Link>
          ) : (
            <>
              <Link href="/auth/login" className="pricing-nav-link">Login</Link>
              <Link href="/auth/signup" className="pricing-nav-btn">Sign Up</Link>
            </>
          )}
        </nav>
      </header>

      <main className="pricing-main">
        <div className="pricing-hero">
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the plan that fits your needs. All plans include our core AI code generation.</p>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div className="pricing-badge">Most Popular</div>}
              
              <div className="pricing-card-header">
                <h2>{plan.name}</h2>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  <span className="pricing-period">{plan.period}</span>
                </div>
                <p className="pricing-description">{plan.description}</p>
              </div>

              <ul className="pricing-features">
                {plan.features.map((feature, i) => (
                  <li key={i}>
                    <span className="pricing-check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                className={`pricing-cta ${plan.popular ? 'primary' : 'secondary'}`}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-faq">
          <h2>Frequently Asked Questions</h2>
          
          <div className="faq-grid">
            <div className="faq-item">
              <h3>What counts as a build?</h3>
              <p>Each time you generate code from a prompt, that's one build. Edits to existing files in the same session don't count as new builds.</p>
            </div>
            
            <div className="faq-item">
              <h3>Can I cancel anytime?</h3>
              <p>Yes! You can cancel your subscription at any time. You'll keep access until the end of your billing period.</p>
            </div>
            
            <div className="faq-item">
              <h3>Do you offer refunds?</h3>
              <p>We offer a 14-day money-back guarantee for all paid plans. No questions asked.</p>
            </div>
            
            <div className="faq-item">
              <h3>Can I use my own API keys?</h3>
              <p>Pro and Enterprise plans allow you to use your own API keys for unlimited generation.</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .pricing-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          position: relative;
        }
        
        .pricing-bg {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .pricing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          position: relative;
          z-index: 10;
        }
        
        .pricing-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }
        
        .pricing-logo-mark {
          width: 36px;
          height: 36px;
          background: var(--accent-primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        
        .pricing-logo-text {
          font-weight: 600;
          font-size: 18px;
        }
        
        .pricing-nav {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .pricing-nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
        }
        
        .pricing-nav-link:hover {
          color: var(--text-primary);
        }
        
        .pricing-nav-btn {
          padding: 8px 16px;
          background: var(--accent-primary);
          color: white;
          border-radius: 6px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        
        .pricing-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          position: relative;
          z-index: 10;
        }
        
        .pricing-hero {
          text-align: center;
          margin-bottom: 60px;
        }
        
        .pricing-hero h1 {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        
        .pricing-hero p {
          font-size: 18px;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
        }
        
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 80px;
        }
        
        @media (max-width: 900px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
          }
        }
        
        .pricing-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 16px;
          padding: 32px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        .pricing-card.popular {
          border-color: var(--accent-primary);
          transform: scale(1.05);
        }
        
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent-primary);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        
        .pricing-card-header {
          margin-bottom: 24px;
        }
        
        .pricing-card-header h2 {
          font-size: 24px;
          margin-bottom: 12px;
        }
        
        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .pricing-amount {
          font-size: 48px;
          font-weight: 700;
        }
        
        .pricing-period {
          color: var(--text-secondary);
          font-size: 16px;
        }
        
        .pricing-description {
          color: var(--text-secondary);
          font-size: 14px;
        }
        
        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
          flex-grow: 1;
        }
        
        .pricing-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 14px;
          color: var(--text-secondary);
        }
        
        .pricing-check {
          color: var(--accent-primary);
          font-weight: 600;
        }
        
        .pricing-cta {
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .pricing-cta.primary {
          background: var(--accent-primary);
          color: white;
          border: none;
        }
        
        .pricing-cta.primary:hover {
          background: var(--accent-secondary);
        }
        
        .pricing-cta.secondary {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border-primary);
        }
        
        .pricing-cta.secondary:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        
        .pricing-cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .pricing-faq {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .pricing-faq h2 {
          text-align: center;
          font-size: 32px;
          margin-bottom: 40px;
        }
        
        .faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        
        @media (max-width: 600px) {
          .faq-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .faq-item {
          background: var(--bg-secondary);
          padding: 24px;
          border-radius: 12px;
        }
        
        .faq-item h3 {
          font-size: 16px;
          margin-bottom: 8px;
        }
        
        .faq-item p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  )
}
