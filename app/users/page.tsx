'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { TeamMember } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

type Role = 'admin' | 'manager' | 'supervisor' | 'operative'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-[#EBF0FD] text-[#1A3FAA]',
  manager: 'bg-[#FEF6E4] text-[#96670A]',
  supervisor: 'bg-[#E8F5EE] text-[#1A6B45]',
  operative: 'bg-gray-100 text-[#9B978F]',
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
  { date: '2026-05-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — May 2026' },
  { date: '2026-04-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — Apr 2026' },
  { date: '2026-03-01', amount: '£199.00', status: 'Paid', desc: 'BuildOps Pro — Mar 2026' },
]

export default function UsersPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const roles: Role[] = ['admin', 'manager', 'supervisor', 'operative']

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Users & Billing</span>
        </div>
        <button onClick={openInvite} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Invite User
        </button>
      </div>

      <div className="p-6 max-w-4xl">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Users & Billing</h1>
          <p className="text-xs text-[#9B978F] mt-1">Manage your team access and subscription.</p>
        </div>

        {/* Plan card */}
        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-5 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-gray-900">BuildOps Pro</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EE] text-[#1A6B45]">Active</span>
              </div>
              <div className="text-xs text-[#9B978F]">£199 / month · Renews 1 Jul 2026 · Unlimited projects · All modules</div>
            </div>
            <button className="text-xs font-semibold text-[#D4561A] hover:underline">Manage plan</button>
          </div>
          <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold">Team seats</span>
              <span className="text-xs font-bold text-gray-900">{members.length + 1} / unlimited</span>
            </div>
            <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
              <div className="h-full bg-[#D4561A] rounded-full" style={{ width: `${Math.min(((members.length + 1) / 20) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Team table */}
          <div className="col-span-2 bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F0EDE8] flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Team Members</span>
              <span className="text-[11px] text-[#9B978F]">{members.length + 1} members</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => <div key={i} className="animate-pulse h-10 bg-gray-100 rounded-lg" />)}
              </div>
            ) : (
              <table className="w-full">
                <thead><tr className="bg-[#F7F6F2]">
                  <th className="px-5 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Member</th>
                  <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Role</th>
                  <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Status</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody className="divide-y divide-[#F0EDE8]">
                  {/* Account owner row */}
                  <tr className="hover:bg-[#F7F6F2] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#D4561A] flex items-center justify-center text-white text-[10px] font-bold">
                          {userEmail?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">You</div>
                          <div className="text-[10px] text-[#9B978F]">{userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EBF0FD] text-[#1A3FAA]">Admin</span></td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5EE] text-[#1A6B45]">Active</span></td>
                    <td />
                  </tr>
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-[#F7F6F2] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold">
                            {m.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-900">{m.name}</div>
                            <div className="text-[10px] text-[#9B978F]">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={m.role} onChange={e => updateRole(m.id, e.target.value as Role)} className={`text-[9px] font-bold px-2 py-0.5 rounded-full border-0 focus:outline-none cursor-pointer ${ROLE_COLORS[m.role as Role] || 'bg-gray-100 text-gray-500'}`}>
                          {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${m.status === 'active' ? 'bg-[#E8F5EE] text-[#1A6B45]' : 'bg-[#FEF6E4] text-[#96670A]'}`}>
                          {m.status === 'active' ? 'Active' : 'Invited'}
                        </span>
                      </td>
                      <td className="pr-3">
                        <button onClick={() => removeMember(m.id)} className="text-[#9B978F] hover:text-[#B8301A] transition-colors">
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
          <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F0EDE8]">
              <span className="text-xs font-bold text-gray-900">Permissions</span>
            </div>
            <table className="w-full">
              <thead><tr className="bg-[#F7F6F2]">
                <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left"></th>
                {roles.map(r => <th key={r} className="px-2 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-center capitalize">{r.slice(0, 3)}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {PERMISSIONS.map(perm => (
                  <tr key={perm.key}>
                    <td className="px-4 py-2 text-[10px] text-gray-700">{perm.label}</td>
                    {roles.map(r => (
                      <td key={r} className="px-2 py-2 text-center">
                        {perm.roles.includes(r) ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="mx-auto"><polyline points="20 6 9 17 4 12" stroke="#1A6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <div className="w-2.5 h-0.5 bg-[#E5E2DB] mx-auto rounded-full" />
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
        <div className="mt-5 bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F0EDE8]">
            <span className="text-xs font-bold text-gray-900">Billing History</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-[#F0EDE8]">
              {BILLING_HISTORY.map(b => (
                <tr key={b.date} className="hover:bg-[#F7F6F2] transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-900">{b.desc}</td>
                  <td className="px-4 py-3 text-xs text-[#9B978F]">{b.date}</td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-900">{b.amount}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5EE] text-[#1A6B45]">{b.status}</span></td>
                  <td className="px-4 py-3"><button className="text-[10px] text-[#9B978F] hover:text-[#D4561A] font-semibold">Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Full Name *</label>
                <input value={inviteForm.name} onChange={e => setInviteForm(f=>({...f,name:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="James Whitfield" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Email *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f=>({...f,email:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Role</label>
                <div className="grid grid-cols-4 gap-2">
                  {roles.map(r => (
                    <button key={r} onClick={() => { setInviteForm(f=>({...f,role:r})); setInviteCode(genCode(r)) }} className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${inviteForm.role === r ? 'bg-[#D4561A] text-white border-[#D4561A]' : 'border-[#E5E2DB] text-gray-600 hover:border-[#D4561A]'}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#F7F6F2] rounded-lg px-4 py-3">
                <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">Invite Code</div>
                <div className="font-mono text-sm font-bold text-gray-900">{inviteCode}</div>
                <div className="text-[10px] text-[#9B978F] mt-0.5">Share this code or send an email invite</div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowInvite(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleInvite} disabled={saving || !inviteForm.name || !inviteForm.email} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
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
