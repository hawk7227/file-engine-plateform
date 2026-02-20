export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0a)',
      color: 'var(--text-primary, #fff)'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--bg-tertiary, #333)',
          borderTopColor: 'var(--accent-primary, #6366f1)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: 14, color: 'var(--text-secondary, #888)' }}>
          Loading...
        </span>
      </div>
    </div>
  )
}
