'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter — £49/mo',
  pro: 'Pro — £119/mo',
  enterprise: 'Enterprise — Custom pricing',
}

function SignupForm() {
  const params = useSearchParams()
  const plan = params.get('plan') ?? ''

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: Replace with Supabase Auth
    await new Promise(r => setTimeout(r, 700))
    window.localStorage.setItem('buildops_logged_in', 'true')
    window.location.href = '/app/dashboard'
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#0a0a0a',
    border: '1px solid #2a2a2a',
    borderRadius: 9,
    padding: '11px 14px',
    fontSize: 14,
    color: '#fafafa',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#a1a1aa',
    marginBottom: 6,
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundImage: 'radial-gradient(circle, #1a1a2e 1px, transparent 1px)',
      backgroundSize: '28px 28px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#111111',
        border: '1px solid #1f1f1f',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.6px', color: '#fff', marginBottom: 6 }}>
            Build<span style={{ color: '#6366f1' }}>Ops</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>Start your free trial</div>
          <div style={{ fontSize: 13, color: '#666' }}>14 days free. No credit card required.</div>
        </div>

        {plan && PLAN_LABELS[plan] && (
          <div style={{
            background: 'rgba(99,102,241,.12)',
            border: '1px solid rgba(99,102,241,.25)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13,
            color: '#a5b4fc',
            textAlign: 'center',
          }}>
            You&apos;re signing up for <strong style={{ color: '#c7d2fe' }}>{PLAN_LABELS[plan]}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full name', value: name, setter: setName, type: 'text', placeholder: 'Tom Marsh' },
            { label: 'Work email', value: email, setter: setEmail, type: 'email', placeholder: 'tom@ironcladbuilds.co.uk' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: '8+ characters' },
            { label: 'Company name', value: company, setter: setCompany, type: 'text', placeholder: 'Ironclad Builds Ltd' },
          ].map(field => (
            <div key={field.label} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{field.label}</label>
              <input
                type={field.type}
                required
                value={field.value}
                onChange={e => field.setter(e.target.value)}
                placeholder={field.placeholder}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.12)' }}
                onBlur={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 6, fontFamily: 'inherit', letterSpacing: '-.1px' }}
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: '#555' }}>Already have an account? </span>
          <Link href="/login" style={{ fontSize: 13, color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </div>

        <p style={{ fontSize: 11, color: '#444', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          By signing up you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
