'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#fff',
        padding: 20,
        margin: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          maxWidth: 500,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Critical Error</h1>
          <p style={{ 
            color: '#888', 
            marginBottom: 24,
            fontSize: 14
          }}>
            Something went seriously wrong. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 24px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
