'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Subcontractor, Project } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Star({ filled }: { filled: boolean }) {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill={filled ? '#D4561A' : 'none'} stroke={filled ? '#D4561A' : '#DDD9D0'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}

const BADGES: { key: string; label: string }[] = [
  { key: 'verified_id', label: 'Verified ID' },
  { key: 'insured', label: 'Insured' },
  { key: 'cscs', label: 'CSCS' },
  { key: 'gas_safe', label: 'Gas Safe' },
  { key: 'niceic', label: 'NICEIC' },
  { key: 'part_p', label: 'Part P' },
]

const TRADES = ['All trades', 'Electrician', 'Plumber', 'Plasterer', 'Roofer', 'Groundworker', 'Carpenter', 'Tiler', 'Painter', 'Bricklayer', 'Gas Engineer']

export default function MarketplacePage() {
  const { toast } = useToast()
  const [subs, setSubs] = useState<Subcontractor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [trade, setTrade] = useState('All trades')
  const [maxRate, setMaxRate] = useState(600)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [inviteSub, setInviteSub] = useState<Subcontractor | null>(null)
  const [inviteProject, setInviteProject] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('subcontractors').select('*').order('name')
    setSubs((data as Subcontractor[]) || [])
    const { data: ps } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
    setProjects((ps as Project[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleInvite = async () => {
    if (!inviteSub || !inviteProject) return
    setSending(true)
    await new Promise<void>(r => setTimeout(r, 800))
    setSending(false)
    setInviteSub(null)
    setInviteProject('')
    setInviteMsg('')
    toast(`Invite sent to ${inviteSub.name}`)
  }

  const filtered = subs.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.trade.toLowerCase().includes(search.toLowerCase())) return false
    if (trade !== 'All trades' && s.trade !== trade) return false
    if (s.day_rate && s.day_rate > maxRate) return false
    if (verifiedOnly && !s.verified) return false
    return true
  })

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Sub Marketplace</span>
        </div>
        <span className="text-xs text-[#9B978F]">{filtered.length} subcontractors</span>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Subcontractor Marketplace</h1>
          <p className="text-xs text-[#9B978F] mt-1">Verified tradespeople ready to work on your sites. Invite directly to any active project.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1">Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or trade..." className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1">Trade</label>
            <select value={trade} onChange={e => setTrade(e.target.value)} className="border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
              {TRADES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="w-44">
            <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1">Max day rate: £{maxRate}</label>
            <input type="range" min={100} max={800} step={25} value={maxRate} onChange={e => setMaxRate(parseInt(e.target.value))} className="w-full accent-[#D4561A]" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="accent-[#D4561A] w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-gray-700">Verified only</span>
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="animate-pulse h-44 bg-gray-100 rounded-[10px]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-semibold text-gray-500">No subcontractors match your filters</p>
            <p className="text-xs text-[#9B978F] mt-1">Try adjusting the trade or rate range</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(sub => {
              const certMap = (sub.certifications as Record<string, boolean> | null) ?? {}
              const badges = BADGES.filter(b => certMap[b.key])
              return (
                <div key={sub.id} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4561A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {sub.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900">{sub.name}</span>
                          {sub.verified && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#1A6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="#1A6B45" strokeWidth="1.5"/></svg>
                          )}
                        </div>
                        <div className="text-xs text-[#9B978F]">{sub.trade}</div>
                      </div>
                    </div>
                    {sub.day_rate && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">£{sub.day_rate}</div>
                        <div className="text-[10px] text-[#9B978F]">per day</div>
                      </div>
                    )}
                  </div>
                  {sub.rating !== null && sub.rating !== undefined && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} filled={i <= (sub.rating ?? 0)} />)}
                      </div>
                      <span className="text-[11px] text-[#9B978F]">{(sub.rating ?? 0).toFixed(1)}</span>
                    </div>
                  )}
                  {sub.location && (
                    <div className="flex items-center gap-1 text-[11px] text-[#9B978F] mb-3">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                      {sub.location}
                    </div>
                  )}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {badges.map(b => (
                        <span key={b.key} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5EE] text-[#1A6B45]">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    {sub.availability ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5EE] text-[#1A6B45]">Available now</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-[#9B978F]">Busy</span>
                    )}
                    <button onClick={() => setInviteSub(sub)} className="text-xs font-semibold text-white bg-[#D4561A] px-3 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
                      Invite to job
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {inviteSub && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setInviteSub(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Invite to Job</h3>
                <p className="text-[11px] text-[#9B978F] mt-0.5">{inviteSub.name} · {inviteSub.trade}</p>
              </div>
              <button onClick={() => setInviteSub(null)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project *</label>
                <select value={inviteProject} onChange={e => setInviteProject(e.target.value)} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Message (optional)</label>
                <textarea value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} rows={3} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder={`Hi ${inviteSub.name.split(' ')[0]}, we have a project in...`} />
              </div>
              {inviteSub.day_rate && (
                <div className="bg-[#F7F6F2] rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-[#9B978F]">Agreed rate</span>
                  <span className="text-sm font-bold font-mono text-gray-900">£{inviteSub.day_rate}/day</span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setInviteSub(null)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleInvite} disabled={sending || !inviteProject} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
