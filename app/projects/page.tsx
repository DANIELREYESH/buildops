'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Project, Cost } from '@/lib/types'

type Tab = 'all' | 'active' | 'delayed' | 'on_hold' | 'completed'
type PanelTab = 'overview' | 'tasks' | 'costs' | 'checkins'

const STATUS_LABELS: Record<Project['status'], string> = {
  active: 'Active', delayed: 'Delayed', on_hold: 'On Hold', completed: 'Completed',
}
const STATUS_COLORS: Record<Project['status'], string> = {
  active: 'bg-[#E8F5EE] text-[#1A6B45]',
  delayed: 'bg-[#FCEAE8] text-[#B8301A]',
  on_hold: 'bg-[#FEF6E4] text-[#96670A]',
  completed: 'bg-gray-100 text-[#9B978F]',
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-[#F0EDE8]">
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-4 bg-gray-100 rounded w-1/6" />
          <div className="h-4 bg-gray-100 rounded w-1/6" />
          <div className="h-4 bg-gray-100 rounded w-1/8" />
          <div className="h-4 bg-gray-100 rounded w-1/8" />
        </div>
      ))}
    </div>
  )
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [spentMap, setSpentMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState<Project | null>(null)
  const [panelTab, setPanelTab] = useState<PanelTab>('overview')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editProgress, setEditProgress] = useState(0)
  const [panelCosts, setPanelCosts] = useState<Cost[]>([])

  const [form, setForm] = useState({
    name: '', address: '', client_name: '', client_email: '', client_phone: '',
    budget: '', deadline: '', description: '', workers: '',
  })

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

  const openPanel = async (p: Project) => {
    setPanel(p)
    setEditProgress(p.progress)
    setPanelTab('overview')
    const { data } = await supabase.from('costs').select('*').eq('project_id', p.id).order('date', { ascending: false })
    setPanelCosts((data as Cost[]) || [])
  }

  const handleCreate = async () => {
    if (!form.name) return
    setSaving(true)
    const { data, error } = await supabase.from('projects').insert({
      name: form.name, address: form.address || null,
      client_name: form.client_name || null, client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      deadline: form.deadline || null, description: form.description || null,
      workers: form.workers ? form.workers.split(',').map(w => w.trim()).filter(Boolean) : null,
      status: 'active', progress: 0,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) { setProjects(prev => [data[0] as Project, ...prev]) }
    setShowModal(false)
    setForm({ name: '', address: '', client_name: '', client_email: '', client_phone: '', budget: '', deadline: '', description: '', workers: '' })
    toast('Project created')
  }

  const handleUpdate = async (field: string, value: string | number) => {
    if (!panel) return
    const { error } = await supabase.from('projects').update({ [field]: value }).eq('id', panel.id)
    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.map(p => p.id === panel.id ? { ...p, [field]: value } : p))
    setPanel(prev => prev ? { ...prev, [field]: value } : prev)
    toast('Saved')
  }

  const handleDelete = async () => {
    if (!panel) return
    const { error } = await supabase.from('projects').delete().eq('id', panel.id)
    if (error) { toast(error.message, 'error'); return }
    setProjects(prev => prev.filter(p => p.id !== panel.id))
    setPanel(null)
    setConfirmDelete(false)
    toast('Project deleted')
  }

  const filtered = projects.filter(p => {
    const matchTab = tab === 'all' || p.status === tab
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name || '').toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const totalSpent = Object.values(spentMap).reduce((s, v) => s + v, 0)
  const activeCount = projects.filter(p => p.status === 'active').length
  const margins = projects.filter(p => (p.budget || 0) > 0).map(p => {
    const spent = spentMap[p.id] || 0
    return ((p.budget! - spent) / p.budget!) * 100
  })
  const avgMargin = margins.length ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : 0

  const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

  return (
    <AppLayout>
      {/* Topbar */}
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Projects</span>
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + New Project
        </button>
      </div>

      <div className="p-6 max-w-full">
        {/* Header stats */}
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Projects</h1>
          <p className="text-xs text-[#9B978F] mt-1">
            {activeCount} active · {fmt(totalBudget)} total contract value · avg margin {avgMargin}%
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-0.5 bg-[#F7F6F2] p-0.5 rounded-lg">
            {(['all', 'active', 'delayed', 'on_hold', 'completed'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-[#9B978F] hover:text-gray-700'}`}
              >
                {t === 'on_hold' ? 'On Hold' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-[#D4561A] bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2]">
                {['Project', 'Client', 'Progress', 'Budget', 'Spent', 'Remaining', 'Margin', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><Skeleton /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#F7F6F2] flex items-center justify-center mx-auto mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12 2 2 7 12 12 22 7 12 2" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="2 17 12 22 22 17" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="text-sm text-gray-400 font-semibold">No projects found</p>
                    <p className="text-xs text-gray-300 mt-1">Create your first project to start tracking work and costs.</p>
                    <button onClick={() => setShowModal(true)} className="mt-4 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg hover:bg-[#BE4A16]">+ New Project</button>
                  </td>
                </tr>
              ) : filtered.map(p => {
                const spent = spentMap[p.id] || 0
                const remaining = (p.budget || 0) - spent
                const margin = (p.budget || 0) > 0 ? Math.round(((p.budget! - spent) / p.budget!) * 100) : 0
                return (
                  <tr key={p.id} onClick={() => openPanel(p)} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] cursor-pointer transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-xs text-gray-900">{p.name}</div>
                      {p.address && <div className="text-[11px] text-[#9B978F] mt-0.5">{p.address}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{p.client_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4561A] rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-[11px] text-[#9B978F]">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{p.budget ? fmt(p.budget) : '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[#9B978F]">{spent > 0 ? fmt(spent) : '—'}</td>
                    <td className={`px-4 py-2.5 text-xs font-mono ${remaining < 0 ? 'text-[#B8301A]' : 'text-gray-900'}`}>
                      {p.budget ? fmt(remaining) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.budget ? (
                        <span className={`text-xs font-bold ${margin < 10 ? 'text-[#B8301A]' : margin < 20 ? 'text-[#96670A]' : 'text-[#1A6B45]'}`}>
                          {margin}%
                        </span>
                      ) : '—'}
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

      {/* Slide Panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setPanel(null); setConfirmDelete(false) }} />
          <div className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-40 border-l border-[#E5E2DB] flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#E5E2DB] px-5 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold text-sm text-gray-900 truncate">{panel.name}</span>
              <button onClick={() => setPanel(null)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            {/* Panel tabs */}
            <div className="flex border-b border-[#E5E2DB] flex-shrink-0">
              {(['overview', 'tasks', 'costs', 'checkins'] as PanelTab[]).map(t => (
                <button key={t} onClick={() => setPanelTab(t)} className={`px-4 py-2.5 text-xs font-semibold capitalize transition-colors ${panelTab === t ? 'border-b-2 border-[#D4561A] text-[#D4561A]' : 'text-[#9B978F] hover:text-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {panelTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1">Client</label>
                    <div className="text-sm font-semibold">{panel.client_name || '—'}</div>
                    {panel.client_email && <div className="text-xs text-[#9B978F]">{panel.client_email}</div>}
                    {panel.client_phone && <div className="text-xs text-[#9B978F]">{panel.client_phone}</div>}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Progress</label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="100" value={editProgress}
                        onChange={e => setEditProgress(Number(e.target.value))}
                        onMouseUp={() => handleUpdate('progress', editProgress)}
                        className="flex-1" />
                      <span className="text-sm font-bold text-[#D4561A] w-10 text-right">{editProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Status</label>
                    <select value={panel.status} onChange={e => handleUpdate('status', e.target.value)}
                      className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                      {(['active', 'delayed', 'on_hold', 'completed'] as Project['status'][]).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Budget</label>
                      <input type="number" defaultValue={panel.budget || ''} onBlur={e => e.target.value && handleUpdate('budget', parseFloat(e.target.value))}
                        className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="£" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Deadline</label>
                      <input type="date" defaultValue={panel.deadline || ''} onBlur={e => handleUpdate('deadline', e.target.value)}
                        className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Description</label>
                    <textarea defaultValue={panel.description || ''} onBlur={e => handleUpdate('description', e.target.value)} rows={3}
                      className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none"
                      placeholder="Project scope and notes..." />
                  </div>
                </div>
              )}
              {panelTab === 'costs' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-900">Cost Items</span>
                    <span className="text-xs font-mono text-[#D4561A] font-bold">{fmt(panelCosts.reduce((s, c) => s + c.amount, 0))}</span>
                  </div>
                  {panelCosts.length === 0 ? (
                    <p className="text-xs text-[#9B978F] text-center py-8">No costs logged for this project.</p>
                  ) : (
                    <table className="w-full">
                      <thead><tr className="bg-[#F7F6F2]">
                        <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Date</th>
                        <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Category</th>
                        <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Supplier</th>
                        <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right">Amount</th>
                      </tr></thead>
                      <tbody>
                        {panelCosts.map(c => (
                          <tr key={c.id} className="border-t border-[#F0EDE8]">
                            <td className="px-3 py-2 text-xs text-[#9B978F]">{c.date}</td>
                            <td className="px-3 py-2 text-xs capitalize">{c.category}</td>
                            <td className="px-3 py-2 text-xs text-[#9B978F]">{c.supplier || '—'}</td>
                            <td className="px-3 py-2 text-xs font-mono text-right">{fmt(c.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {(panelTab === 'tasks' || panelTab === 'checkins') && (
                <p className="text-xs text-[#9B978F] text-center py-8">Manage from the {panelTab === 'tasks' ? 'Tasks & Teams' : 'AI Check-ins'} module.</p>
              )}
            </div>
            <div className="border-t border-[#E5E2DB] p-4 flex-shrink-0">
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="w-full text-xs font-semibold text-[#B8301A] border border-[#FCEAE8] bg-[#FCEAE8] py-2 rounded-lg hover:bg-[#f8d5d2] transition-colors">
                  Delete Project
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 text-xs font-semibold text-gray-500 border border-[#E5E2DB] py-2 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 text-xs font-semibold text-white bg-[#B8301A] py-2 rounded-lg hover:bg-[#9e2916]">Confirm Delete</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">New Project</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="e.g. Kensington Flat Renovation" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Site Address</label>
                <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="e.g. 14 Palace Gardens, W8 4RT" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Name</label>
                  <input value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="James Sullivan" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Email</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(f => ({...f, client_email: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="james@email.com" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Phone</label>
                  <input value={form.client_phone} onChange={e => setForm(f => ({...f, client_phone: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="+44 7700 000000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Budget (£)</label>
                  <input type="number" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="25000" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Scope of works..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
