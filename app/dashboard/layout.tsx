'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ToastProvider } from '@/lib/toast'

// ── Icon Components ────────────────────────────────────────────────────────────

const S = { stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const IcoDashboard = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...S} />
    <polyline points="9,22 9,12 15,12 15,22" {...S} />
  </svg>
)
const IcoProjects = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <polygon points="12 2 2 7 12 12 22 7 12 2" {...S} />
    <polyline points="2 17 12 22 22 17" {...S} />
    <polyline points="2 12 12 17 22 12" {...S} />
  </svg>
)
const IcoCheckins = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...S} />
  </svg>
)
const IcoTasks = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <polyline points="9 11 12 14 22 4" {...S} />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...S} />
  </svg>
)
const IcoTimesheets = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" {...S} />
    <polyline points="12 6 12 12 16 14" {...S} />
  </svg>
)
const IcoCosts = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <line x1="18" y1="20" x2="18" y2="10" {...S} />
    <line x1="12" y1="20" x2="12" y2="4" {...S} />
    <line x1="6" y1="20" x2="6" y2="14" {...S} />
  </svg>
)
const IcoTickets = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" {...S} />
    <circle cx="12" cy="13" r="4" {...S} />
  </svg>
)
const IcoSuppliers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="3" width="15" height="13" {...S} />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" {...S} />
    <circle cx="5.5" cy="18.5" r="2.5" {...S} />
    <circle cx="18.5" cy="18.5" r="2.5" {...S} />
  </svg>
)
const IcoPayments = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" {...S} />
    <line x1="1" y1="10" x2="23" y2="10" {...S} />
  </svg>
)
const IcoContracts = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...S} />
    <polyline points="14 2 14 8 20 8" {...S} />
    <line x1="16" y1="13" x2="8" y2="13" {...S} />
    <line x1="16" y1="17" x2="8" y2="17" {...S} />
  </svg>
)
const IcoRequests = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" {...S} />
    <path d="M13.73 21a2 2 0 01-3.46 0" {...S} />
  </svg>
)
const IcoClientPortal = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" {...S} />
    <polyline points="15 3 21 3 21 9" {...S} />
    <line x1="10" y1="14" x2="21" y2="3" {...S} />
  </svg>
)
const IcoMarketplace = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" {...S} />
    <line x1="3" y1="6" x2="21" y2="6" {...S} />
    <path d="M16 10a4 4 0 01-8 0" {...S} />
  </svg>
)
const IcoForecast = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...S} />
    <polyline points="17 6 23 6 23 12" {...S} />
  </svg>
)
const IcoUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...S} />
    <circle cx="9" cy="7" r="4" {...S} />
    <path d="M23 21v-2a4 4 0 00-3-3.87" {...S} />
    <path d="M16 3.13a4 4 0 010 7.75" {...S} />
  </svg>
)
const IcoPermissions = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" {...S} />
    <path d="M7 11V7a5 5 0 0110 0v4" {...S} />
  </svg>
)
const IcoBanking = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2" {...S} />
    <line x1="2" y1="10" x2="22" y2="10" {...S} />
  </svg>
)
const IcoInvoicing = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...S} />
    <polyline points="14 2 14 8 20 8" {...S} />
    <line x1="9" y1="15" x2="15" y2="15" {...S} />
    <line x1="9" y1="11" x2="11" y2="11" {...S} />
  </svg>
)
const IcoIntegrations = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" {...S} />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" {...S} />
  </svg>
)
const IcoLogOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" {...S} />
    <polyline points="16 17 21 12 16 7" {...S} />
    <line x1="21" y1="12" x2="9" y2="12" {...S} />
  </svg>
)
const IcoMenu = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <line x1="3" y1="6" x2="21" y2="6" {...S} />
    <line x1="3" y1="12" x2="21" y2="12" {...S} />
    <line x1="3" y1="18" x2="21" y2="18" {...S} />
  </svg>
)

// ── Navigation Data ────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; Icon: () => React.ReactElement; badge?: string }
type Section = { group: string; items: NavItem[] }

const SECTIONS: Section[] = [
  {
    group: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', Icon: IcoDashboard },
      { label: 'Projects', href: '/projects', Icon: IcoProjects },
    ],
  },
  {
    group: 'DAILY OPS',
    items: [
      { label: 'AI Check-ins', href: '/checkins', Icon: IcoCheckins, badge: '3' },
      { label: 'Tasks & Teams', href: '/tasks', Icon: IcoTasks },
      { label: 'Timesheets', href: '/timesheets', Icon: IcoTimesheets },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { label: 'Budget vs Real', href: '/costs', Icon: IcoCosts },
      { label: 'Invoicing', href: '/invoicing', Icon: IcoInvoicing },
      { label: 'Open Banking', href: '/banking', Icon: IcoBanking },
      { label: 'Scan Tickets', href: '/tickets', Icon: IcoTickets, badge: 'AI' },
      { label: 'Suppliers & Prices', href: '/suppliers', Icon: IcoSuppliers },
      { label: 'Sub Payments', href: '/payments', Icon: IcoPayments, badge: '2' },
      { label: 'Contracts', href: '/contracts', Icon: IcoContracts },
    ],
  },
  {
    group: 'CLIENTS',
    items: [
      { label: 'Client Requests', href: '/requests', Icon: IcoRequests, badge: '2' },
      { label: 'Client Portal', href: '/client-portal', Icon: IcoClientPortal },
      { label: 'Sub Marketplace', href: '/marketplace', Icon: IcoMarketplace },
      { label: 'AI Forecast', href: '/forecast', Icon: IcoForecast },
    ],
  },
  {
    group: 'SETTINGS',
    items: [
      { label: 'Users & Billing', href: '/users', Icon: IcoUsers },
      { label: 'Integrations', href: '/integrations', Icon: IcoIntegrations },
      { label: 'Permissions', href: '/permissions', Icon: IcoPermissions },
    ],
  },
]

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = email ? email[0].toUpperCase() : 'U'

  return (
    <ToastProvider>
    <div className="h-screen bg-[#F7F6F2] flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`${collapsed ? 'w-14' : 'w-56'} bg-white border-r border-[#E5E2DB] flex flex-col fixed top-0 left-0 bottom-0 z-20 transition-[width] duration-200 overflow-hidden`}
      >
        {/* Logo row */}
        <div className="h-12 flex items-center px-3 border-b border-[#E5E2DB] gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-tight whitespace-nowrap flex-1">BuildOps</span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="ml-auto text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <IcoMenu />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {SECTIONS.map((section, idx) => (
            <div key={section.group} className={idx > 0 ? 'mt-4' : ''}>
              {!collapsed && (
                <div className="px-2.5 mb-1">
                  <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase select-none">
                    {section.group}
                  </span>
                </div>
              )}
              {section.items.map(({ label, href, Icon, badge }) => {
                const active = pathname === href
                return (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    title={collapsed ? label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg mb-0.5 text-left transition-all ${
                      active
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon />
                    {!collapsed && (
                      <>
                        <span className="text-xs font-medium flex-1 truncate">{label}</span>
                        {badge && (
                          <span className="bg-[#D4561A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                            {badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-[#E5E2DB] p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-0.5">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-gray-600">{initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate leading-none">
                    {email || '—'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                  title="Sign out"
                >
                  <IcoLogOut />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        className={`${collapsed ? 'ml-14' : 'ml-56'} flex-1 overflow-y-auto h-screen transition-[margin-left] duration-200`}
      >
        {children}
      </main>
    </div>
    </ToastProvider>
  )
}
