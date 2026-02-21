'use client'
import { BRAND_NAME } from '@/lib/brand'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { verifyEmailOtp, verifyPasswordResetOtp, sendPasswordResetOtp } from '@/lib/supabase'

const TOTAL = 8

export default function VerifyOtpPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const type = (params.get('type') ?? 'signup') as 'signup' | 'recovery'

  const [digits, setDigits] = useState<string[]>(Array(TOTAL).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [resendLoading, setResendLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleDigitChange(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < TOTAL - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, TOTAL)
    const next = Array(TOTAL).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length, TOTAL - 1)]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = digits.join('')
    if (token.length < TOTAL) {
      setError(`Please enter the full ${TOTAL}-digit code`)
      return
    }
    setLoading(true)
    setError('')

    const { error } =
      type === 'signup'
        ? await verifyEmailOtp(email, token)
        : await verifyPasswordResetOtp(email, token)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(type === 'signup' ? '/dashboard' : '/auth/reset-password')
    }
  }

  async function handleResend() {
    setResendLoading(true)
    setError('')
    await sendPasswordResetOtp(email)
    setResendLoading(false)
    setResendCooldown(60)
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
          {/* Email icon */}
          <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>✉️</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent an {TOTAL}-digit code to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* OTP digit boxes */}
            <div
              onPaste={handlePaste}
              style={{
                display: 'flex',
                gap: 6,
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  style={{
                    width: 40,
                    height: 50,
                    background: 'var(--bg-tertiary)',
                    border: `2px solid ${d ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    flexShrink: 0,
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--accent-primary)'
                    e.target.style.boxShadow = '0 0 0 2px var(--accent-glow)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = d ? 'var(--border-default)' : 'var(--border-subtle)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              ))}
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          {/* Resend */}
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            {resendCooldown > 0 ? (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Resend code in <strong style={{ color: 'var(--text-secondary)' }}>{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  textDecoration: 'underline',
                  padding: 0,
                  opacity: resendLoading ? 0.5 : 1,
                }}
              >
                {resendLoading ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>

          <p className="auth-footer" style={{ marginTop: 16 }}>
            <Link href={type === 'signup' ? '/auth/signup' : '/auth/forgot-password'}>
              ← Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
