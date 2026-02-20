'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { supabase, getUser, getProfile, getSubscription, logout } from '@/lib/supabase'
import { brand, BRAND_AI_NAME } from '@/lib/brand'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

const PLAN_LIMITS = {
  free: 3,
  pro: 10,
  enterprise: 20
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) loadData()
  }, [open])

  async function loadData() {
    setLoading(true)
    const user = await getUser()
    if (!user) return

    const [profileData, subData] = await Promise.all([
      getProfile(user.id),
      getSubscription(user.id)
    ])

    setProfile(profileData)
    setSubscription(subData)
    setLoading(false)
  }

  async function handleUpgrade(plan: 'pro' | 'enterprise') {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  async function handleLogout() {
    await logout()
    onClose()
    router.push('/auth/login')
  }

  if (!open) return null

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <span className="modal-title">Profile</span>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</p>
        ) : profile && (
          <>
            <div className="profile-header">
              <div className="profile-avatar-large">
                {profile.full_name?.[0] || 'U'}
              </div>
              <div className="profile-info">
                <h3>{profile.full_name || 'User'}</h3>
                <p>{profile.email}</p>
                <div className="profile-badge">{brand.logo.emoji} {subscription?.plan || 'free'} Plan</div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-value">--</div>
                <div className="stat-card-label">Projects</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">--</div>
                <div className="stat-card-label">Builds</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">99.9%</div>
                <div className="stat-card-label">Uptime</div>
              </div>
            </div>

            <div className="modal-capacity">
              <div className="capacity-header">
                <span className="capacity-title">Max Concurrent Builds</span>
                <span className="capacity-value">
                  {PLAN_LIMITS[subscription?.plan as keyof typeof PLAN_LIMITS] || 3} builds
                </span>
              </div>
              <div className="capacity-bar">
                <div className="capacity-fill" style={{ width: '100%' }} />
              </div>
              <div className="capacity-details">
                <span>{subscription?.plan || 'Free'} Plan Limit</span>
                {subscription?.plan !== 'enterprise' && <span>Upgrade for more →</span>}
              </div>
            </div>

            <div className={`plan-card ${subscription?.plan === 'pro' ? 'current' : ''}`}>
              <div className="plan-header">
                <div>
                  <div className="plan-name">Pro Plan</div>
                  <div className="plan-price"><strong>$29</strong>/mo</div>
                </div>
                {subscription?.plan === 'pro' && <span className="plan-badge">Current</span>}
              </div>
              <div className="plan-features">
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> 10 concurrent builds</div>
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> Unlimited projects</div>
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> {BRAND_AI_NAME} Models</div>
              </div>
            </div>

            <div className={`plan-card ${subscription?.plan === 'enterprise' ? 'current' : ''}`}>
              <div className="plan-header">
                <div>
                  <div className="plan-name">Enterprise</div>
                  <div className="plan-price"><strong>$99</strong>/mo</div>
                </div>
                {subscription?.plan === 'enterprise' && <span className="plan-badge">Current</span>}
              </div>
              <div className="plan-features">
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> 20 concurrent builds</div>
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> Zero throttling</div>
                <div className="plan-feature"><span className="plan-feature-icon">✓</span> Team seats (10)</div>
              </div>
            </div>

            {subscription?.plan !== 'enterprise' && (
              <button 
                className="btn-upgrade" 
                onClick={() => handleUpgrade(subscription?.plan === 'free' ? 'pro' : 'enterprise')}
              >
                {brand.logo.emoji} Upgrade to {subscription?.plan === 'free' ? 'Pro' : 'Enterprise'}
              </button>
            )}

            <button className="btn-logout" onClick={handleLogout}>
              Log Out
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
