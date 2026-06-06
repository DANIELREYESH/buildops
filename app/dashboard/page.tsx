'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Project, Cost, Checkin, Task } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
      <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#9B978F] mt-0.5">{sub}</div>}
    </div>
  )
}

type ActivityItem = { type: 'project' | 'cost' | 'checkin' | 'task'; label: string; sub: string; time: string; href: string }

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewCost, setShowNewCost] = useState(false)
  const [showNewCheckin, setShowNewCheckin] = useState(false)
  const [saving, setSaving] = useState(false)

  const [projectForm, setProjectForm] = useState({ name: '', client_name: '', budget: '', deadline: '' })
  const [costForm, setCostForm] = useState({ project_id: '', category: 'materials', supplier: '', amount: '', date: '' })
  const [checkinForm, setCheckinForm] = useState({ project_id: '', worker_name: '', message: '' })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserEmail(user.email || '')

    const [{ data: ps }, { data: cs }, { data: cis }, { data: ts }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('costs').select('*').order('created_at', { ascending: false }),
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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = userEmail ? userEmail.split('@')[0].split('.')[0] : ''
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

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

  // Build recent activity feed from loaded data
  const activity: ActivityItem[] = [
    ...projects.slice(0, 2).map(p => ({
      type: 'project' as const,
      label: `Project created: ${p.name}`,
      sub: p.client_name || 'No client',
      time: p.created_at,
      href: '/projects',
    })),
    ...costs.slice(0, 2).map(c => ({
      type: 'cost' as const,
      label: `Cost logged: ${c.supplier || c.category}`,
      sub: fmt(c.amount),
      time: c.created_at,
      href: '/costs',
    })),
    ...checkins.slice(0, 2).map(c => ({
      type: 'checkin' as const,
      label: `Check-in: ${c.worker_name}`,
      sub: projName(c.project_id),
      time: c.created_at,
      href: '/checkins',
    })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6)

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
  const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    project: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2" stroke="#1A3FAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    cost: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="#D4561A" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="#D4561A" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="#D4561A" strokeWidth="2" strokeLinecap="round"/></svg>,
    checkin: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#1A6B45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    task: <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 11 12 14 22 4" stroke="#96670A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  }
  const ACTIVITY_BG: Record<string, string> = {
    project: 'bg-[#EBF0FD]', cost: 'bg-[#FEF6E4]', checkin: 'bg-[#E8F5EE]', task: 'bg-[#FEF6E4]',
  }

  const handleCreateProject = async () => {
    if (!projectForm.name) return
    setSaving(true)
    const { data, error } = await supabase.from('projects').insert({
      name: projectForm.name,
      client_name: projectForm.client_name || null,
      budget: projectForm.budget ? parseFloat(projectForm.budget) : null,
      deadline: projectForm.deadline || null,
      status: 'active', progress: 0,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setProjects(prev => [data[0] as Project, ...prev])
    setShowNewProject(false)
    setProjectForm({ name: '', client_name: '', budget: '', deadline: '' })
    toast('Project created')
  }

  const handleCreateCost = async () => {
    if (!costForm.amount || !costForm.project_id) { toast('Select a project and amount', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('costs').insert({
      project_id: costForm.project_id,
      category: costForm.category,
      supplier: costForm.supplier || null,
      amount: parseFloat(costForm.amount),
      date: costForm.date || today,
    })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setShowNewCost(false)
    setCostForm({ project_id: '', category: 'materials', supplier: '', amount: '', date: '' })
    toast('Cost logged')
    load()
  }

  const handleCreateCheckin = async () => {
    if (!checkinForm.worker_name || !checkinForm.message) return
    setSaving(true)
    const { error } = await supabase.from('checkins').insert({
      project_id: checkinForm.project_id || null,
      worker_name: checkinForm.worker_name,
      message: checkinForm.message,
      issue_flagged: false,
      status: 'received',
      checkin_date: today,
    })
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setShowNewCheckin(false)
    setCheckinForm({ project_id: '', worker_name: '', message: '' })
    toast('Check-in submitted')
    load()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="animate-pulse h-24 bg-gray-100 rounded-[10px]" />
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
        <span className="text-[10px] text-[#9B978F]">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      <div className="p-6">

        {/* Welcome banner */}
        <div className="bg-gray-900 rounded-[10px] px-5 py-4 mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">{greeting}{displayName ? `, ${displayName}` : ''}.</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {activeProjects.length} active projects · {todayCheckins.length} check-ins today
              {issueCheckins.length > 0 ? ` · ${issueCheckins.length} issue${issueCheckins.length !== 1 ? 's' : ''} need attention` : ' · All clear'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewProject(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors whitespace-nowrap">
              + New Project
            </button>
            <button onClick={() => setShowNewCost(true)} className="text-xs font-semibold text-gray-300 bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap">
              + Log Cost
            </button>
            <button onClick={() => setShowNewCheckin(true)} className="text-xs font-semibold text-gray-300 bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors whitespace-nowrap">
              + Check-in
            </button>
          </div>
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
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-x-auto">
              <table className="w-full min-w-[480px]">
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
                  {projects.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center">
                      <p className="text-sm text-gray-400 font-semibold">No projects yet</p>
                      <button onClick={() => setShowNewProject(true)} className="mt-3 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg">+ New Project</button>
                    </td></tr>
                  ) : projects.slice(0, 8).map(p => {
                    const spent = costs.filter(c => c.project_id === p.id).reduce((s, c) => s + c.amount, 0)
                    const over = (p.budget || 0) > 0 && spent > p.budget!
                    return (
                      <tr key={p.id} onClick={() => router.push('/projects')} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] cursor-pointer transition-colors">
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
            {/* Recent activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Recent Activity</h2>
              </div>
              <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] divide-y divide-[#F0EDE8] overflow-hidden">
                {activity.length === 0 ? (
                  <p className="text-xs text-[#9B978F] text-center py-6">No activity yet</p>
                ) : activity.map((a, i) => (
                  <button key={i} onClick={() => router.push(a.href)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F7F6F2] transition-colors text-left">
                    <div className={`w-6 h-6 rounded-full ${ACTIVITY_BG[a.type]} flex items-center justify-center flex-shrink-0`}>
                      {ACTIVITY_ICONS[a.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{a.label}</div>
                      <div className="text-[10px] text-[#9B978F] truncate">{a.sub}</div>
                    </div>
                    <span className="text-[10px] text-[#9B978F] flex-shrink-0">
                      {new Date(a.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
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
                        {t.due_date < today ? 'OVERDUE' : `Due ${t.due_date}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Budget snapshot */}
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Budget Snapshot</h2>
              {projects.filter(p => (p.budget || 0) > 0).length === 0 ? (
                <p className="text-xs text-[#9B978F] text-center py-4">No budget data</p>
              ) : (
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
              )}
              <button onClick={() => router.push('/costs')} className="mt-4 w-full text-xs font-semibold text-[#D4561A] hover:underline text-center block">
                Full breakdown →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick action: New Project modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">New Project</h3>
              <button onClick={() => setShowNewProject(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project Name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm(f => ({...f, name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="e.g. Kensington Loft Conversion" autoFocus />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Name</label>
                <input value={projectForm.client_name} onChange={e => setProjectForm(f => ({...f, client_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="James Sullivan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Budget (£)</label>
                  <input type="number" value={projectForm.budget} onChange={e => setProjectForm(f => ({...f, budget: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="25000" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Deadline</label>
                  <input type="date" value={projectForm.deadline} onChange={e => setProjectForm(f => ({...f, deadline: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewProject(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateProject} disabled={saving || !projectForm.name} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick action: Log Cost modal */}
      {showNewCost && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCost(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Log Cost</h3>
              <button onClick={() => setShowNewCost(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project *</label>
                <select value={costForm.project_id} onChange={e => setCostForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Category</label>
                  <select value={costForm.category} onChange={e => setCostForm(f => ({...f, category: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    {['materials','labour','subcontractors','equipment','other'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Amount (£) *</label>
                  <input type="number" value={costForm.amount} onChange={e => setCostForm(f => ({...f, amount: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="1200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Supplier</label>
                  <input value={costForm.supplier} onChange={e => setCostForm(f => ({...f, supplier: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Travis Perkins" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Date</label>
                  <input type="date" value={costForm.date} onChange={e => setCostForm(f => ({...f, date: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewCost(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateCost} disabled={saving || !costForm.amount || !costForm.project_id} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Log Cost'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick action: Submit Check-in modal */}
      {showNewCheckin && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCheckin(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Submit Check-in</h3>
              <button onClick={() => setShowNewCheckin(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Worker Name *</label>
                  <input value={checkinForm.worker_name} onChange={e => setCheckinForm(f => ({...f, worker_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="James Reid" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project</label>
                  <select value={checkinForm.project_id} onChange={e => setCheckinForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Message *</label>
                <textarea value={checkinForm.message} onChange={e => setCheckinForm(f => ({...f, message: e.target.value}))} rows={3} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Site update, progress, any issues..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewCheckin(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreateCheckin} disabled={saving || !checkinForm.worker_name || !checkinForm.message} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Submitting...' : 'Submit Check-in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
