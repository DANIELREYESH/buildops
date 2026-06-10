'use client'
type Role = 'admin' | 'manager' | 'supervisor' | 'operative'

const ROLES: { key: Role; label: string; color: string; desc: string }[] = [
  { key: 'admin',      label: 'Admin',      color: 'bg-accent/10 text-accent border border-accent/20', desc: 'Full access to all modules, billing and team management.' },
  { key: 'manager',    label: 'Manager',    color: 'bg-warning/10 text-warning border border-warning/20', desc: 'Can create projects, approve costs and manage operatives.' },
  { key: 'supervisor', label: 'Supervisor', color: 'bg-success/10 text-success border border-success/20', desc: 'Can log timesheets, check-ins and view project financials.' },
  { key: 'operative',  label: 'Operative',  color: 'bg-muted text-text-secondary',  desc: 'Can log own hours and submit check-ins only.' },
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
      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    </div>
  )
  return (
    <div className="flex items-center justify-center">
      <div className="w-4 h-0.5 bg-border rounded-full" />
    </div>
  )
}

export default function PermissionsPage() {
  return (
      <div className="pt-6 px-6 pb-12">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Role Permissions</h1>
          <p className="text-sm text-text-secondary mt-0.5">Access levels by role. Assign roles to team members in Users &amp; Billing.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {ROLES.map(r => (
            <div key={r.key} className="bg-surface border border-border rounded-xl p-4">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${r.color} mb-2`}>{r.label}</span>
              <p className="text-[11px] text-text-muted leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Permissions grid */}
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-muted text-text-muted border-b border-border">
                <th className="px-5 py-3 text-[9px] uppercase tracking-wide font-semibold text-left w-[44%]">Permission</th>
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
                  <tr key={perm.label} className="border-t border-border hover:bg-muted/60 transition-colors">
                    <td className="px-5 py-2.5">
                      {i === 0 && (
                        <div className="text-[9px] uppercase tracking-widest font-bold text-text-muted mb-1">{section}</div>
                      )}
                      <span className="text-xs text-text-secondary">{perm.label}</span>
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
)
}
