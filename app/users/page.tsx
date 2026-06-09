'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { TeamMember } from '@/lib/types'

type Role = 'admin' | 'manager' | 'supervisor' | 'operative'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-accent/10 text-accent border border-accent/20',
  manager: 'bg-warning/10 text-warning border border-warning/20',
  supervisor: 'bg-success/10 text-success border border-success/20',
  operative: 'bg-muted text-text-secondary',
}

const PERMISSIONS: { key: string; label: string; roles: Role[] }[] = [
  { key: 'view_financials', label: 'View financials', roles: ['admin', 'manager'] },
  { key: 'approve_costs', label: 'Approve costs', roles: ['admin', 'manager'] },
  { key: 'manage_team', label: 'Manage team', roles: ['admin'] },
  { key: 'create_projects', label: 'Create projects', roles: ['admin', 'manager'] },
  { key: 'log_timesheets', label: 'Log timesheets', roles: ['admin', 'manager', 'supervisor', 'operative'] },
  { key: 'send_checkins', label: 'Send check-ins', roles: ['admin', 'manager', 'supervisor', 'operative'] },
  { key: 'view_contracts', label: 'View contracts', roles: ['admin', 'manager', 'supervisor'] },
  { key: 'billing_access', label: 'Billing access', roles: ['admin'] },
]

const BILLING_HISTORY = [
  { date: '2026-06-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — Jun 2026' },
  { date: '2026-05-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — May 2026' },
  { date: '2026-04-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — Apr 2026' },
  { date: '2026-03-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — Mar 2026' },
]

