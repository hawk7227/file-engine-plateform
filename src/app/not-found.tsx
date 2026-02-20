import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--text-primary, #fff)',
      padding: 20
    }}>
      <div style={{
        maxWidth: 500,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>404</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Page Not Found</h1>
        <p style={{ 
          color: 'var(--text-secondary, #888)', 
          marginBottom: 24,
          fontSize: 14
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'var(--accent-primary, #6366f1)',
            color: 'white',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
