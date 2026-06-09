'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import {
  MoreHorizontal, X, FolderKanban, Table2, Kanban, Trash2, Eye,
} from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project, Cost } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

const STATUS_LABELS: Record<Project['status'], string> = {
  active: 'Active', delayed: 'Delayed', on_hold: 'On Hold', completed: 'Complete',
}
const STATUS_DOT: Record<Project['status'], string> = {
  active: 'bg-accent', delayed: 'bg-warning', on_hold: 'bg-orange-500', completed: 'bg-success',
}
const KANBAN_COLUMNS: { status: Project['status']; label: string }[] = [
  { status: 'delayed', label: 'Planning' },
  { status: 'active', label: 'Active' },
  { status: 'on_hold', label: 'On Hold' },
  { status: 'completed', label: 'Complete' },
]

function StatusDot({ status }: { status: Project['status'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-text-muted tabular-nums">{value}%</span>
    </div>
  )
}

function Skeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-t border-border">
          <td colSpan={6} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
        </tr>
      ))}
    </>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <FolderKanban size={20} className="text-accent" />
      </div>
      <p className="text-sm font-medium text-text-primary">No projects yet</p>
      <p className="text-sm text-[#a1a1aa] mt-0.5">Create your first project to start tracking work and costs.</p>
      <button onClick={onCreate} className="mt-4 text-xs font-medium text-white bg-accent hover:bg-accent-hover active:scale-[0.98] px-3.5 py-2 rounded-lg transition-colors">
        Create your first project
      </button>
    </div>
  )
}

// ── Kanban card (draggable) ─────────────────────────────────────────────────────

function KanbanCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        'bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/40 transition-colors',
        isDragging && 'opacity-40 z-50'
      )}
    >
      <div className="text-xs font-medium text-text-primary mb-1 truncate">{project.name}</div>
      <div className="text-[11px] text-text-muted mb-2 truncate">{project.client_name || 'No client'}</div>
      <ProgressBar value={project.progress} />
      {project.budget && <div className="text-[11px] font-mono text-text-secondary mt-2">{fmt(project.budget)}</div>}
    </div>
  )
}

function KanbanColumn({ status, label, projects, onOpen }: { status: Project['status']; label: string; projects: Project[]; onOpen: (p: Project) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className={cn('flex-1 min-w-[240px] rounded-xl border border-border bg-surface/40 p-3 transition-colors', isOver && 'border-accent/50 bg-accent/5')}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[status])} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
        <span className="text-[10px] text-text-muted ml-auto">{projects.length}</span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {projects.map(p => <KanbanCard key={p.id} project={p} onOpen={() => onOpen(p)} />)}
      </div>
    </div>
  )
}

// ── New Project Drawer ──────────────────────────────────────────────────────────

function NewProjectDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: Project) => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', client_name: '', status: 'active' as Project['status'],
    start_date: '', deadline: '', budget: '', description: '',
  })

  const handleCreate = async () => {
    if (!form.name) return
    setSaving(true)
    const { data, error } = await supabase.from('projects').insert({
      name: form.name,
      client_name: form.client_name || null,
      status: form.status,
      budget: form.budget ? parseFloat(form.budget) : null,
      deadline: form.deadline || null,
      description: form.description || null,
      progress: 0,
    }).select()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (data) onCreated(data[0] as Project)
    setForm({ name: '', client_name: '', status: 'active', start_date: '', deadline: '', budget: '', description: '' })
    toast.success('Project created')
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
          <span className="font-semibold text-sm text-text-primary">New Project</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="e.g. Kensington Loft Conversion" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Client Name</label>
            <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="James Sullivan" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Project['status'] }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {KANBAN_COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">End Date</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Budget (£)</label>
            <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="25000" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" placeholder="Scope of works..." />
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Detail drawer ───────────────────────────────────────────────────────────────

function ProjectDetailDrawer({ project, costs, onClose, onUpdate, onDelete }: {
  project: Project | null; costs: Cost[]; onClose: () => void
  onUpdate: (field: string, value: string | number) => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [progress, setProgress] = useState(project?.progress ?? 0)
  useEffect(() => { setProgress(project?.progress ?? 0) }, [project])

  if (!project) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => { onClose(); setConfirmDelete(false) }} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
          <span className="font-semibold text-sm text-text-primary truncate">{project.name}</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1">Client</label>
            <div className="text-sm text-text-primary">{project.client_name || '—'}</div>
            {project.client_email && <div className="text-xs text-text-muted">{project.client_email}</div>}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Progress</label>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                onMouseUp={() => onUpdate('progress', progress)}
                className="flex-1 accent-accent" />
              <span className="text-sm font-semibold text-accent w-10 text-right">{progress}%</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Status</label>
            <select value={project.status} onChange={e => onUpdate('status', e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              {KANBAN_COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Budget</label>
              <input type="number" defaultValue={project.budget || ''} onBlur={e => e.target.value && onUpdate('budget', parseFloat(e.target.value))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="£" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Deadline</label>
              <input type="date" defaultValue={project.deadline || ''} onBlur={e => onUpdate('deadline', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Description</label>
            <textarea defaultValue={project.description || ''} onBlur={e => onUpdate('description', e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" placeholder="Project scope and notes..." />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wide text-text-muted font-medium">Cost Items</span>
              <span className="text-xs font-mono text-accent font-semibold">{fmt(costs.reduce((s, c) => s + c.amount, 0))}</span>
            </div>
            {costs.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">No costs logged for this project.</p>
            ) : (
              <div className="space-y-1.5">
                {costs.slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-background border border-border">
                    <span className="text-text-secondary truncate">{c.supplier || c.category}</span>
                    <span className="font-mono text-text-primary">{fmt(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border p-4 flex-shrink-0">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-danger border border-danger/20 bg-danger/10 py-2 rounded-lg hover:bg-danger/15 transition-colors">
              <Trash2 size={13} /> Delete Project
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 text-xs font-medium text-text-secondary border border-border py-2 rounded-lg hover:bg-muted transition-colors">Cancel</button>
              <button onClick={onDelete} className="flex-1 text-xs font-medium text-white bg-danger hover:bg-danger/90 py-2 rounded-lg transition-colors">Confirm Delete</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

function ProjectsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [spentMap, setSpentMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState<Project | null>(null)
  const [panelCosts, setPanelCosts] = useState<Cost[]>([])
  const [showDrawer, setShowDrawer] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: projs }, { data: costs }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('costs').select('project_id, amount'),
    ])
    setProjects((projs as Project[]) || [])
    const map: Record<string, number> = {}
    ;(costs || []).forEach((c: { project_id: string; amount: number }) => {
      map[c.project_id] = (map[c.project_id] || 0) + c.amount
    })
    setSpentMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (searchParams.get('new') === '1') setShowDrawer(true) }, [searchParams])

  const openPanel = async (p: Project) => {
    setPanel(p)
    const { data } = await supabase.from('costs').select('*').eq('project_id', p.id).order('date', { ascending: false })
    setPanelCosts((data as Cost[]) || [])
  }

  const handleUpdate = async (field: string, value: string | number) => {
    if (!panel) return
    const { error } = await supabase.from('projects').update({ [field]: value }).eq('id', panel.id)
    if (error) { toast.error(error.message); return }
    setProjects(prev => prev.map(p => p.id === panel.id ? { ...p, [field]: value } : p))
    setPanel(prev => prev ? { ...prev, [field]: value } : prev)
    toast.success('Saved')
  }

  const handleDelete = async () => {
    if (!panel) return
    const { error } = await supabase.from('projects').delete().eq('id', panel.id)
    if (error) { toast.error(error.message); return }
    setProjects(prev => prev.filter(p => p.id !== panel.id))
    setPanel(null)
    toast.success('Project deleted')
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const projectId = active.id as string
    const newStatus = over.id as Project['status']
    const project = projects.find(p => p.id === projectId)
    if (!project || project.status === newStatus) return

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    if (error) { toast.error(error.message); load(); return }
    toast.success(`Moved to ${KANBAN_COLUMNS.find(c => c.status === newStatus)?.label}`)
  }

  const filtered = useMemo(() => projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.client_name || '').toLowerCase().includes(search.toLowerCase())
  ), [projects, search])

  const closeDrawer = () => {
    setShowDrawer(false)
    if (searchParams.get('new')) router.replace('/projects')
  }

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12 max-w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Projects</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">{projects.length} total · {projects.filter(p => p.status === 'active').length} active</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs w-60 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <Tabs.Root value={view} onValueChange={v => setView(v as 'table' | 'kanban')}>
              <Tabs.List className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
                <Tabs.Trigger value="table" className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all', view === 'table' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
                  <Table2 size={13} /> Table
                </Tabs.Trigger>
                <Tabs.Trigger value="kanban" className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all', view === 'kanban' ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
                  <Kanban size={13} /> Kanban
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            <button onClick={() => setShowDrawer(true)} className="text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors">
              + New Project
            </button>
          </div>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Status donut */}
        {!loading && projects.length > 0 && (
          <div className="flex items-center gap-5 mb-5 bg-surface border border-border rounded-xl p-4">
            <div className="relative flex-shrink-0 w-[120px] h-[120px]">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <defs>
                    <radialGradient id="projDelayed" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                    </radialGradient>
                    <radialGradient id="projActive" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                    </radialGradient>
                    <radialGradient id="projOnHold" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8} />
                    </radialGradient>
                    <radialGradient id="projCompleted" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                    </radialGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'Planning', value: projects.filter(p => p.status === 'delayed').length || 0.01 },
                      { name: 'Active', value: projects.filter(p => p.status === 'active').length || 0.01 },
                      { name: 'On Hold', value: projects.filter(p => p.status === 'on_hold').length || 0.01 },
                      { name: 'Complete', value: projects.filter(p => p.status === 'completed').length || 0.01 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius="55%" outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="url(#projDelayed)" />
                    <Cell fill="url(#projActive)" />
                    <Cell fill="url(#projOnHold)" />
                    <Cell fill="url(#projCompleted)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xl font-bold text-text-primary">{projects.length}</div>
                <div className="text-[9px] text-text-muted">total</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {[
                { label: 'Planning', count: projects.filter(p => p.status === 'delayed').length, color: '#f59e0b' },
                { label: 'Active', count: projects.filter(p => p.status === 'active').length, color: '#6366f1' },
                { label: 'On Hold', count: projects.filter(p => p.status === 'on_hold').length, color: '#f97316' },
                { label: 'Complete', count: projects.filter(p => p.status === 'completed').length, color: '#22c55e' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-text-muted">{item.label}</span>
                  <span className="text-[10px] font-bold text-text-primary ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'table' ? (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {['Project', 'Client', 'Status', 'Budget', 'Start Date', 'Progress', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <Skeleton />
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState onCreate={() => setShowDrawer(true)} /></td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} onClick={() => openPanel(p)} className="border-t border-border cursor-pointer hover:bg-muted/60 transition-colors transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-text-primary max-w-[200px] truncate">{p.name}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted">{p.client_name || '—'}</td>
                    <td className="px-4 py-2.5"><StatusDot status={p.status} /></td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-secondary">{p.budget ? fmt(p.budget) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted tabular-nums">{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-2.5"><ProgressBar value={p.progress} /></td>
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-muted transition-colors">
                            <MoreHorizontal size={15} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" sideOffset={4} className="bg-surface border border-border rounded-lg shadow-2xl p-1 min-w-[140px] z-50">
                            <DropdownMenu.Item onSelect={() => openPanel(p)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-text-secondary cursor-pointer outline-none hover:bg-muted hover:text-text-primary">
                              <Eye size={13} /> View details
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          loading ? (
            <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-64" />)}</div>
          ) : projects.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl"><EmptyState onCreate={() => setShowDrawer(true)} /></div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {KANBAN_COLUMNS.map(col => (
                  <KanbanColumn key={col.status} status={col.status} label={col.label} projects={filtered.filter(p => p.status === col.status)} onOpen={openPanel} />
                ))}
              </div>
            </DndContext>
          )
        )}
      </div>

      <NewProjectDrawer open={showDrawer} onClose={closeDrawer} onCreated={p => setProjects(prev => [p, ...prev])} />

      <ProjectDetailDrawer
        project={panel}
        costs={panelCosts}
        onClose={() => setPanel(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </AppLayout>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsPageInner />
    </Suspense>
  )
}
