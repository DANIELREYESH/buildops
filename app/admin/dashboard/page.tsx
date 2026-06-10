'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, Rocket, AlertTriangle, PoundSterling, ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type HealthStatus = { supabase: boolean; anthropic: boolean; stripe: boolean }

type ErrorLog = {
  id: string
  message: string
  source: string
  created_at: string
}

const MOCK_SIGNUPS = [
  { name: 'Tom Marsh', email: 'tom@ironcladbuilds.co.uk', plan: 'Pro', date: '2026-06-08' },
  { name: 'Sarah Chen', email: 'sarah@chenconstruction.co.uk', plan: 'Starter', date: '2026-06-05' },
  { name: 'James Okafor', email: 'james@okaforgroup.co.uk', plan: 'Enterprise', date: '2026-06-01' },
]

const MOCK_ERRORS: ErrorLog[] = [
  { id: '1', message: 'Stripe webhook signature verification failed', source: 'api/stripe/webhook', created_at: '2026-06-09T14:22:00Z' },
  { id: '2', message: 'Timeout fetching AI forecast for project #2291', source: 'api/ai-forecast', created_at: '2026-06-08T09:11:00Z' },
]

const QUICK_LINKS = [
  { label: 'View app', href: '/app/dashboard', external: false },
  { label: 'View marketing site', href: '/', external: false },
  { label: 'Supabase dashboard', href: 'https://supabase.com/dashboard', external: true },
  { label: 'Vercel dashboard', href: 'https://vercel.com/dashboard', external: true },
  { label: 'GitHub repo', href: 'https://github.com/DANIELREYESH/buildops', external: true },
]

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: ok ? '#22c55e' : '#dc2626',
      flexShrink: 0,
    }} />
  )
}

function Card({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ComponentType<{ size?: number }>; sub?: string }) {
  return (
    <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18, flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{title}</span>
        <Icon size={15} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', letterSpacing: '-.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [errors, setErrors] = useState<ErrorLog[]>(MOCK_ERRORS)

  useEffect(() => {
    fetch('/api/admin/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(() => setHealth({ supabase: false, anthropic: false, stripe: false }))

    supabase
      .from('error_logs')
      .select('id, message, source, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setErrors(data as ErrorLog[])
        }
      })
  }, [])

  const cardStyle: React.CSSProperties = { background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18 }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }

  return (
    <div style={{ padding: 28, fontFamily: "'Inter', system-ui, sans-serif", color: '#fafafa', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>Admin Dashboard</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Internal overview of BuildOps usage, system health and revenue.</p>

      {/* Top stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <Card title="Total Users" value="3" icon={Users} sub="Across all plans" />
        <Card title="Deployments / Builds" value="6" icon={Rocket} sub="Last build: succeeded" />
        <Card title="MRR" value="£597/mo" icon={PoundSterling} sub="3 active subscriptions" />
        <Card title="Recent Errors" value={String(errors.length)} icon={AlertTriangle} sub="Last 7 days" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>
        {/* Recent signups */}
        <div style={cardStyle}>
          <div style={labelStyle}>Recent Signups</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#666', textAlign: 'left' }}>
                <th style={{ paddingBottom: 8, fontWeight: 500 }}>Name</th>
                <th style={{ paddingBottom: 8, fontWeight: 500 }}>Email</th>
                <th style={{ paddingBottom: 8, fontWeight: 500 }}>Plan</th>
                <th style={{ paddingBottom: 8, fontWeight: 500 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SIGNUPS.map(s => (
                <tr key={s.email} style={{ borderTop: '1px solid #1f1f1f' }}>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '8px 0', color: '#a1a1aa' }}>{s.email}</td>
                  <td style={{ padding: '8px 0' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', background: 'rgba(99,102,241,.12)', padding: '2px 8px', borderRadius: 999 }}>{s.plan}</span>
                  </td>
                  <td style={{ padding: '8px 0', color: '#666' }}>{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System status */}
        <div style={cardStyle}>
          <div style={labelStyle}>System Status</div>
          {[
            { label: 'Supabase', ok: health?.supabase },
            { label: 'Anthropic API', ok: health?.anthropic },
            { label: 'Stripe', ok: health?.stripe },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid #1f1f1f', fontSize: 13 }}>
              <StatusDot ok={item.ok ?? false} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: item.ok ? '#22c55e' : '#dc2626', fontWeight: 600 }}>
                {health === null ? 'checking…' : item.ok ? 'Operational' : 'Down'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Recent errors */}
        <div style={cardStyle}>
          <div style={labelStyle}>Recent Errors</div>
          {errors.length === 0 ? (
            <p style={{ fontSize: 13, color: '#666' }}>No errors logged.</p>
          ) : (
            errors.map(e => (
              <div key={e.id} style={{ padding: '8px 0', borderTop: '1px solid #1f1f1f' }}>
                <div style={{ fontSize: 13, color: '#fafafa' }}>{e.message}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  {e.source} · {new Date(e.created_at).toLocaleString('en-GB')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick links */}
        <div style={cardStyle}>
          <div style={labelStyle}>Quick Links</div>
          {QUICK_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderTop: '1px solid #1f1f1f',
                fontSize: 13,
                color: '#a1a1aa',
                textDecoration: 'none',
              }}
            >
              {link.label}
              <ExternalLink size={12} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
