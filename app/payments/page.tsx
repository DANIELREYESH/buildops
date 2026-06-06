'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Subcontractor, SubPayment } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

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
  const stepLabel: Record<SubPayment['status'], string> = { pending: 'Pending', approved: 'Approved', processing: 'Processing', paid: 'Paid' }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Sub Payments</span>
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Add Milestone
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Sub Payments</h1>
          <p className="text-xs text-[#9B978F] mt-1">Track milestone payments to all subcontractors on active projects.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Outstanding', value: fmt(outstanding), color: 'text-gray-900' },
            { label: 'Overdue', value: fmt(overdue), color: overdue > 0 ? 'text-[#B8301A]' : 'text-gray-900' },
            { label: 'Paid this month', value: fmt(paidThisMonth), color: 'text-[#1A6B45]' },
            { label: 'Next due', value: nextDue ? `${nextDue.due_date}` : 'None', color: 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{s.label}</div>
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Overdue alerts */}
        {overduePayments.length > 0 && (
          <div className="bg-[#FEF2F2] border border-[#F5C0BC] rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#B8301A" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="text-xs font-semibold text-[#B8301A]">{overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''} — {fmt(overdue)} total. Action required.</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-[10px]" />)}
          </div>
        ) : subsWithPayments.length === 0 ? (
          <div className="bg-white border border-[#DDD9D0] rounded-[10px] text-center py-16">
            <p className="text-sm font-semibold text-gray-500">No payment milestones yet</p>
            <p className="text-xs text-[#9B978F] mt-1">Add milestones to track payments to your subcontractors</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subsWithPayments.map(sub => {
              const isOpen = expanded.has(sub.id)
              const subTotal = sub.payments.reduce((s, p) => s + p.amount, 0)
              const subPaid = sub.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
              const hasOverdue = sub.payments.some(p => p.status !== 'paid' && p.due_date && p.due_date < today)
              return (
                <div key={sub.id} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
                  <button
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-[#F7F6F2] transition-colors text-left"
                    onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(sub.id)) n.delete(sub.id); else n.add(sub.id); return n })}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#D4561A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {sub.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{sub.name}</span>
                        <span className="text-[10px] text-[#9B978F]">{sub.trade}</span>
                        {hasOverdue && <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF2F2] text-[#B8301A]">Overdue</span>}
                      </div>
                      <div className="text-[11px] text-[#9B978F] mt-0.5">{sub.payments.length} milestones · {fmt(subPaid)} paid of {fmt(subTotal)}</div>
                    </div>
                    <div className="flex-shrink-0">
                      {/* Progress bar */}
                      <div className="w-32 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A6B45] rounded-full" style={{ width: `${subTotal > 0 ? (subPaid / subTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`ml-2 transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#F0EDE8] p-5">
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
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${i <= stepIdx ? 'bg-[#1A6B45] text-white' : 'bg-[#F0EDE8] text-[#9B978F]'}`}>
                                      {i < stepIdx ? '✓' : i + 1}
                                    </div>
                                    {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < stepIdx ? 'bg-[#1A6B45]' : 'bg-[#F0EDE8]'}`} />}
                                  </div>
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-gray-900">{p.milestone}</span>
                                {p.due_date && <span className={`text-[10px] ml-2 ${isOverdueP ? 'text-[#B8301A] font-bold' : 'text-[#9B978F]'}`}>Due {p.due_date}{isOverdueP ? ' — OVERDUE' : ''}</span>}
                              </div>
                              <span className="text-xs font-mono font-bold text-gray-900 flex-shrink-0">{fmt(p.amount)}</span>
                              {p.status !== 'paid' ? (
                                <button onClick={() => pay(p.id)} disabled={paying === p.id} className="text-[10px] font-bold text-white bg-[#D4561A] px-3 py-1.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50 flex-shrink-0">
                                  {paying === p.id ? '...' : `Pay ${fmt(p.amount)}`}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-[#1A6B45] flex-shrink-0">Paid {p.paid_at?.slice(0, 10)}</span>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Add Payment Milestone</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Subcontractor *</label>
                <select value={form.sub_id} onChange={e => setForm(f=>({...f,sub_id:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">Select...</option>
                  {subs.map(s => <option key={s.id} value={s.id}>{s.name} — {s.trade}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Milestone *</label>
                <input value={form.milestone} onChange={e => setForm(f=>({...f,milestone:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="e.g. First fix complete" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Amount (£) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="3500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Optional" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.sub_id || !form.milestone || !form.amount} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
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
