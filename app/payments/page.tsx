'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Subcontractor, SubPayment } from '@/lib/types'
import { CHART_THEME } from '@/lib/chart-colors'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

type SubWithPayments = Subcontractor & { payments: SubPayment[] }

export default function PaymentsPage() {
  const { toast } = useToast()
  const [subs, setSubs] = useState<SubWithPayments[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allPayments, setAllPayments] = useState<SubPayment[]>([])

  const [form, setForm] = useState({
    sub_id: '', milestone: '', amount: '', due_date: '', notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: subsData }, { data: paymentsData }] = await Promise.all([
      supabase.from('subcontractors').select('*').order('name'),
      supabase.from('sub_payments').select('*').order('due_date', { ascending: true }),
    ])
    const payments = (paymentsData as SubPayment[]) || []
    const subsRaw = (subsData as Subcontractor[]) || []
    setSubs(subsRaw.map(s => ({ ...s, payments: payments.filter(p => p.sub_id === s.id) })))
    setAllPayments(payments)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  const outstanding = allPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0)
  const overdue = allPayments.filter(p => p.status !== 'paid' && p.due_date != null && p.due_date < today).reduce((s, p) => s + p.amount, 0)
  const paidThisMonth = allPayments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 7) === today.slice(0, 7)).reduce((s, p) => s + p.amount, 0)
  const nextDue = allPayments.filter(p => p.status !== 'paid' && p.due_date != null && p.due_date >= today).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0]

  const overduePayments = allPayments.filter(p => p.status !== 'paid' && p.due_date != null && p.due_date < today)

  const pay = async (paymentId: string) => {
    setPaying(paymentId)
    const { error } = await supabase.from('sub_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId)
    setPaying(null)
    if (error) { toast(error.message, 'error'); return }
    setAllPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' as SubPayment['status'], paid_at: new Date().toISOString() } : p))
    setSubs(prev => prev.map(s => ({ ...s, payments: s.payments.map(p => p.id === paymentId ? { ...p, status: 'paid' as SubPayment['status'], paid_at: new Date().toISOString() } : p) })))
    toast('Payment recorded')
  }

  const handleCreate = async () => {
    if (!form.sub_id || !form.milestone || !form.amount) return
    setSaving(true)
    const { data, error } = await supabase.from('sub_payments').insert({
      sub_id: form.sub_id, milestone: form.milestone,
      amount: parseFloat(form.amount), due_date: form.due_date || null,
      notes: form.notes || null, status: 'pending',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    const newPay = data?.[0] as SubPayment
    if (newPay) {
      setAllPayments(prev => [...prev, newPay])
      setSubs(prev => prev.map(s => s.id === form.sub_id ? { ...s, payments: [...s.payments, newPay] } : s))
    }
    setShowModal(false)
    setForm({ sub_id: '', milestone: '', amount: '', due_date: '', notes: '' })
    toast('Payment milestone added')
  }

  const subsWithPayments = subs.filter(s => s.payments.length > 0)

  const STEPS: SubPayment['status'][] = ['pending', 'approved', 'processing', 'paid']

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Sub Payments</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Track milestone payments to all subcontractors on active projects.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
            + Add Milestone
          </button>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Stats + donut */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Left: stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Outstanding', value: fmt(outstanding), color: 'text-text-primary' },
              { label: 'Overdue', value: fmt(overdue), color: overdue > 0 ? 'text-danger' : 'text-text-primary' },
              { label: 'Paid this month', value: fmt(paidThisMonth), color: 'text-success' },
              { label: 'Next due', value: nextDue ? `${nextDue.due_date}` : 'None', color: 'text-text-primary' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">{s.label}</div>
                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Right: mini donut */}
          <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <defs>
                    <radialGradient id="payPaid" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                    </radialGradient>
                    <radialGradient id="payOutstanding" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                    </radialGradient>
                    <radialGradient id="payOverdue" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                    </radialGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'Paid', value: paidThisMonth || 0.01 },
                      { name: 'Outstanding', value: Math.max(0, outstanding - overdue) || 0.01 },
                      { name: 'Overdue', value: overdue || 0.01 },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius="55%" outerRadius="78%"
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                  >
                    <Cell fill="url(#payPaid)" />
                    <Cell fill="url(#payOutstanding)" />
                    <Cell fill="url(#payOverdue)" />
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div style={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}` }} className="rounded-lg px-3 py-2 text-xs shadow-xl">
                          <div style={{ color: CHART_THEME.tooltipText }} className="font-semibold">{payload[0].name}</div>
                          <div style={{ color: CHART_THEME.tooltipText }} className="font-mono">{fmt(payload[0].value as number)}</div>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Paid this month', value: fmt(paidThisMonth), color: '#22c55e' },
                { label: 'Outstanding', value: fmt(Math.max(0, outstanding - overdue)), color: '#6366f1' },
                { label: 'Overdue', value: fmt(overdue), color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-text-muted flex-1">{item.label}</span>
                  <span className="text-[10px] font-mono font-semibold text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue alerts */}
        {overduePayments.length > 0 && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="text-xs font-semibold text-danger">{overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''} — {fmt(overdue)} total. Action required.</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : subsWithPayments.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="var(--color-accent)" strokeWidth="2"/><line x1="2" y1="10" x2="22" y2="10" stroke="var(--color-accent)" strokeWidth="2"/></svg>
            </div>
            <p className="text-sm font-medium text-text-primary">No payment milestones yet</p>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Add milestones to track payments to your subcontractors</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subsWithPayments.map(sub => {
              const isOpen = expanded.has(sub.id)
              const subTotal = sub.payments.reduce((s, p) => s + p.amount, 0)
              const subPaid = sub.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
              const hasOverdue = sub.payments.some(p => p.status !== 'paid' && p.due_date && p.due_date < today)
              return (
                <div key={sub.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <button
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left"
                    onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(sub.id)) n.delete(sub.id); else n.add(sub.id); return n })}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {sub.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{sub.name}</span>
                        <span className="text-[10px] text-text-muted">{sub.trade}</span>
                        {hasOverdue && <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-danger/10 text-danger border border-danger/20">Overdue</span>}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">{sub.payments.length} milestones · {fmt(subPaid)} paid of {fmt(subTotal)}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-[9px] text-text-muted text-right mb-1">{subTotal > 0 ? Math.round((subPaid / subTotal) * 100) : 0}%</div>
                      <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: '#1f1f1f' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${subTotal > 0 ? (subPaid / subTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)' }} />
                      </div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`ml-2 transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-5">
                      {/* Milestone steps */}
                      <div className="space-y-3">
                        {sub.payments.map(p => {
                          const stepIdx = STEPS.indexOf(p.status)
                          const isOverdueP = p.status !== 'paid' && p.due_date && p.due_date < today
                          return (
                            <div key={p.id} className="flex items-center gap-4">
                              {/* Step track */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {STEPS.map((step, i) => (
                                  <div key={step} className="flex items-center">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${i <= stepIdx ? 'bg-success text-white' : 'bg-muted text-text-muted'}`}>
                                      {i < stepIdx ? '✓' : i + 1}
                                    </div>
                                    {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < stepIdx ? 'bg-success' : 'bg-muted'}`} />}
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-text-primary">{p.milestone}</span>
                                {p.due_date && <span className={`text-[10px] ml-2 ${isOverdueP ? 'text-danger font-bold' : 'text-text-muted'}`}>Due {p.due_date}{isOverdueP ? ' — OVERDUE' : ''}</span>}
                              </div>
                              <span className="text-xs font-mono font-bold text-text-primary flex-shrink-0">{fmt(p.amount)}</span>
                              {p.status !== 'paid' ? (
                                <button onClick={() => pay(p.id)} disabled={paying === p.id} className="text-[10px] font-bold text-white bg-accent px-3 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 flex-shrink-0">
                                  {paying === p.id ? '...' : `Pay ${fmt(p.amount)}`}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-success flex-shrink-0">Paid {p.paid_at?.slice(0, 10)}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Add Payment Milestone</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Subcontractor *</label>
                <select value={form.sub_id} onChange={e => setForm(f=>({...f,sub_id:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">Select...</option>
                  {subs.map(s => <option key={s.id} value={s.id}>{s.name} — {s.trade}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Milestone *</label>
                <input value={form.milestone} onChange={e => setForm(f=>({...f,milestone:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="e.g. First fix complete" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Amount (£) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="3500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Optional" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.sub_id || !form.milestone || !form.amount} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Milestone'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
