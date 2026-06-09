'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Cost, Project } from '@/lib/types'
import { CHART_THEME } from '@/lib/chart-colors'

const CATEGORIES: Cost['category'][] = ['materials', 'labour', 'subcontractors', 'equipment', 'other']
const CAT_COLORS: Record<Cost['category'], string> = {
  materials: '#6366f1',
  labour: '#22c55e',
  subcontractors: '#06b6d4',
  equipment: '#f59e0b',
  other: '#71717a',
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

type ProjectWithCosts = Project & { costs: Cost[]; spent: number }

export default function CostsPage() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<ProjectWithCosts[]>([])
  const [allCosts, setAllCosts] = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [form, setForm] = useState({
    project_id: '', category: 'materials' as Cost['category'],
    supplier: '', amount: '', date: new Date().toISOString().split('T')[0],
    notes: '', receipt_url: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: projs }, { data: costs }, { data: { user } }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('costs').select('*').order('date', { ascending: false }),
      supabase.auth.getUser(),
    ])
    if (user?.email) setUserEmail(user.email)
    const costArr = (costs as Cost[]) || []
    setAllCosts(costArr)
    const projArr = ((projs as Project[]) || []).map(p => {
      const pc = costArr.filter(c => c.project_id === p.id)
      return { ...p, costs: pc, spent: pc.reduce((s, c) => s + c.amount, 0) }
    })
    setProjects(projArr)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.project_id || !form.amount) return
    setSaving(true)
    const { data, error } = await supabase.from('costs').insert({
      project_id: form.project_id, category: form.category,
      supplier: form.supplier || null, amount: parseFloat(form.amount),
      date: form.date, notes: form.notes || null,
      receipt_url: form.receipt_url || null, logged_by: userEmail,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) {
      const c = data[0] as Cost
      setAllCosts(prev => [c, ...prev])
      setProjects(prev => prev.map(p => p.id === form.project_id
        ? { ...p, costs: [c, ...p.costs], spent: p.spent + c.amount } : p))
    }
    setShowModal(false)
    setForm({ project_id: '', category: 'materials', supplier: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '', receipt_url: '' })
    toast('Cost logged')
  }

  const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0)
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const margins = projects.filter(p => (p.budget || 0) > 0).map(p => ((p.budget! - p.spent) / p.budget!) * 100)
  const avgMargin = margins.length ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : 0

  const atRiskProjects = projects.filter(p => (p.budget || 0) > 0 && (p.spent / p.budget!) > 0.8)

  const catTotals = CATEGORIES.map(cat => ({
    cat, total: allCosts.filter(c => c.category === cat).reduce((s, c) => s + c.amount, 0),
  }))
  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0)
  let pieAccum = 0
  const pieSegments = catTotals.map(({ cat, total }) => {
    const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0
    const seg = { cat, pct, start: pieAccum }
    pieAccum += pct
    return seg
  })
  const pieGradient = pieSegments.map(s => `${CAT_COLORS[s.cat]} ${s.start}% ${s.start + s.pct}%`).join(', ')

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Budget vs Real</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Real-time cost tracking across all active projects.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
            + Add Cost
          </button>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Alert banners */}
        {atRiskProjects.map(p => {
          const pct = Math.round((p.spent / p.budget!) * 100)
          const projLoss = Math.max(0, p.spent - (p.budget || 0))
          return (
            <div key={p.id} className="mb-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--color-danger)" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="var(--color-danger)"/></svg>
              <p className="text-xs text-danger font-semibold">
                <span className="font-bold">{p.name}</span> has consumed {pct}% of budget at {p.progress}% completion
                {projLoss > 0 && ` — projected loss ${fmt(projLoss)}`}
              </p>
            </div>
          )
        })}

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Budget', value: fmt(totalBudget), color: 'text-text-primary' },
            { label: 'Total Spent', value: fmt(totalSpent), color: 'text-accent' },
            { label: 'Total Remaining', value: fmt(totalRemaining), color: totalRemaining < 0 ? 'text-danger' : 'text-success' },
            { label: 'Avg Margin', value: `${avgMargin}%`, color: avgMargin < 15 ? 'text-danger' : avgMargin < 25 ? 'text-warning' : 'text-success' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Per-project accordion */}
          <div className="col-span-2 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl text-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-accent)" strokeWidth="2"/><path d="M3 9h18M9 21V9" stroke="var(--color-accent)" strokeWidth="2"/></svg>
                </div>
                <p className="text-sm text-text-secondary font-semibold">No projects yet</p>
                <p className="text-sm text-[#a1a1aa] mt-0.5">Create a project to start tracking costs against budget.</p>
              </div>
            ) : projects.map(p => {
              const isExpanded = expanded.has(p.id)
              const pct = (p.budget || 0) > 0 ? Math.min(100, (p.spent / p.budget!) * 100) : 0
              const over = (p.budget || 0) > 0 && p.spent > p.budget!
              const margin = (p.budget || 0) > 0 ? Math.round(((p.budget! - p.spent) / p.budget!) * 100) : 0
              return (
                <div key={p.id} className="bg-surface border border-border rounded-xl overflow-x-auto">
                  <div className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-text-primary truncate">{p.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${margin < 10 ? 'bg-danger/10 text-danger' : margin < 20 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                          {margin}% margin
                        </span>
                      </div>
                      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`absolute left-0 top-0 h-full rounded-full transition-all ${over ? 'bg-danger' : 'bg-accent'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-right">
                      <div>
                        <div className="text-[10px] text-text-muted">Budget</div>
                        <div className="text-xs font-mono font-bold text-text-primary">{p.budget ? fmt(p.budget) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted">Spent</div>
                        <div className={`text-xs font-mono font-bold ${over ? 'text-danger' : 'text-text-primary'}`}>{fmt(p.spent)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted">Left</div>
                        <div className={`text-xs font-mono font-bold ${(p.budget||0)-p.spent < 0 ? 'text-danger' : 'text-success'}`}>{p.budget ? fmt(p.budget - p.spent) : '—'}</div>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border">
                      {p.costs.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-6">No costs logged for this project.</p>
                      ) : (
                        <table className="w-full min-w-[600px]">
                          <thead><tr className="bg-muted/30">
                            <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Date</th>
                            <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Category</th>
                            <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Supplier</th>
                            <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Notes</th>
                            <th className="px-4 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-right">Amount</th>
                          </tr></thead>
                          <tbody>
                            {p.costs.map(c => (
                              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                                <td className="px-4 py-2 text-xs text-text-muted">{c.date}</td>
                                <td className="px-4 py-2">
                                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                                    <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[c.category] }} />
                                    <span className="capitalize">{c.category}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs text-text-secondary">{c.supplier || '—'}</td>
                                <td className="px-4 py-2 text-xs text-text-muted max-w-[160px] truncate">{c.notes || '—'}</td>
                                <td className="px-4 py-2 text-xs font-mono font-bold text-right text-text-primary">{fmt(c.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Category donut */}
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-xs font-bold text-text-primary mb-4">Spend by Category</div>
              {grandTotal > 0 ? (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <defs>
                          {catTotals.filter(c => c.total > 0).map(({ cat }) => (
                            <radialGradient key={cat} id={`grad-${cat}`} cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor={CAT_COLORS[cat]} stopOpacity={1} />
                              <stop offset="100%" stopColor={CAT_COLORS[cat]} stopOpacity={0.7} />
                            </radialGradient>
                          ))}
                        </defs>
                        <Pie
                          data={catTotals.filter(c => c.total > 0).map(({ cat, total }) => ({ name: cat, value: total }))}
                          cx="50%" cy="50%"
                          innerRadius="58%"
                          outerRadius="78%"
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={true}
                          animationDuration={800}
                        >
                          {catTotals.filter(c => c.total > 0).map(({ cat }) => (
                            <Cell key={cat} fill={`url(#grad-${cat})`} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            const pct = grandTotal > 0 ? Math.round(((d.value as number) / grandTotal) * 100) : 0
                            return (
                              <div style={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}` }} className="rounded-lg px-3 py-2 shadow-xl">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[d.name as Cost['category']] }} />
                                  <span style={{ color: CHART_THEME.textColor }} className="text-[10px] capitalize">{d.name}</span>
                                </div>
                                <div style={{ color: CHART_THEME.tooltipText }} className="text-sm font-semibold">{fmt(d.value as number)}</div>
                                <div style={{ color: CHART_THEME.textColor }} className="text-[10px]">{pct}% of total</div>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-base font-bold text-text-primary tabular-nums">{fmt(grandTotal)}</div>
                      <div className="text-[10px] text-text-muted">Total Spend</div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    {catTotals.filter(c => c.total > 0).map(({ cat, total }) => (
                      <div key={cat} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[cat] }} />
                          <span className="text-xs capitalize text-text-secondary">{cat}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-text-primary">{fmt(total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-text-muted text-center py-8">No costs logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Log Cost</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Project *</label>
                <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as Cost['category']}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Amount (£) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Supplier</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Travis Perkins" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Optional details" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Receipt URL</label>
                <input value={form.receipt_url} onChange={e => setForm(f => ({...f, receipt_url: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="https://..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.project_id || !form.amount} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
                  {saving ? 'Saving...' : 'Log Cost'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
