'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Task, Project } from '@/lib/types'

type ViewMode = 'list' | 'board'

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  urgent: 'bg-[#FCEAE8] text-[#B8301A]',
  high: 'bg-[#FEF6E4] text-[#96670A]',
  medium: 'bg-[#EBF0FD] text-[#1A3FAA]',
  low: 'bg-gray-100 text-[#9B978F]',
}
const STATUS_COLS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'text-[#9B978F]' },
  { key: 'in_progress', label: 'In Progress', color: 'text-[#1A3FAA]' },
  { key: 'blocked', label: 'Blocked', color: 'text-[#B8301A]' },
  { key: 'done', label: 'Done', color: 'text-[#1A6B45]' },
]

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-[#F0EDE8]">
          <div className="h-4 bg-gray-100 rounded w-4" />
          <div className="h-4 bg-gray-100 rounded flex-1" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-16" />
        </div>
      ))}
    </div>
  )
}

export default function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filterProject, setFilterProject] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState<Task['status'] | null>(null)

  const [form, setForm] = useState({
    title: '', description: '', project_id: '', assigned_to: '',
    priority: 'medium' as Task['priority'], due_date: '', estimated_hours: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ])
    setTasks((t as Task[]) || [])
    setProjects((p as Project[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.title) return
    setSaving(true)
    const { data, error } = await supabase.from('tasks').insert({
      title: form.title, description: form.description || null,
      project_id: form.project_id || null, assigned_to: form.assigned_to || null,
      priority: form.priority, due_date: form.due_date || null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      status: 'todo',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setTasks(prev => [data[0] as Task, ...prev])
    setShowModal(false)
    setForm({ title: '', description: '', project_id: '', assigned_to: '', priority: 'medium', due_date: '', estimated_hours: '' })
    toast('Task created')
  }

  const toggleDone = async (task: Task) => {
    const newStatus: Task['status'] = task.status === 'done' ? 'todo' : 'done'
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) { toast(error.message, 'error'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault()
    setDragOver(null)
    const taskId = e.dataTransfer.getData('taskId')
    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (error) { toast(error.message, 'error'); return }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  }

  const bulkDelete = async () => {
    const ids = Array.from(selected)
    const { error } = await supabase.from('tasks').delete().in('id', ids)
    if (error) { toast(error.message, 'error'); return }
    setTasks(prev => prev.filter(t => !selected.has(t.id)))
    setSelected(new Set())
    toast(`${ids.length} task${ids.length > 1 ? 's' : ''} deleted`)
  }

  const bulkMarkDone = async () => {
    const ids = Array.from(selected)
    const { error } = await supabase.from('tasks').update({ status: 'done' }).in('id', ids)
    if (error) { toast(error.message, 'error'); return }
    setTasks(prev => prev.map(t => selected.has(t.id) ? { ...t, status: 'done' } : t))
    setSelected(new Set())
    toast(`${ids.length} task${ids.length > 1 ? 's' : ''} marked done`)
  }

  const filtered = tasks.filter(t =>
    (!filterProject || t.project_id === filterProject) &&
    (!filterPriority || t.priority === filterPriority)
  )

  const open = tasks.filter(t => t.status !== 'done').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name

  const isOverdue = (due: string | null) => due && new Date(due) < new Date()

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Tasks & Teams</span>
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + New Task
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Tasks & Teams</h1>
          <p className="text-xs text-[#9B978F] mt-1">{tasks.length} tasks · {open} open · {blocked} blocked</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[#F7F6F2] p-0.5 rounded-lg">
            {(['list', 'board'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-[#9B978F] hover:text-gray-700'}`}>
                {v}
              </button>
            ))}
          </div>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white">
            <option value="">All Priorities</option>
            {['urgent', 'high', 'medium', 'low'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[#9B978F]">{selected.size} selected</span>
              <button onClick={bulkMarkDone} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#E8F5EE] text-[#1A6B45] hover:bg-[#d0eddf]">Mark Done</button>
              <button onClick={bulkDelete} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#FCEAE8] text-[#B8301A] hover:bg-[#f8d5d2]">Delete</button>
            </div>
          )}
        </div>

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F7F6F2]">
                  <th className="w-8 px-4 py-2.5" />
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Task</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Project</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Assigned</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Priority</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Due</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7}><Skeleton /></td></tr> :
                 filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-14 text-center">
                    <p className="text-sm text-gray-400 font-semibold">No tasks found</p>
                    <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg hover:bg-[#BE4A16]">+ New Task</button>
                  </td></tr>
                 ) : filtered.map(task => (
                  <tr key={task.id} className={`border-t border-[#F0EDE8] hover:bg-[#F7F6F2] transition-colors ${task.status === 'done' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleDone(task)} className="accent-[#1A6B45]" onClick={e => e.stopPropagation()} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className={`text-xs font-semibold ${task.status === 'done' ? 'line-through text-[#9B978F]' : 'text-gray-900'}`}>{task.title}</div>
                      {task.description && <div className="text-[11px] text-[#9B978F] mt-0.5 truncate max-w-[240px]">{task.description}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      {task.project_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF0FD] text-[#1A3FAA]">{projName(task.project_id)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#9B978F]">{task.assigned_to || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'text-[#B8301A] font-semibold' : 'text-[#9B978F]'}`}>
                      {task.due_date || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.status === 'done' ? 'bg-[#E8F5EE] text-[#1A6B45]' :
                        task.status === 'blocked' ? 'bg-[#FCEAE8] text-[#B8301A]' :
                        task.status === 'in_progress' ? 'bg-[#EBF0FD] text-[#1A3FAA]' :
                        'bg-gray-100 text-[#9B978F]'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Board View */}
        {view === 'board' && (
          <div className="grid grid-cols-4 gap-4">
            {STATUS_COLS.map(col => (
              <div key={col.key}
                className={`rounded-[10px] bg-white border border-[#DDD9D0] shadow-[0_1px_2px_rgba(0,0,0,.05)] min-h-[400px] transition-colors ${dragOver === col.key ? 'bg-[#EBF0FD]' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(e, col.key)}
              >
                <div className="px-4 py-3 border-b border-[#F0EDE8] flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wide ${col.color}`}>{col.label}</span>
                  <span className="text-xs font-bold text-[#9B978F]">{filtered.filter(t => t.status === col.key).length}</span>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {filtered.filter(t => t.status === col.key).map(task => (
                    <div key={task.id} draggable
                      onDragStart={e => e.dataTransfer.setData('taskId', task.id)}
                      className="bg-[#F7F6F2] rounded-lg p-3 cursor-grab active:cursor-grabbing border border-[#E5E2DB] hover:border-[#D4561A] transition-colors">
                      <div className="text-xs font-semibold text-gray-900 mb-1">{task.title}</div>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.assigned_to && <span className="text-[11px] text-[#9B978F]">{task.assigned_to}</span>}
                      </div>
                      {task.due_date && (
                        <div className={`text-[10px] mt-1 ${isOverdue(task.due_date) ? 'text-[#B8301A] font-semibold' : 'text-[#9B978F]'}`}>
                          Due {task.due_date}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">New Task</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Task Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="e.g. First fix electrics — Ground floor" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project</label>
                  <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    <option value="">No project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Assign To</label>
                  <input value={form.assigned_to} onChange={e => setForm(f => ({...f, assigned_to: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Worker name" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value as Task['priority']}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Est. Hours</label>
                  <input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({...f, estimated_hours: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="4" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.title} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
