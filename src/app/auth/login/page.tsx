'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login, loginWithOAuth } from '@/lib/supabase'
import { BRAND_SHORT, BRAND_NAME } from '@/lib/brand'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await login(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to continue building</p>
          
          {error && <div className="auth-error">{error}</div>}
          
          <form onSubmit={handleSubmit}>
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
              />
            </div>
            <div className="forgot-password">
              <Link href="/auth/forgot-password">Forgot password?</Link>
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="form-divider">or continue with</div>
          
          <button className="btn-social" onClick={() => handleOAuth('google')}>
            🔵 Continue with Google
          </button>
          <button className="btn-social" onClick={() => handleOAuth('github')}>
            ⚫ Continue with GitHub
          </button>
          
          <p className="auth-footer">
            Don't have an account? <Link href="/auth/signup">Sign up</Link>
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