export default function UsersPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<'starter' | 'pro' | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'operative' as Role })
  const [inviteCode, setInviteCode] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: { user } }] = await Promise.all([
      supabase.from('team_members').select('*').order('created_at', { ascending: true }),
      supabase.auth.getUser(),
    ])
    setMembers((data as TeamMember[]) || [])
    if (user?.email) setUserEmail(user.email)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const genCode = (role: Role) => {
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `BOPS-${role.toUpperCase().slice(0, 3)}-${rand}`
  }

  const openInvite = () => {
    setInviteCode(genCode('operative'))
    setInviteForm({ name: '', email: '', role: 'operative' })
    setShowInvite(true)
  }

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) return
    setSaving(true)
    const { data, error } = await supabase.from('team_members').insert({
      name: inviteForm.name, email: inviteForm.email, role: inviteForm.role,
      invite_code: inviteCode, status: 'invited',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setMembers(prev => [...prev, data[0] as TeamMember])
    setShowInvite(false)
    toast(`Invite sent to ${inviteForm.email}`)
  }

  const updateRole = async (id: string, role: Role) => {
    const { error } = await supabase.from('team_members').update({ role }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    toast('Role updated')
  }

  const removeMember = async (id: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    toast('Member removed')
  }

  const handleUpgrade = async (plan: 'starter' | 'pro') => {
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: userEmail }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast(data.error || 'Stripe not configured — add real keys to .env.local', 'warning')
      }
    } catch {
      toast('Failed to start checkout', 'error')
    }
    setCheckoutLoading(null)
  }

  const handleManagePlan = async () => {
    toast('Stripe portal requires a real customer ID — connect Stripe to enable', 'info')
  }

  const roles: Role[] = ['admin', 'manager', 'supervisor', 'operative']

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12 max-w-4xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Users & Billing</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Manage your team access and subscription.</p>
          </div>
          <button onClick={openInvite} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
            + Invite User
          </button>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Plan card */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-text-primary">BuildOps Pro</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">Active</span>
              </div>
              <div className="text-xs text-text-muted">£199 / month · Renews 1 Jul 2026 · Unlimited projects · All modules</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowUpgrade(true)} className="text-xs font-semibold text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                Change plan
              </button>
              <button onClick={handleManagePlan} className="text-xs font-semibold text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors">
                Manage billing
              </button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wide text-text-muted font-semibold">Team seats</span>
              <span className="text-xs font-bold text-text-primary">{members.length + 1} / unlimited</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(((members.length + 1) / 20) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Team table */}
          <div className="col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Team Members</span>
              <span className="text-[11px] text-text-muted">{members.length + 1} members</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}
              </div>
            ) : (
              <table className="w-full min-w-[600px]">
                <thead><tr className="bg-background border-b border-border">
                  <th className="px-5 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Member</th>
                  <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Role</th>
                  <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Status</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody>
                  {/* Account owner row */}
                  <tr className="border-b border-border hover:bg-[#111111]/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-[10px] font-bold">
                          {userEmail?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-text-primary">You</div>
                          <div className="text-[10px] text-text-muted">{userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-accent/10 text-accent border border-accent/20">Admin</span></td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-success/10 text-success border border-success/20">Active</span></td>
                    <td />
                  </tr>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-border hover:bg-[#111111]/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-text-secondary text-[10px] font-bold">
                            {m.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-text-primary">{m.name}</div>
                            <div className="text-[10px] text-text-muted">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={m.role} onChange={e => updateRole(m.id, e.target.value as Role)} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${ROLE_COLORS[m.role as Role] || 'bg-muted text-text-secondary'}`}>
                          {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${m.status === 'active' ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                          {m.status === 'active' ? 'Active' : 'Invited'}
                        </span>
                      </td>
                      <td className="pr-3">
                        <button onClick={() => removeMember(m.id)} className="text-text-muted hover:text-danger transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Permissions grid */}
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-bold text-text-primary">Permissions</span>
            </div>
            <table className="w-full min-w-[600px]">
              <thead><tr className="bg-background border-b border-border">
                <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left"></th>
                {roles.map(r => <th key={r} className="px-2 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-center capitalize">{r.slice(0, 3)}</th>)}
              </tr></thead>
              <tbody>
                {PERMISSIONS.map(perm => (
                  <tr key={perm.key} className="border-t border-border">
                    <td className="px-4 py-2 text-[10px] text-text-secondary">{perm.label}</td>
                    {roles.map(r => (
                      <td key={r} className="px-2 py-2 text-center">
                        {perm.roles.includes(r) ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="mx-auto"><polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <div className="w-2.5 h-0.5 bg-border mx-auto rounded-full" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing history */}
        <div className="mt-5 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-xs font-bold text-text-primary">Billing History</span>
          </div>
          <table className="w-full min-w-[600px]">
            <tbody>
              {BILLING_HISTORY.map(b => (
                <tr key={b.date} className="border-t border-border hover:bg-[#111111]/60 transition-colors">
                  <td className="px-5 py-3 text-xs text-text-primary">{b.desc}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{b.date}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-text-primary">{b.amount}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-success/10 text-success border border-success/20">{b.status}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => {
                      const content = `RECEIPT\n${b.desc}\nDate: ${b.date}\nAmount: ${b.amount}\nStatus: ${b.status}\nBuildOps Ltd`
                      const blob = new Blob([content], { type: 'text/plain' })
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `invoice-${b.date}.txt`; a.click()
                    }} className="text-[10px] text-text-muted hover:text-accent font-semibold transition-colors">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Change Plan</h3>
              <button onClick={() => setShowUpgrade(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Starter */}
                <div className="border border-border rounded-xl p-5">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Starter</div>
                  <div className="text-2xl font-black text-text-primary mb-0.5">£99<span className="text-sm font-normal text-text-muted">/mo</span></div>
                  <div className="text-[10px] text-text-muted mb-4">Up to 5 projects · 3 team members</div>
                  <ul className="space-y-1.5 mb-5">
                    {['AI Check-ins', 'Timesheets & Costs', 'Basic Reports'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleUpgrade('starter')} disabled={checkoutLoading !== null} className="w-full border border-border text-text-secondary text-xs font-semibold py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                    {checkoutLoading === 'starter' ? 'Redirecting...' : 'Downgrade to Starter'}
                  </button>
                </div>
                {/* Pro */}
                <div className="border-2 border-accent rounded-xl p-5 relative">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">Current Plan</span>
                  <div className="text-xs font-bold text-accent uppercase tracking-wide mb-1">Pro</div>
                  <div className="text-2xl font-black text-text-primary mb-0.5">£199<span className="text-sm font-normal text-text-muted">/mo</span></div>
                  <div className="text-[10px] text-text-muted mb-4">Unlimited projects · All modules</div>
                  <ul className="space-y-1.5 mb-5">
                    {['Everything in Starter', 'Invoicing & Banking', 'Integrations & Zapier', 'Priority support'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleUpgrade('pro')} disabled={checkoutLoading !== null} className="w-full bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
                    {checkoutLoading === 'pro' ? 'Redirecting...' : 'Continue with Pro'}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-text-muted text-center mt-4">All prices ex. VAT · Billed monthly · Cancel anytime</p>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Full Name *</label>
                <input value={inviteForm.name} onChange={e => setInviteForm(f=>({...f,name:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="James Whitfield" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Email *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f=>({...f,email:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {roles.map(r => (
                    <button key={r} onClick={() => { setInviteForm(f=>({...f,role:r})); setInviteCode(genCode(r)) }} className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${inviteForm.role === r ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent/50'}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-background border border-border rounded-lg px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Invite Code</div>
                <div className="font-mono text-sm font-bold text-text-primary">{inviteCode}</div>
                <div className="text-[10px] text-text-muted mt-0.5">Share this code or send an email invite</div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowInvite(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleInvite} disabled={saving || !inviteForm.name || !inviteForm.email} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
