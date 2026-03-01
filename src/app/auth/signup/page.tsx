'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, loginWithOAuth } from '@/lib/supabase'
import { BRAND_SHORT, BRAND_NAME } from '@/lib/brand'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Please agree to the Terms and Privacy Policy')
      return
    }
    setLoading(true)
    setError('')
    
    const { data, error } = await signUp(email, password, fullName)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (!data.user) {
      // Supabase returns no error but null user when email is already registered
      setError('An account with this email already exists. Please sign in instead.')
      setLoading(false)
    } else {
      // New signup — Supabase sends OTP confirmation email automatically
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&type=signup`)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    await loginWithOAuth(provider)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-mark">{BRAND_SHORT}</div>
          <div className="auth-logo-text">{BRAND_NAME}</div>
        </div>
        <div className="auth-card">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Start building in seconds — it's free</p>
          
          {error && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="John Doe"
                value={fullName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="form-checkbox">
              <input 
                type="checkbox" 
                id="terms"
                checked={agreed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreed(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>
              </label>
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="form-divider">or continue with</div>
          
          <button className="btn-social" onClick={() => handleOAuth('google')}>
             Continue with Google
          </button>
          <button className="btn-social" onClick={() => handleOAuth('github')}>
             Continue with GitHub
          </button>
          
          <p className="auth-footer">
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
        
        <div className="auth-stats">
          <div className="auth-stat">
            <div className="auth-stat-value">100K+</div>
            <div className="auth-stat-label">Users</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-value">5M+</div>
            <div className="auth-stat-label">Projects</div>
          </div>
          <div className="auth-stat">
            <div className="auth-stat-value">20</div>
            <div className="auth-stat-label">Max Builds</div>
          </div>
        </div>
      </div>
    </div>
  )
}
