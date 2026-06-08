'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  FolderKanban, CheckSquare, FileText, Users, X,
  TrendingUp, TrendingDown, Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project, Cost, Checkin, Task, Subcontractor } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, trend,
}: { icon: React.ElementType; label: string; value: string; trend?: { value: string; positive: boolean } }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
        <Icon size={15} className="text-accent" />
      </div>
      <div className="text-[28px] leading-none font-semibold text-text-primary mb-1.5 tabular-nums">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        {trend && (
          <span className={cn('flex items-center gap-1 text-[11px] font-medium', trend.positive ? 'text-success' : 'text-danger')}>
            {trend.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Revenue chart (recharts AreaChart) ─────────────────────────────────────────

const REVENUE_DATA = [
  { month: 'Jan', revenue: 8400 },
  { month: 'Feb', revenue: 9200 },
  { month: 'Mar', revenue: 11500 },
  { month: 'Apr', revenue: 13800 },
  { month: 'May', revenue: 15200 },
  { month: 'Jun', revenue: 16900 },
]

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[10px] text-text-muted mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-text-primary">{fmt(payload[0].value)}</div>
    </div>
  )
}

function RevenueChart() {
  const last = REVENUE_DATA[REVENUE_DATA.length - 1].revenue
  const prev = REVENUE_DATA[REVENUE_DATA.length - 2].revenue
  const pct = Math.round(((last - prev) / prev) * 100)

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-text-muted">Revenue — last 6 months</div>
          <div className="text-lg font-semibold text-text-primary mt-0.5">{fmt(last)}/mo</div>
        </div>
        <span className={cn('flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full', pct >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10')}>
          {pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {pct >= 0 ? '+' : ''}{pct}% MoM
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={{ stroke: '#1f1f1f' }} tickLine={false} />
          <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={v => `£${v / 1000}k`} />
          <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Project timeline (Gantt) ────────────────────────────────────────────────────

const TIMELINE_COLORS: Record<string, string> = {
  active: '#6366f1', delayed: '#f59e0b', on_hold: '#71717a', completed: '#22c55e',
}

function ProjectTimeline({ projects }: { projects: Project[] }) {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 4, 0)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000)
  const toPercent = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / 86400000 / totalDays) * 100))
  const todayPct = toPercent(today)

  const withDates = projects.filter(p => p.deadline).slice(0, 6)

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-xs text-text-muted mb-4">Project Timeline</div>
      {withDates.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-8">No project deadlines set</p>
      ) : (
        <div className="space-y-3">
          {withDates.map(p => {
            const pStart = new Date(p.created_at)
            const pEnd = new Date(p.deadline!)
            const leftPct = toPercent(pStart)
            const widthPct = Math.max(2, toPercent(pEnd) - leftPct)
            const overdue = pEnd < today && p.status !== 'completed'
            const color = overdue ? '#ef4444' : TIMELINE_COLORS[p.status] || '#6366f1'
            return (
              <div key={p.id}>
                <div className="text-[11px] text-text-secondary truncate mb-1 max-w-[220px]">{p.name}</div>
                <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className="absolute top-0 h-full rounded-full" style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }} />
                  <div className="absolute -top-1 -bottom-1 w-px bg-accent" style={{ left: `${todayPct}%` }} />
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-text-muted">
            <div className="w-px h-3 bg-accent" />
            <span>Today</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AI Check-ins feed ───────────────────────────────────────────────────────────

const SENTIMENT_DOT: Record<string, string> = { positive: 'bg-success', neutral: 'bg-warning', negative: 'bg-danger' }

function CheckinCard({ checkin, projectName }: { checkin: Checkin; projectName: string }) {
  const initials = checkin.worker_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors rounded-lg">
      <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-accent">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary truncate">{checkin.worker_name}</span>
          <span className="text-[10px] text-text-muted truncate">· {projectName}</span>
          {checkin.issue_flagged && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SENTIMENT_DOT.negative)} />}
        </div>
        <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{checkin.message}</p>
        <span className="text-[10px] text-text-muted mt-1 inline-block">
          {new Date(checkin.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

type ActivityItem = { type: 'project' | 'cost' | 'checkin' | 'task'; label: string; sub: string; time: string; href: string }

const ACTIVITY_ICON: Record<string, React.ElementType> = { project: FolderKanban, cost: FileText, checkin: Bot, task: CheckSquare }

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [costs, setCosts] = useState<Cost[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([])
  const [pendingInvoiced, setPendingInvoiced] = useState(0)
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

    const [{ data: ps }, { data: cs }, { data: cis }, { data: ts }, { data: subs }, invoicesRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('costs').select('*').order('created_at', { ascending: false }),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tasks').select('*').neq('status', 'done').order('due_date', { ascending: true }),
      supabase.from('subcontractors').select('*'),
      supabase.from('invoices').select('*'),
    ])
    setProjects((ps as Project[]) || [])
    setCosts((cs as Cost[]) || [])
    setCheckins((cis as Checkin[]) || [])
    setTasks((ts as Task[]) || [])
    setSubcontractors((subs as Subcontractor[]) || [])

    type InvoiceRow = { total: number; status: string }
    const invoices = (invoicesRes.data as InvoiceRow[] | null) || []
    setPendingInvoiced(invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0))

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]
  const activeProjects = projects.filter(p => p.status === 'active')
  const openTasks = tasks.length
  const recentCheckins = checkins.slice(0, 3)
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name ?? '—'

  const activity: ActivityItem[] = [
    ...projects.slice(0, 3).map(p => ({ type: 'project' as const, label: `Project created: ${p.name}`, sub: p.client_name || 'No client', time: p.created_at, href: '/projects' })),
    ...costs.slice(0, 3).map(c => ({ type: 'cost' as const, label: `Cost logged: ${c.supplier || c.category}`, sub: fmt(c.amount), time: c.created_at, href: '/costs' })),
    ...checkins.slice(0, 3).map(c => ({ type: 'checkin' as const, label: `Check-in: ${c.worker_name}`, sub: projName(c.project_id), time: c.created_at, href: '/checkins' })),
    ...tasks.slice(0, 3).map(t => ({ type: 'task' as const, label: `Task: ${t.title}`, sub: t.status, time: t.created_at, href: '/tasks' })),
  ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10)

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
    if (error) { toast.error(error.message); return }
    if (data) setProjects(prev => [data[0] as Project, ...prev])
    setShowNewProject(false)
    setProjectForm({ name: '', client_name: '', budget: '', deadline: '' })
    toast.success('Project created')
  }

  const handleCreateCost = async () => {
    if (!costForm.amount || !costForm.project_id) { toast.error('Select a project and amount'); return }
    setSaving(true)
    const { error } = await supabase.from('costs').insert({
      project_id: costForm.project_id,
      category: costForm.category,
      supplier: costForm.supplier || null,
      amount: parseFloat(costForm.amount),
      date: costForm.date || today,
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setShowNewCost(false)
    setCostForm({ project_id: '', category: 'materials', supplier: '', amount: '', date: '' })
    toast.success('Cost logged')
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
    if (error) { toast.error(error.message); return }
    setShowNewCheckin(false)
    setCheckinForm({ project_id: '', worker_name: '', message: '' })
    toast.success('Check-in submitted')
    load()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="skeleton h-56" />
            <div className="skeleton h-56" />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatCard icon={FolderKanban} label="Active Projects" value={String(activeProjects.length)} trend={{ value: '+12% vs last month', positive: true }} />
          <StatCard icon={CheckSquare} label="Open Tasks" value={String(openTasks)} trend={{ value: '+4% vs last month', positive: false }} />
          <StatCard icon={FileText} label="Pending Invoices" value={fmt(pendingInvoiced)} trend={{ value: '+8% vs last month', positive: true }} />
          <StatCard icon={Users} label="Subcontractors" value={String(subcontractors.length)} trend={{ value: '+2 vs last month', positive: true }} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <RevenueChart />
          <ProjectTimeline projects={projects} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* AI Check-ins feed (2/3) */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-text-secondary">AI Check-ins</h2>
              <button onClick={() => router.push('/checkins')} className="text-xs text-accent font-medium hover:text-accent-hover">View all →</button>
            </div>
            <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
              {recentCheckins.length === 0 ? (
                <div className="text-center py-10">
                  <Bot size={20} className="text-text-muted mx-auto mb-2" />
                  <p className="text-xs text-text-muted">No check-ins yet</p>
                  <button onClick={() => setShowNewCheckin(true)} className="mt-3 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3 py-1.5 rounded-lg transition-colors">
                    + Submit Check-in
                  </button>
                </div>
              ) : recentCheckins.map(c => (
                <CheckinCard key={c.id} checkin={c} projectName={projName(c.project_id)} />
              ))}
            </div>

            {/* Projects table */}
            <div className="flex items-center justify-between mb-3 mt-6">
              <h2 className="text-xs font-medium text-text-secondary">Projects</h2>
              <button onClick={() => router.push('/projects')} className="text-xs text-accent font-medium hover:text-accent-hover">View all →</button>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">Project</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">Client</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">Budget</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">Progress</th>
                    <th className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center">
                      <p className="text-sm text-text-muted">No projects yet</p>
                      <button onClick={() => setShowNewProject(true)} className="mt-3 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-2 rounded-lg transition-colors">+ New Project</button>
                    </td></tr>
                  ) : projects.slice(0, 8).map(p => {
                    const spent = costs.filter(c => c.project_id === p.id).reduce((s, c) => s + c.amount, 0)
                    const over = (p.budget || 0) > 0 && spent > p.budget!
                    return (
                      <tr key={p.id} onClick={() => router.push('/projects')} className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors">
                        <td className="px-4 py-2.5 text-xs font-medium text-text-primary max-w-[160px] truncate">{p.name}</td>
                        <td className="px-4 py-2.5 text-xs text-text-muted">{p.client_name || '—'}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-text-secondary">{p.budget ? fmt(p.budget) : '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', over ? 'bg-danger' : 'bg-accent')} style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-text-muted tabular-nums">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex items-center gap-1.5 text-[11px] text-text-secondary')}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIMELINE_COLORS[p.status] || '#71717a' }} />
                            {p.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent activity (1/3) */}
          <div>
            <h2 className="text-xs font-medium text-text-secondary mb-3">Recent Activity</h2>
            <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
              {activity.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No activity yet</p>
              ) : activity.map((a, i) => {
                const Icon = ACTIVITY_ICON[a.type]
                return (
                  <button key={i} onClick={() => router.push(a.href)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors text-left">
                    <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={11} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">{a.label}</div>
                      <div className="text-[10px] text-text-muted truncate">{a.sub}</div>
                    </div>
                    <span className="text-[10px] text-text-muted flex-shrink-0">
                      {new Date(a.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => setShowNewProject(true)} className="text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3 py-2 rounded-lg transition-colors">+ New Project</button>
              <button onClick={() => setShowNewCost(true)} className="text-xs font-medium text-text-secondary bg-muted hover:bg-muted/70 px-3 py-2 rounded-lg transition-colors">+ Log Cost</button>
              <button onClick={() => setShowNewCheckin(true)} className="text-xs font-medium text-text-secondary bg-muted hover:bg-muted/70 px-3 py-2 rounded-lg transition-colors">+ Check-in</button>
            </div>
          </div>
        </div>
      </div>

      {/* New Project modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">New Project</h3>
              <button onClick={() => setShowNewProject(false)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project Name *</label>
                <input value={projectForm.name} onChange={e => setProjectForm(f => ({...f, name: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="e.g. Kensington Loft Conversion" autoFocus />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Client Name</label>
                <input value={projectForm.client_name} onChange={e => setProjectForm(f => ({...f, client_name: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="James Sullivan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Budget (£)</label>
                  <input type="number" value={projectForm.budget} onChange={e => setProjectForm(f => ({...f, budget: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="25000" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Deadline</label>
                  <input type="date" value={projectForm.deadline} onChange={e => setProjectForm(f => ({...f, deadline: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewProject(false)} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreateProject} disabled={saving || !projectForm.name} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Cost modal */}
      {showNewCost && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCost(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">Log Cost</h3>
              <button onClick={() => setShowNewCost(false)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project *</label>
                <select value={costForm.project_id} onChange={e => setCostForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Category</label>
                  <select value={costForm.category} onChange={e => setCostForm(f => ({...f, category: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                    {['materials','labour','subcontractors','equipment','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Amount (£) *</label>
                  <input type="number" value={costForm.amount} onChange={e => setCostForm(f => ({...f, amount: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="1200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Supplier</label>
                  <input value={costForm.supplier} onChange={e => setCostForm(f => ({...f, supplier: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="Travis Perkins" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Date</label>
                  <input type="date" value={costForm.date} onChange={e => setCostForm(f => ({...f, date: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewCost(false)} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreateCost} disabled={saving || !costForm.amount || !costForm.project_id} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Log Cost'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Check-in modal */}
      {showNewCheckin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCheckin(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">Submit Check-in</h3>
              <button onClick={() => setShowNewCheckin(false)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Worker Name *</label>
                  <input value={checkinForm.worker_name} onChange={e => setCheckinForm(f => ({...f, worker_name: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="James Reid" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project</label>
                  <select value={checkinForm.project_id} onChange={e => setCheckinForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Message *</label>
                <textarea value={checkinForm.message} onChange={e => setCheckinForm(f => ({...f, message: e.target.value}))} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" placeholder="Site update, progress, any issues..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewCheckin(false)} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreateCheckin} disabled={saving || !checkinForm.worker_name || !checkinForm.message} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
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
