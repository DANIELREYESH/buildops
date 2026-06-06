'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Request } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const STAGES: { key: Request['status']; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'text-[#1A3FAA]' },
  { key: 'site_visit', label: 'Site Visit', color: 'text-[#96670A]' },
  { key: 'quoted', label: 'Quoted', color: 'text-[#D4561A]' },
  { key: 'negotiating', label: 'Negotiating', color: 'text-[#9B978F]' },
  { key: 'won', label: 'Won', color: 'text-[#1A6B45]' },
  { key: 'lost', label: 'Lost', color: 'text-[#B8301A]' },
]

type QuoteItem = { description: string; qty: string; unit: string; unit_price: string }

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

export default function RequestsPage() {
  const { toast } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState<Request | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showQuote, setShowQuote] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newForm, setNewForm] = useState({ client_name: '', client_email: '', client_phone: '', description: '', location: '', budget_estimate: '', job_type: '' })
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([{ description: '', qty: '1', unit: 'item', unit_price: '' }])
  const [quoteNotes, setQuoteNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('requests').select('*').order('created_at', { ascending: false })
    setRequests((data as Request[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newForm.client_name) return
    setSaving(true)
    const { data, error } = await supabase.from('requests').insert({
      client_name: newForm.client_name, client_email: newForm.client_email || null,
      client_phone: newForm.client_phone || null, description: newForm.description || null,
      location: newForm.location || null,
      budget_estimate: newForm.budget_estimate ? parseFloat(newForm.budget_estimate) : null,
      job_type: newForm.job_type || null, status: 'new',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setRequests(prev => [data[0] as Request, ...prev])
    setShowNew(false)
    setNewForm({ client_name: '', client_email: '', client_phone: '', description: '', location: '', budget_estimate: '', job_type: '' })
    toast('Request logged')
  }

  const moveStage = async (req: Request, status: Request['status']) => {
    const { error } = await supabase.from('requests').update({ status }).eq('id', req.id)
    if (error) { toast(error.message, 'error'); return }
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status } : r))
    if (panel?.id === req.id) setPanel(prev => prev ? { ...prev, status } : prev)
    toast('Stage updated')
  }

  const saveNotes = async (id: string, notes: string) => {
    const { error } = await supabase.from('requests').update({ internal_notes: notes }).eq('id', id)
    if (!error) toast('Notes saved')
  }

  const sendQuote = async () => {
    if (!panel) return
    setSaving(true)
    const subtotal = quoteItems.reduce((s, i) => s + (parseFloat(i.qty || '0') * parseFloat(i.unit_price || '0')), 0)
    const vat = subtotal * 0.2
    const total = subtotal + vat
    const { error } = await supabase.from('requests').update({ status: 'quoted', quote_value: total }).eq('id', panel.id)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setRequests(prev => prev.map(r => r.id === panel.id ? { ...r, status: 'quoted', quote_value: total } : r))
    setPanel(prev => prev ? { ...prev, status: 'quoted', quote_value: total } : prev)
    setShowQuote(false)
    setQuoteItems([{ description: '', qty: '1', unit: 'item', unit_price: '' }])
    toast(`Quote of ${fmt(total)} sent`)
  }

  const convertToProject = async () => {
    if (!panel) return
    const { data, error } = await supabase.from('projects').insert({
      name: `${panel.job_type || 'Works'} — ${panel.client_name}`,
      address: panel.location, client_name: panel.client_name,
      client_email: panel.client_email, client_phone: panel.client_phone,
      budget: panel.quote_value, status: 'active', progress: 0,
    }).select()
    if (error) { toast(error.message, 'error'); return }
    await supabase.from('requests').update({ status: 'won' }).eq('id', panel.id)
    setRequests(prev => prev.map(r => r.id === panel.id ? { ...r, status: 'won' } : r))
    setPanel(null)
    toast('Project created from request')
  }

  const thisMonth = requests.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth())
  const won = thisMonth.filter(r => r.status === 'won')
  const quoted = thisMonth.filter(r => r.status === 'quoted' || r.status === 'won')
  const convRate = quoted.length > 0 ? Math.round((won.length / quoted.length) * 100) : 0
  const totalWon = won.reduce((s, r) => s + (r.quote_value || 0), 0)

  const quoteSubtotal = quoteItems.reduce((s, i) => s + (parseFloat(i.qty || '0') * parseFloat(i.unit_price || '0')), 0)
  const quoteVat = quoteSubtotal * 0.2
  const quoteTotal = quoteSubtotal + quoteVat

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Client Requests</span>
        </div>
        <button onClick={() => setShowNew(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Log Request
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Client Requests</h1>
          <p className="text-xs text-[#9B978F] mt-1">
            {thisMonth.length} this month · {quoted.length} quoted · {won.length} won · {convRate}% conversion · {fmt(totalWon)} won value
          </p>
        </div>

        {/* Pipeline board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const stageReqs = requests.filter(r => r.status === stage.key)
              return (
                <div key={stage.key} className="w-64 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs font-bold text-[#9B978F]">{stageReqs.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[400px]">
                    {loading ? (
                      <div className="animate-pulse space-y-2">{[1,2].map(i=><div key={i} className="h-24 bg-gray-100 rounded-[10px]"/>)}</div>
                    ) : stageReqs.map(req => (
                      <div key={req.id} onClick={() => setPanel(req)}
                        className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-3.5 cursor-pointer hover:border-[#D4561A] transition-colors">
                        <div className="text-xs font-bold text-gray-900 mb-1">{req.client_name}</div>
                        {req.job_type && <div className="text-[11px] text-[#9B978F] mb-2">{req.job_type}</div>}
                        {req.location && (
                          <div className="flex items-center gap-1 text-[11px] text-[#9B978F] mb-2">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                            {req.location}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {req.budget_estimate && <span className="text-xs font-mono font-bold text-[#D4561A]">{fmt(req.budget_estimate)}</span>}
                          <span className="text-[10px] text-[#9B978F] ml-auto">{new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Request detail panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPanel(null)} />
          <div className="fixed top-0 right-0 h-full w-[440px] bg-white shadow-2xl z-40 border-l border-[#E5E2DB] flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#E5E2DB] px-5 flex items-center justify-between flex-shrink-0">
              <span className="font-bold text-sm text-gray-900">{panel.client_name}</span>
              <button onClick={() => setPanel(null)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Contact */}
              <div className="space-y-1">
                {panel.client_email && <div className="text-xs text-[#9B978F]">{panel.client_email}</div>}
                {panel.client_phone && <div className="text-xs text-[#9B978F]">{panel.client_phone}</div>}
                {panel.location && <div className="text-xs text-[#9B978F]">{panel.location}</div>}
              </div>
              {/* Description */}
              {panel.description && (
                <div className="bg-[#F7F6F2] rounded-lg p-3 text-xs text-gray-700 leading-relaxed">{panel.description}</div>
              )}
              {panel.quote_value && (
                <div className="bg-[#E8F5EE] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A6B45]">Quote sent</span>
                  <span className="text-sm font-bold font-mono text-[#1A6B45]">{fmt(panel.quote_value)}</span>
                </div>
              )}
              {/* Stage buttons */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-2">Move Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.filter(s => s.key !== panel.status).map(s => (
                    <button key={s.key} onClick={() => moveStage(panel, s.key)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#E5E2DB] text-[#9B978F] hover:border-[#D4561A] hover:text-[#D4561A] transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Internal Notes</label>
                <textarea defaultValue={panel.internal_notes || ''} onBlur={e => saveNotes(panel.id, e.target.value)} rows={3} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Private notes about this lead..." />
              </div>
            </div>
            {/* Actions */}
            <div className="border-t border-[#E5E2DB] p-4 flex-shrink-0 space-y-2">
              {panel.status !== 'won' && panel.status !== 'lost' && (
                <button onClick={() => setShowQuote(true)} className="w-full text-xs font-semibold text-white bg-[#D4561A] py-2.5 rounded-lg hover:bg-[#BE4A16]">
                  Generate Quote
                </button>
              )}
              {(panel.status === 'quoted' || panel.status === 'negotiating') && (
                <button onClick={convertToProject} className="w-full text-xs font-semibold text-[#1A6B45] bg-[#E8F5EE] py-2.5 rounded-lg hover:bg-[#d0eddf]">
                  Convert to Project
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quote builder */}
      {showQuote && panel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowQuote(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Quote Builder — {panel.client_name}</h3>
              <button onClick={() => setShowQuote(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6">
              <table className="w-full mb-3">
                <thead><tr className="bg-[#F7F6F2]">
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Description</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left w-16">Qty</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left w-20">Unit</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right w-24">Unit Price</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right w-24">Total</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody>
                  {quoteItems.map((item, i) => (
                    <tr key={i} className="border-t border-[#F0EDE8]">
                      <td className="px-2 py-2"><input value={item.description} onChange={e => { const n=[...quoteItems]; n[i].description=e.target.value; setQuoteItems(n) }} className="w-full border border-[#E5E2DB] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#D4561A]" placeholder="e.g. First fix electrics" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.qty} onChange={e => { const n=[...quoteItems]; n[i].qty=e.target.value; setQuoteItems(n) }} className="w-full border border-[#E5E2DB] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#D4561A]" /></td>
                      <td className="px-2 py-2"><input value={item.unit} onChange={e => { const n=[...quoteItems]; n[i].unit=e.target.value; setQuoteItems(n) }} className="w-full border border-[#E5E2DB] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#D4561A]" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.unit_price} onChange={e => { const n=[...quoteItems]; n[i].unit_price=e.target.value; setQuoteItems(n) }} className="w-full border border-[#E5E2DB] rounded px-2 py-1 text-xs focus:outline-none text-right focus:border-[#D4561A]" /></td>
                      <td className="px-2 py-2 text-xs font-mono text-right text-gray-900">{item.qty && item.unit_price ? `£${(parseFloat(item.qty)*parseFloat(item.unit_price)).toFixed(2)}` : '—'}</td>
                      <td className="px-2 py-2"><button onClick={() => setQuoteItems(q => q.filter((_,j)=>j!==i))} className="text-[#9B978F] hover:text-[#B8301A]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setQuoteItems(q => [...q, { description: '', qty: '1', unit: 'item', unit_price: '' }])} className="text-xs text-[#D4561A] font-semibold hover:underline mb-4">+ Add line item</button>
              <div className="border-t border-[#E5E2DB] pt-4 space-y-1 text-right">
                <div className="flex justify-between text-xs"><span className="text-[#9B978F]">Subtotal</span><span className="font-mono font-semibold">£{quoteSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-[#9B978F]">VAT (20%)</span><span className="font-mono font-semibold">£{quoteVat.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-bold"><span>Total</span><span className="font-mono text-[#D4561A]">£{quoteTotal.toFixed(2)}</span></div>
              </div>
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows={2} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Payment terms, exclusions..." />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowQuote(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={sendQuote} disabled={saving || quoteItems.every(i=>!i.description)} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send Quote & Generate Contract'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Log New Request</h3>
              <button onClick={() => setShowNew(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Name *</label>
                  <input value={newForm.client_name} onChange={e => setNewForm(f=>({...f,client_name:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Sarah Mitchell" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Job Type</label>
                  <input value={newForm.job_type} onChange={e => setNewForm(f=>({...f,job_type:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Loft conversion" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Email</label>
                  <input type="email" value={newForm.client_email} onChange={e => setNewForm(f=>({...f,client_email:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Phone</label>
                  <input value={newForm.client_phone} onChange={e => setNewForm(f=>({...f,client_phone:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Location</label>
                  <input value={newForm.location} onChange={e => setNewForm(f=>({...f,location:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Clapham, SW4" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Budget Est (£)</label>
                  <input type="number" value={newForm.budget_estimate} onChange={e => setNewForm(f=>({...f,budget_estimate:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="35000" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Description</label>
                <textarea value={newForm.description} onChange={e => setNewForm(f=>({...f,description:e.target.value}))} rows={3} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Scope of works requested..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !newForm.client_name} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Log Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
