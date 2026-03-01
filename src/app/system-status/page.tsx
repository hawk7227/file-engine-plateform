'use client'

import { useState, useEffect, useCallback } from 'react'

interface ServiceCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms: number | null
  message?: string
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: ServiceCheck[]
  version: string
  node: string
  uptime: number
}

export default function SystemStatusPage() {
  const [data, setData] = useState<SystemStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system-status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const statusColor = (s: string) =>
    s === 'healthy' ? '#10b981' : s === 'degraded' ? '#eab308' : '#ef4444'

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="system-status-page">
      <style>{`
        .system-status-page {
          min-height: 100vh;
          background: var(--bg-primary, #09090b);
          color: var(--text-primary, #fafafa);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          overflow-y: auto;
        }
        .ss-container {
          max-width: 680px;
          margin: 0 auto;
          padding: 40px 24px 96px;
        }
        .ss-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .ss-title {
          font-size: 20px;
          font-weight: 600;
        }
        .ss-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-family: 'SF Mono', monospace;
        }
        .ss-subtitle {
          font-size: 13px;
          color: var(--text-muted, #52525b);
          margin-bottom: 32px;
        }
        .ss-divider {
          height: 1px;
          background: rgba(255,255,255,0.04);
          margin: 24px 0;
        }
        .ss-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #52525b);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: 'SF Mono', monospace;
          margin-bottom: 12px;
        }
        .ss-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          min-height: 44px;
          gap: 12px;
        }
        .ss-row:last-child { border-bottom: none; }
        .ss-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .ss-row-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }
        .ss-row-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .ss-latency {
          font-size: 12px;
          font-family: 'SF Mono', monospace;
          color: var(--text-muted, #52525b);
        }
        .ss-status-text {
          font-size: 12px;
          text-transform: capitalize;
        }
        .ss-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .ss-meta-key {
          font-size: 13px;
          color: var(--text-muted, #71717a);
        }
        .ss-meta-val {
          font-size: 13px;
          font-family: 'SF Mono', monospace;
          color: var(--text-secondary, #a1a1aa);
        }
        .ss-error {
          padding: 16px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          font-size: 13px;
          color: #ef4444;
        }
        .ss-loading {
          color: var(--text-muted, #52525b);
          font-size: 13px;
          padding: 40px 0;
          text-align: center;
        }
      `}</style>

      <div className="ss-container">
        <div className="ss-header">
          <h1 className="ss-title">System Status</h1>
          {data && (
            <div
              className="ss-badge"
              style={{
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: statusColor(data.status) + '33',
                background: statusColor(data.status) + '0D',
                color: statusColor(data.status),
              }}
            >
              <div className="ss-dot" style={{ background: statusColor(data.status) }} />
              {data.status === 'healthy'
                ? 'All systems operational'
                : data.status === 'degraded'
                  ? 'Degraded performance'
                  : 'Service disruption'}
            </div>
          )}
        </div>
        <div className="ss-subtitle">Auto-refreshes every 15 seconds</div>

        {loading && <div className="ss-loading">Checking services...</div>}
        {error && <div className="ss-error">{error}</div>}

        {data && (
          <>
            <div className="ss-label">Services</div>
            <div className="ss-divider" style={{ marginTop: 0 }} />

            {data.services.map((svc) => (
              <div key={svc.name} className="ss-row">
                <div className="ss-row-left">
                  <div className="ss-dot" style={{ background: statusColor(svc.status) }} />
                  <span style={{ fontSize: 14 }}>{svc.name}</span>
                </div>
                <div className="ss-row-right">
                  {svc.latency_ms !== null && (
                    <span className="ss-latency">{svc.latency_ms}ms</span>
                  )}
                  <span className="ss-status-text" style={{ color: statusColor(svc.status) }}>
                    {svc.status}
                  </span>
                </div>
              </div>
            ))}

            <div className="ss-divider" style={{ margin: '32px 0' }} />
            <div className="ss-label">Build Info</div>
            <div className="ss-divider" style={{ marginTop: 0 }} />

            {[
              ['Version', data.version],
              ['Node', data.node],
              ['Uptime', formatUptime(data.uptime)],
              ['Last Check', new Date(data.timestamp).toLocaleTimeString()],
            ].map(([k, v]) => (
              <div key={k} className="ss-meta-row">
                <span className="ss-meta-key">{k}</span>
                <span className="ss-meta-val">{v}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
