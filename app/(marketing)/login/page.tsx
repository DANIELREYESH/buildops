'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: Replace with Supabase Auth
    await new Promise(r => setTimeout(r, 600))
    router.push('/app/dashboard')
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
        maxWidth: 400,
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }}>
        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.6px', color: '#fff', marginBottom: 6 }}>
            Build<span style={{ color: '#6366f1' }}>Ops</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: '#666' }}>Sign in to your BuildOps account</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tom@ironcladbuilds.co.uk"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 9, padding: '11px 14px', fontSize: 14, color: '#fafafa', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.12)' }}
              onBlur={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 9, padding: '11px 14px', fontSize: 14, color: '#fafafa', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.12)' }}
              onBlur={e => { e.target.style.borderColor = '#2a2a2a'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <a href="#" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none' }}>Forgot password?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', letterSpacing: '-.1px' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
          <span style={{ fontSize: 12, color: '#444' }}>New to BuildOps?</span>
          <div style={{ flex: 1, height: 1, background: '#1f1f1f' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/signup" style={{ fontSize: 14, color: '#6366f1', fontWeight: 500, textDecoration: 'none' }}>
            Start free trial →
          </Link>
        </div>
      </div>
    </div>
  )
}
