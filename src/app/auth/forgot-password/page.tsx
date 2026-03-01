'use client'
import { BRAND_NAME } from '@/lib/brand'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendPasswordResetOtp } from '@/lib/supabase'


export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await sendPasswordResetOtp(email)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&type=recovery`)
    }
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
          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-subtitle">
            Enter your email and we'll send you a 6-digit reset code.
          </p>

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
            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Sending code...' : 'Send Reset Code'}
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
