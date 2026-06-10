'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, Activity, LogOut,
} from 'lucide-react'

const ADMIN_AUTH_KEY = 'admin_auth'
const ADMIN_AUTH_VALUE = 'buildops_admin_2026'

const NAV = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { label: 'System Status', href: '/admin/system-status', icon: Activity },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecked(true)
      return
    }
    const auth = typeof window !== 'undefined' ? window.localStorage.getItem(ADMIN_AUTH_KEY) : null
    if (auth !== ADMIN_AUTH_VALUE) {
      router.replace('/admin/login')
      return
    }
    setChecked(true)
  }, [pathname, router])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (!checked) {
    return <div style={{ minHeight: '100vh', background: '#080808' }} />
  }

  const handleLogout = () => {
    window.localStorage.removeItem(ADMIN_AUTH_KEY)
    router.replace('/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <aside style={{ width: 220, background: '#0c0c0c', borderRight: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.5px', color: '#fff' }}>
            Build<span style={{ color: '#6366f1' }}>Ops</span>
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Admin Panel</div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  marginBottom: 2,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: active ? '#c7d2fe' : '#a1a1aa',
                  background: active ? 'rgba(99,102,241,.12)' : 'transparent',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 10, borderTop: '1px solid #1f1f1f' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: '#a1a1aa',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
