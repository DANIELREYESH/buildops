'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { X, CheckSquare, Plus, Send } from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Task, Project } from '@/lib/types'

const PRIORITY_DOT: Record<Task['priority'], string> = {
  urgent: 'bg-danger', high: 'bg-warning', medium: 'bg-accent', low: 'bg-text-muted',
}

// DB has a 'blocked' status; spec calls for 3 columns — blocked tasks surface inside To Do with a badge.
const COLUMNS: { key: Task['status']; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
]

function isOverdue(due: string | null) {
  return !!due && new Date(due) < new Date(new Date().toDateString())
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return null
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0" title={name}>
      <span className="text-[9px] font-bold text-accent">{initials}</span>
    </div>
  )
}

function ProjectPill({ project }: { project: Project | undefined }) {
  if (!project) return null
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted text-text-secondary truncate max-w-[110px]">
      {project.name}
    </span>
  )
}

// ── Kanban card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, project, onOpen }: { task: Task; project: Project | undefined; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const overdue = isOverdue(task.due_date) && task.status !== 'done'

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
      <div className="flex items-start gap-2 mb-2">
        <span className={cn('w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0', PRIORITY_DOT[task.priority])} />
        <span className={cn('text-xs font-medium text-text-primary leading-snug', task.status === 'done' && 'line-through text-text-muted')}>{task.title}</span>
      </div>
      {task.status === 'blocked' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-danger/10 text-danger mb-2">Blocked</span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <ProjectPill project={project} />
        {task.due_date && (
          <span className={cn('text-[10px]', overdue ? 'text-danger font-medium' : 'text-text-muted')}>
            {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
        <Avatar name={task.assigned_to} />
      </div>
    </div>
  )
}

function KanbanColumn({ status, label, tasks, projects, onOpen, onAdd }: {
  status: Task['status']; label: string; tasks: Task[]; projects: Project[]
  onOpen: (t: Task) => void; onAdd: (status: Task['status'], title: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  const submit = () => {
    if (title.trim()) onAdd(status, title.trim())
    setTitle('')
    setAdding(false)
  }

  const colTasks = status === 'todo' ? tasks.filter(t => t.status === 'todo' || t.status === 'blocked') : tasks.filter(t => t.status === status)

  return (
    <div ref={setNodeRef} className={cn('flex-1 min-w-[260px] rounded-xl border border-border bg-surface/40 p-3 transition-colors', isOver && 'border-accent/50 bg-accent/5')}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
        <span className="text-[10px] text-text-muted ml-auto">{colTasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[60px]">
        {colTasks.map(t => <TaskCard key={t.id} task={t} project={projects.find(p => p.id === t.project_id)} onOpen={() => onOpen(t)} />)}
      </div>
      {adding ? (
        <div className="mt-2">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setTitle('') } }}
            onBlur={submit}
            placeholder="Task title..."
            className="w-full bg-background border border-accent/40 rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-2 w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-muted transition-colors">
          <Plus size={12} /> Add task
        </button>
      )}
    </div>
  )
}

// ── Detail drawer ───────────────────────────────────────────────────────────────

function TaskDrawer({ task, projects, onClose, onUpdate, onDelete, onComment }: {
  task: Task | null; projects: Project[]; onClose: () => void
  onUpdate: (field: string, value: string | number | null) => void
  onDelete: () => void
  onComment: (text: string) => void
}) {
  const [comment, setComment] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setConfirmDelete(false); setComment('') }, [task?.id])

  if (!task) return null

  const submitComment = () => {
    if (!comment.trim()) return
    onComment(comment.trim())
    setComment('')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
          <span className="font-semibold text-sm text-text-primary truncate">Task Details</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Title</label>
            <input defaultValue={task.title} onBlur={e => e.target.value !== task.title && onUpdate('title', e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Description</label>
            <textarea defaultValue={task.description || ''} onBlur={e => onUpdate('description', e.target.value || null)} rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" placeholder="Add details..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Status</label>
              <select value={task.status} onChange={e => onUpdate('status', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                {[{ key: 'todo', label: 'To Do' }, { key: 'in_progress', label: 'In Progress' }, { key: 'blocked', label: 'Blocked' }, { key: 'done', label: 'Done' }].map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Priority</label>
              <select value={task.priority} onChange={e => onUpdate('priority', e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                {(['low', 'medium', 'high', 'urgent'] as const).map(p => <option key={p} value={p} className="capitalize">{p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project</label>
              <select value={task.project_id || ''} onChange={e => onUpdate('project_id', e.target.value || null)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Due Date</label>
              <input type="date" defaultValue={task.due_date || ''} onChange={e => onUpdate('due_date', e.target.value || null)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Assigned To</label>
            <input defaultValue={task.assigned_to || ''} onBlur={e => onUpdate('assigned_to', e.target.value || null)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="Worker name" />
          </div>

          {/* Comments */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-2">Comments</label>
            <div className="space-y-2 mb-3">
              {(task.comments || []).length === 0 ? (
                <p className="text-xs text-text-muted">No comments yet.</p>
              ) : task.comments.map(c => (
                <div key={c.id} className="bg-background border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium text-text-primary">{c.author}</span>
                    <span className="text-[10px] text-text-muted">{new Date(c.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
                placeholder="Write a comment..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button onClick={submitComment} disabled={!comment.trim()} className="text-text-muted hover:text-accent disabled:opacity-30 transition-colors p-2">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-border p-4 flex-shrink-0">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full text-xs font-medium text-danger border border-danger/20 bg-danger/10 py-2 rounded-lg hover:bg-danger/15 transition-colors">
              Delete Task
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

function TasksPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Task | null>(null)
  const [email, setEmail] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: u }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setTasks(((t as Task[]) || []).map(x => ({ ...x, comments: x.comments || [] })))
    setProjects((p as Project[]) || [])
    if (u?.user?.email) setEmail(u.user.email)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      handleAdd('todo', '')
      router.replace('/tasks')
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (status: Task['status'], title: string) => {
    if (!title) return
    const { data, error } = await supabase.from('tasks').insert({
      title, status, priority: 'medium', project_id: null, comments: [],
    }).select()
    if (error) { toast.error(error.message); return }
    if (data) setTasks(prev => [{ ...(data[0] as Task), comments: [] }, ...prev])
    toast.success('Task created')
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as Task['status']
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) { toast.error(error.message); load(); return }
    toast.success(`Moved to ${COLUMNS.find(c => c.key === newStatus)?.label || newStatus}`)
  }

  const handleUpdate = async (field: string, value: string | number | null) => {
    if (!selected) return
    const { error } = await supabase.from('tasks').update({ [field]: value }).eq('id', selected.id)
    if (error) { toast.error(error.message); return }
    setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, [field]: value } : t))
    setSelected(prev => prev ? { ...prev, [field]: value } as Task : prev)
    toast.success('Saved')
  }

  const handleComment = async (text: string) => {
    if (!selected) return
    const newComment = { id: crypto.randomUUID(), author: email || 'You', text, created_at: new Date().toISOString() }
    const updated = [...(selected.comments || []), newComment]
    const { error } = await supabase.from('tasks').update({ comments: updated }).eq('id', selected.id)
    if (error) { toast.error(error.message); return }
    setTasks(prev => prev.map(t => t.id === selected.id ? { ...t, comments: updated } : t))
    setSelected(prev => prev ? { ...prev, comments: updated } : prev)
  }

  const handleDelete = async () => {
    if (!selected) return
    const { error } = await supabase.from('tasks').delete().eq('id', selected.id)
    if (error) { toast.error(error.message); return }
    setTasks(prev => prev.filter(t => t.id !== selected.id))
    setSelected(null)
    toast.success('Task deleted')
  }

  const filtered = useMemo(() => tasks.filter(t =>
    (!filterProject || t.project_id === filterProject) &&
    (!filterPriority || t.priority === filterPriority) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  ), [tasks, filterProject, filterPriority, search])

  const open = tasks.filter(t => t.status !== 'done').length
  const blocked = tasks.filter(t => t.status === 'blocked').length

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12 max-w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Tasks</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">{tasks.length} total · {open} open · {blocked} blocked</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs w-48 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent">
              <option value="">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent">
              <option value="">All Priorities</option>
              {(['urgent', 'high', 'medium', 'low'] as const).map(p => <option key={p} value={p} className="capitalize">{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {loading ? (
          <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-72 rounded-xl" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={20} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-text-primary">No tasks yet</p>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Add your first task to start tracking work.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {COLUMNS.map(col => (
                <KanbanColumn key={col.key} status={col.key} label={col.label} tasks={filtered} projects={projects} onOpen={setSelected} onAdd={handleAdd} />
              ))}
            </div>
          </DndContext>
        )}
      </div>

      <TaskDrawer task={selected} projects={projects} onClose={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} onComment={handleComment} />
    </AppLayout>
  )
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksPageInner />
    </Suspense>
  )
}
