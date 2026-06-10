'use client'

import { useEffect, useState } from 'react'

type HealthStatus = { supabase: boolean; anthropic: boolean; stripe: boolean }

function StatusDot({ ok }: { ok: boolean | undefined }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: ok === undefined ? '#52525b' : ok ? '#22c55e' : '#dc2626',
      flexShrink: 0,
    }} />
  )
}

export default function AdminSystemStatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  const refresh = () => {
    setHealth(null)
    fetch('/api/admin/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data)
        setCheckedAt(new Date().toLocaleString('en-GB'))
      })
      .catch(() => {
        setHealth({ supabase: false, anthropic: false, stripe: false })
        setCheckedAt(new Date().toLocaleString('en-GB'))
      })
  }

  useEffect(() => { refresh() }, [])

  const services = [
    { label: 'Supabase', desc: 'Database & Auth', ok: health?.supabase },
    { label: 'Anthropic API', desc: 'AI features (check-ins, forecasts, contracts)', ok: health?.anthropic },
    { label: 'Stripe', desc: 'Billing & subscriptions', ok: health?.stripe },
  ]

  return (
    <div style={{ padding: 28, fontFamily: "'Inter', system-ui, sans-serif", color: '#fafafa', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px' }}>System Status</h1>
        <button
          onClick={refresh}
          style={{ fontSize: 12, fontWeight: 500, color: '#a5b4fc', background: 'rgba(99,102,241,.12)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Refresh
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
        {checkedAt ? `Last checked: ${checkedAt}` : 'Checking…'}
      </p>

      <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18 }}>
        {services.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #1f1f1f' }}>
            <StatusDot ok={s.ok} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{s.desc}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: s.ok === undefined ? '#a1a1aa' : s.ok ? '#22c55e' : '#dc2626' }}>
              {s.ok === undefined ? 'Checking…' : s.ok ? 'Operational' : 'Down'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
