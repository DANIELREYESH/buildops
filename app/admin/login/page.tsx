'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_AUTH_KEY = 'admin_auth'
const ADMIN_AUTH_VALUE = 'buildops_admin_2026'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_AUTH_VALUE) {
      window.localStorage.setItem(ADMIN_AUTH_KEY, ADMIN_AUTH_VALUE)
      router.push('/admin/dashboard')
    } else {
      setError('Incorrect password')
    }
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
        maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.6px', color: '#fff', marginBottom: 6 }}>
            Build<span style={{ color: '#6366f1' }}>Ops</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>Admin Access</div>
          <div style={{ fontSize: 13, color: '#666' }}>Enter admin password</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#a1a1aa', marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              style={{ width: '100%', background: '#0a0a0a', border: `1px solid ${error ? '#dc2626' : '#2a2a2a'}`, borderRadius: 9, padding: '11px 14px', fontSize: 14, color: '#fafafa', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,.12)' }}
              onBlur={e => { e.target.style.borderColor = error ? '#dc2626' : '#2a2a2a'; e.target.style.boxShadow = 'none' }}
            />
            {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{error}</p>}
          </div>

          <button
            type="submit"
            style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-.1px' }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
