'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import type { Project, Cost, Checkin, Task } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

function StatCard({ label, value, sub, color = 'text-gray-900', accent }: { label: string; value: string; sub?: string; color?: string; accent?: string }) {
  return (
    <div className={`bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4 ${accent ? `border-l-4 border-l-[${accent}]` : ''}`}>
      <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#9B978F] mt-0.5">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const [{ data: ps }, { data: cs }, { data: cis }, { data: ts }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('costs').select('*'),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tasks').select('*').neq('status', 'done').order('due_date', { ascending: true }),
    ])
    setProjects((ps as Project[]) || [])
    setCosts((cs as Cost[]) || [])
    setCheckins((cis as Checkin[]) || [])
    setTasks((ts as Task[]) || [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  const activeProjects = projects.filter(p => p.status === 'active')
  const delayedProjects = projects.filter(p => p.status === 'delayed')
  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const totalSpent = costs.reduce((s, c) => s + c.amount, 0)
  const openTasks = tasks.length
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high')
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today)
  const issueCheckins = checkins.filter(c => c.issue_flagged && c.status === 'issue')
  const todayCheckins = checkins.filter(c => c.checkin_date === today)
  const recentCheckins = checkins.slice(0, 5)

  const projName = (id: string | null) => projects.find(p => p.id === id)?.name ?? '—'

  const STATUS_COLORS: Record<Project['status'], string> = {
    active: 'bg-[#E8F5EE] text-[#1A6B45]',
    delayed: 'bg-[#FEF6E4] text-[#96670A]',
    on_hold: 'bg-gray-100 text-[#9B978F]',
    completed: 'bg-[#EBF0FD] text-[#1A3FAA]',
  }
  const STATUS_LABELS: Record<Project['status'], string> = {
    active: 'Active', delayed: 'Delayed', on_hold: 'On Hold', completed: 'Completed',
  }
  const PRIORITY_COLORS: Record<string, string> = {
    urgent: 'bg-[#FCEAE8] text-[#B8301A]',
    high: 'bg-[#FEF6E4] text-[#96670A]',
    medium: 'bg-[#EBF0FD] text-[#1A3FAA]',
    low: 'bg-gray-100 text-[#9B978F]',
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="animate-pulse grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-[10px]" />)}
          </div>
          <div className="animate-pulse h-64 bg-gray-100 rounded-[10px]" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-900">Dashboard</span>
        <button onClick={() => router.push('/projects')} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + New Project
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Overview</h1>
          <p className="text-xs text-[#9B978F] mt-1">{activeProjects.length} active projects · {todayCheckins.length} check-ins today · {issueCheckins.length} issues open</p>
        </div>

        {/* Issue alerts */}
        {issueCheckins.slice(0, 2).map(c => (
          <div key={c.id} className="mb-3 bg-[#FCEAE8] border border-[#B8301A]/20 rounded-[10px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#B8301A" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#B8301A"/></svg>
              <p className="text-xs text-[#B8301A] font-semibold">
                <span className="font-bold">{c.worker_name}</span> on {projName(c.project_id)}: {c.issue_description}
              </p>
            </div>
            <button onClick={() => router.push('/checkins')} className="text-[10px] font-bold text-[#B8301A] border border-[#B8301A]/30 px-2.5 py-1 rounded-lg hover:bg-[#f8d5d2] whitespace-nowrap">
              View →
            </button>
          </div>
        ))}

        {/* KPI row */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <StatCard label="Active Projects" value={String(activeProjects.length)} sub={delayedProjects.length > 0 ? `${delayedProjects.length} delayed` : 'All on track'} color={delayedProjects.length > 0 ? 'text-[#96670A]' : 'text-gray-900'} />
          <StatCard label="Total Budget" value={fmt(totalBudget)} sub={`${projects.length} projects`} />
          <StatCard label="Costs to Date" value={fmt(totalSpent)} sub={`${Math.round((totalSpent / (totalBudget || 1)) * 100)}% of budget`} color="text-[#D4561A]" />
          <StatCard label="Open Tasks" value={String(openTasks)} sub={`${overdueTasks.length} overdue`} color={overdueTasks.length > 0 ? 'text-[#B8301A]' : 'text-gray-900'} />
          <StatCard label="Issues Flagged" value={String(issueCheckins.length)} sub="Require attention" color={issueCheckins.length > 0 ? 'text-[#B8301A]' : 'text-[#1A6B45]'} />
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Projects table */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Projects</h2>
              <button onClick={() => router.push('/projects')} className="text-xs text-[#D4561A] font-semibold hover:underline">View all →</button>
            </div>
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F7F6F2]">
                    <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Project</th>
                    <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Client</th>
                    <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Budget</th>
                    <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Progress</th>
                    <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 8).map(p => {
                    const spent = costs.filter(c => c.project_id === p.id).reduce((s, c) => s + c.amount, 0)
                    const over = (p.budget || 0) > 0 && spent > p.budget!
                    return (
                      <tr key={p.id} onClick={() => router.push('/costs')} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] cursor-pointer transition-colors">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-900 max-w-[160px] truncate">{p.name}</td>
                        <td className="px-4 py-2.5 text-xs text-[#9B978F]">{p.client_name || '—'}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{p.budget ? fmt(p.budget) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${over ? 'bg-[#B8301A]' : 'bg-[#D4561A]'}`} style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-[#9B978F] tabular-nums">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[p.status]}`}>
                            {STATUS_LABELS[p.status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Recent check-ins */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Recent Check-ins</h2>
                <button onClick={() => router.push('/checkins')} className="text-xs text-[#D4561A] font-semibold hover:underline">View all →</button>
              </div>
              <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] divide-y divide-[#F0EDE8] overflow-hidden">
                {recentCheckins.length === 0 ? (
                  <p className="text-xs text-[#9B978F] text-center py-6">No check-ins yet</p>
                ) : recentCheckins.map(c => (
                  <div key={c.id} className="px-4 py-2.5 hover:bg-[#F7F6F2] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">{c.worker_name}</span>
                      <div className="flex items-center gap-1.5">
                        {c.issue_flagged && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FCEAE8] text-[#B8301A]">Issue</span>
                        )}
                        <span className="text-[10px] text-[#9B978F]">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#9B978F] truncate mt-0.5">{projName(c.project_id)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgent tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Urgent Tasks</h2>
                <button onClick={() => router.push('/tasks')} className="text-xs text-[#D4561A] font-semibold hover:underline">View all →</button>
              </div>
              <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] divide-y divide-[#F0EDE8] overflow-hidden">
                {urgentTasks.length === 0 ? (
                  <p className="text-xs text-[#9B978F] text-center py-6">No urgent tasks</p>
                ) : urgentTasks.slice(0, 5).map(t => (
                  <div key={t.id} className="px-4 py-2.5 hover:bg-[#F7F6F2] transition-colors cursor-pointer" onClick={() => router.push('/tasks')}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-900 leading-tight">{t.title}</span>
                      <span className={`inline-flex shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority}
                      </span>
                    </div>
                    {t.due_date && (
                      <p className={`text-[10px] mt-0.5 ${t.due_date < today ? 'text-[#B8301A] font-semibold' : 'text-[#9B978F]'}`}>
                        Due {t.due_date < today ? 'OVERDUE' : t.due_date}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget snapshot */}
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Budget Snapshot</h2>
              <div className="space-y-2.5">
                {projects.filter(p => (p.budget || 0) > 0).slice(0, 5).map(p => {
                  const spent = costs.filter(c => c.project_id === p.id).reduce((s, c) => s + c.amount, 0)
                  const pct = Math.min(100, Math.round((spent / p.budget!) * 100))
                  const over = spent > p.budget!
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-700 truncate max-w-[140px]">{p.name}</span>
                        <span className={`text-[10px] font-bold tabular-nums ${over ? 'text-[#B8301A]' : 'text-[#9B978F]'}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${over ? 'bg-[#B8301A]' : pct > 80 ? 'bg-[#96670A]' : 'bg-[#1A6B45]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => router.push('/costs')} className="mt-4 w-full text-xs font-semibold text-[#D4561A] hover:underline text-center block">
                Full breakdown →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
