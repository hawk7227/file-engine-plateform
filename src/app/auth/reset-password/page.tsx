'use client'
import { BRAND_NAME } from '@/lib/brand'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updatePassword, supabase } from '@/lib/supabase'


export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Check that user has an active recovery session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (!session) {
        // No session — redirect back to forgot password
        router.replace('/auth/forgot-password')
      } else {
        setSessionReady(true)
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await updatePassword(password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Sign out so user logs in fresh with new password
      await supabase.auth.signOut()
      router.push('/auth/login?reset=success')
    }
  }

  if (!sessionReady) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        <div className="auth-container">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 80 }}>
            Checking session...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-mark">FE</div>
          <div className="auth-logo-text">{BRAND_NAME}</div>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">Set new password</h1>
          <p className="auth-subtitle">Choose a strong password for your account.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
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
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <p className="auth-footer">
            <Link href="/auth/login">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
