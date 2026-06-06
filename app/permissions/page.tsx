'use client'

import AppLayout from '@/app/dashboard/layout'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

type Role = 'admin' | 'manager' | 'supervisor' | 'operative'

const ROLES: { key: Role; label: string; color: string; desc: string }[] = [
  { key: 'admin',      label: 'Admin',      color: 'bg-[#EBF0FD] text-[#1A3FAA]', desc: 'Full access to all modules, billing and team management.' },
  { key: 'manager',    label: 'Manager',    color: 'bg-[#FEF6E4] text-[#96670A]', desc: 'Can create projects, approve costs and manage operatives.' },
  { key: 'supervisor', label: 'Supervisor', color: 'bg-[#E8F5EE] text-[#1A6B45]', desc: 'Can log timesheets, check-ins and view project financials.' },
  { key: 'operative',  label: 'Operative',  color: 'bg-gray-100 text-[#9B978F]',  desc: 'Can log own hours and submit check-ins only.' },
]

const PERMISSIONS: { label: string; section: string; roles: Role[] }[] = [
  // Finance
  { label: 'View financials & budgets',  section: 'Finance',   roles: ['admin', 'manager'] },
  { label: 'Approve & log costs',        section: 'Finance',   roles: ['admin', 'manager'] },
  { label: 'Scan receipts',              section: 'Finance',   roles: ['admin', 'manager', 'supervisor'] },
  { label: 'View budget vs real',        section: 'Finance',   roles: ['admin', 'manager', 'supervisor'] },
  { label: 'Access billing & invoices',  section: 'Finance',   roles: ['admin'] },
  // Projects
  { label: 'Create & edit projects',     section: 'Projects',  roles: ['admin', 'manager'] },
  { label: 'View all projects',          section: 'Projects',  roles: ['admin', 'manager', 'supervisor'] },
  { label: 'View own project',           section: 'Projects',  roles: ['admin', 'manager', 'supervisor', 'operative'] },
  { label: 'Manage tasks',               section: 'Projects',  roles: ['admin', 'manager', 'supervisor'] },
  // Ops
  { label: 'Log own timesheets',         section: 'Operations',roles: ['admin', 'manager', 'supervisor', 'operative'] },
  { label: 'View all timesheets',        section: 'Operations',roles: ['admin', 'manager'] },
  { label: 'Submit check-ins',           section: 'Operations',roles: ['admin', 'manager', 'supervisor', 'operative'] },
  { label: 'Resolve check-in issues',    section: 'Operations',roles: ['admin', 'manager'] },
  // Clients
  { label: 'Generate & sign contracts',  section: 'Clients',   roles: ['admin', 'manager'] },
  { label: 'View contracts',             section: 'Clients',   roles: ['admin', 'manager', 'supervisor'] },
  { label: 'Manage client requests',     section: 'Clients',   roles: ['admin', 'manager'] },
  { label: 'Access client portal',       section: 'Clients',   roles: ['admin', 'manager', 'supervisor'] },
  // Team
  { label: 'Invite & remove team members',section: 'Team',     roles: ['admin'] },
  { label: 'Change team roles',          section: 'Team',      roles: ['admin'] },
  { label: 'Manage sub payments',        section: 'Team',      roles: ['admin', 'manager'] },
  { label: 'Access sub marketplace',     section: 'Team',      roles: ['admin', 'manager'] },
]

const SECTIONS = ['Finance', 'Projects', 'Operations', 'Clients', 'Team']

function Check({ has }: { has: boolean }) {
  if (has) return (
    <div className="flex items-center justify-center">
      <div className="w-5 h-5 rounded-full bg-[#E8F5EE] flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#1A6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  )
  return (
    <div className="flex items-center justify-center">
      <div className="w-4 h-0.5 bg-[#E5E2DB] rounded-full" />
    </div>
  )
}

export default function PermissionsPage() {
  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Permissions</span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Role Permissions</h1>
          <p className="text-xs text-[#9B978F] mt-1">Access levels by role. Assign roles to team members in Users &amp; Billing.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {ROLES.map(r => (
            <div key={r.key} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${r.color} mb-2`}>{r.label}</span>
              <p className="text-[11px] text-[#9B978F] leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Permissions grid */}
        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E5E2DB]">
                <th className="px-5 py-3 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left w-[44%]">Permission</th>
                {ROLES.map(r => (
                  <th key={r.key} className="px-3 py-3 text-center w-[14%]">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${r.color}`}>{r.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map(section => {
                const rows = PERMISSIONS.filter(p => p.section === section)
                return rows.map((perm, i) => (
                  <tr key={perm.label} className={`border-t border-[#F0EDE8] hover:bg-[#F7F6F2] transition-colors ${i === 0 ? 'border-t-[#DDD9D0]' : ''}`}>
                    <td className="px-5 py-2.5">
                      {i === 0 && (
                        <div className="text-[9px] uppercase tracking-widest font-bold text-[#9B978F] mb-1">{section}</div>
                      )}
                      <span className="text-xs text-gray-700">{perm.label}</span>
                    </td>
                    {ROLES.map(r => (
                      <td key={r.key} className="px-3 py-2.5">
                        <Check has={perm.roles.includes(r.key)} />
                      </td>
                    ))}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
