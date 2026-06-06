'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import type { Project, Cost, Checkin, Contract } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

type ProjectDetail = Project & {
  costs: Cost[]
  checkins: Checkin[]
  contracts: Contract[]
  spent: number
}

export default function ClientPortalPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects((data as Project[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openProject = async (p: Project) => {
    setDetailLoading(true)
    const [{ data: costs }, { data: checkins }, { data: contracts }] = await Promise.all([
      supabase.from('costs').select('*').eq('project_id', p.id).order('date', { ascending: false }),
      supabase.from('checkins').select('*').eq('project_id', p.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('contracts').select('*').eq('project_id', p.id).order('created_at', { ascending: false }),
    ])
    const costArr = (costs as Cost[]) || []
    const spent = costArr.reduce((s, c) => s + c.amount, 0)
    setSelected({ ...p, costs: costArr, checkins: (checkins as Checkin[]) || [], contracts: (contracts as Contract[]) || [], spent })
    setDetailLoading(false)
  }

  const STATUS_COLORS: Record<Project['status'], string> = {
    active: 'bg-[#E8F5EE] text-[#1A6B45]',
    delayed: 'bg-[#FEF6E4] text-[#96670A]',
    on_hold: 'bg-gray-100 text-[#9B978F]',
    completed: 'bg-[#EBF0FD] text-[#1A3FAA]',
  }
  const STATUS_LABELS: Record<Project['status'], string> = {
    active: 'Active', delayed: 'Delayed', on_hold: 'On Hold', completed: 'Completed',
  }
  const CONTRACT_STATUS: Record<Contract['status'], string> = {
    draft: 'Draft', awaiting_client: 'Awaiting Signature', awaiting_company: 'Awaiting Us', active: 'Fully Executed', expired: 'Expired',
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Client Portal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0EDE8] text-[10px] font-bold text-[#9B978F]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/></svg>
            Read-only client view
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Client Portal</h1>
          <p className="text-xs text-[#9B978F] mt-1">Live project progress shared with clients. Select a project to view the full status report.</p>
        </div>

        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs text-[#9B978F] hover:text-gray-700 mb-5 group">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All projects
            </button>

            {/* Project header */}
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-6 mb-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                  {selected.address && <p className="text-xs text-[#9B978F] mt-0.5">{selected.address}</p>}
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">Overall Progress</span>
                  <span className="text-xs font-bold text-[#D4561A]">{selected.progress}%</span>
                </div>
                <div className="h-3 bg-[#F0EDE8] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${selected.progress}%`,
                      background: selected.progress >= 80 ? '#1A6B45' : selected.progress >= 50 ? '#D4561A' : '#96670A'
                    }}
                  />
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Contract Value', value: selected.budget ? fmt(selected.budget) : '—' },
                  { label: 'Costs to Date', value: fmt(selected.spent) },
                  { label: 'Remaining Budget', value: selected.budget ? fmt(selected.budget - selected.spent) : '—' },
                  { label: 'Target Completion', value: selected.deadline ? new Date(selected.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                ].map(s => (
                  <div key={s.label} className="bg-[#F7F6F2] rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{s.label}</div>
                    <div className="text-sm font-bold text-gray-900">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {/* Check-in feed */}
              <div className="col-span-2">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Latest Site Updates</h3>
                {detailLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="animate-pulse h-24 bg-gray-100 rounded-[10px]"/>)}</div>
                ) : selected.checkins.length === 0 ? (
                  <div className="bg-white border border-[#DDD9D0] rounded-[10px] p-10 text-center">
                    <p className="text-sm text-gray-400 font-semibold">No site updates yet</p>
                    <p className="text-xs text-[#9B978F] mt-1">Check-ins from your site team will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selected.checkins.map(c => (
                      <div key={c.id} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{c.worker_name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900">{c.worker_name}</div>
                              <div className="text-[10px] text-[#9B978F]">{new Date(c.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(c.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          {c.issue_flagged && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCEAE8] text-[#B8301A]">
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                              Issue
                            </span>
                          )}
                        </div>
                        <div className="bg-[#F7F6F2] rounded-lg px-3 py-2 text-xs text-gray-700 leading-relaxed">
                          {c.message}
                        </div>
                        {(c.progress_extracted !== null || c.cost_extracted !== null) && (
                          <div className="flex items-center gap-4 mt-2">
                            {c.progress_extracted !== null && (
                              <span className="text-[11px] text-[#1A3FAA] font-semibold">Progress: {c.progress_extracted}%</span>
                            )}
                            {c.cost_extracted !== null && (
                              <span className="text-[11px] text-[#9B978F]">Materials: {fmt(c.cost_extracted)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right sidebar */}
              <div className="space-y-5">
                {/* Contract status */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Contracts</h3>
                  <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
                    {selected.contracts.length === 0 ? (
                      <p className="text-xs text-[#9B978F] text-center py-6">No contracts yet</p>
                    ) : selected.contracts.map(c => (
                      <div key={c.id} className="px-4 py-3 border-b border-[#F0EDE8] last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-bold text-gray-900">{c.contract_ref}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'active' ? 'bg-[#E8F5EE] text-[#1A6B45]' : c.status === 'awaiting_client' ? 'bg-[#FEF6E4] text-[#96670A]' : 'bg-gray-100 text-[#9B978F]'}`}>
                            {CONTRACT_STATUS[c.status]}
                          </span>
                        </div>
                        {c.value && <div className="text-xs font-mono text-[#9B978F]">{fmt(c.value)}</div>}
                        {c.company_signed_at && (
                          <div className="flex items-center gap-1 text-[10px] text-[#1A6B45] mt-1">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            Signed by contractor
                          </div>
                        )}
                        {c.client_signed_at && (
                          <div className="flex items-center gap-1 text-[10px] text-[#1A6B45] mt-0.5">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            Signed by client
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost breakdown */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Cost Breakdown</h3>
                  <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
                    {selected.costs.length === 0 ? (
                      <p className="text-xs text-[#9B978F] text-center py-6">No costs logged</p>
                    ) : (() => {
                      const cats: Record<string, number> = {}
                      selected.costs.forEach(c => { cats[c.category] = (cats[c.category] || 0) + c.amount })
                      return Object.entries(cats).map(([cat, total]) => (
                        <div key={cat} className="px-4 py-2.5 border-b border-[#F0EDE8] last:border-0 flex items-center justify-between">
                          <span className="text-xs capitalize text-gray-700">{cat}</span>
                          <span className="text-xs font-mono font-bold text-gray-900">{fmt(total)}</span>
                        </div>
                      ))
                    })()}
                    {selected.costs.length > 0 && (
                      <div className="px-4 py-2.5 bg-[#F7F6F2] flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">Total</span>
                        <span className="text-xs font-mono font-bold text-[#D4561A]">{fmt(selected.spent)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                {(selected.client_name || selected.client_email || selected.client_phone) && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Client Contact</h3>
                    <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4 space-y-2">
                      {selected.client_name && <div className="text-xs font-bold text-gray-900">{selected.client_name}</div>}
                      {selected.client_email && (
                        <a href={`mailto:${selected.client_email}`} className="flex items-center gap-2 text-xs text-[#1A3FAA] hover:underline">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/></svg>
                          {selected.client_email}
                        </a>
                      )}
                      {selected.client_phone && (
                        <a href={`tel:${selected.client_phone}`} className="flex items-center gap-2 text-xs text-gray-700 hover:underline">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15z" stroke="currentColor" strokeWidth="2"/></svg>
                          {selected.client_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="animate-pulse h-40 bg-gray-100 rounded-[10px]" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm font-semibold text-gray-500">No projects yet</p>
                <p className="text-xs text-[#9B978F] mt-1">Create a project first to use the client portal</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {projects.map(p => {
                  const over = (p.budget || 0) > 0 && p.progress > 80
                  return (
                    <button key={p.id} onClick={() => openProject(p)} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-5 text-left hover:border-[#D4561A] hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round"/><polyline points="9,22 9,12 15,12 15,22" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABELS[p.status]}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-[#D4561A] transition-colors">{p.name}</h3>
                      {p.client_name && <p className="text-xs text-[#9B978F] mb-3">{p.client_name}</p>}
                      {p.address && <p className="text-[11px] text-[#9B978F] mb-3 truncate">{p.address}</p>}
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-[#9B978F]">Progress</span>
                        <span className={`text-[10px] font-bold ${over ? 'text-[#1A6B45]' : 'text-[#D4561A]'}`}>{p.progress}%</span>
                      </div>
                      <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${p.progress}%`,
                            background: p.progress >= 80 ? '#1A6B45' : p.progress >= 50 ? '#D4561A' : '#96670A'
                          }}
                        />
                      </div>
                      {p.budget && (
                        <div className="mt-3 text-xs font-mono font-bold text-gray-900">{fmt(p.budget)}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
