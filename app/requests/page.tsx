'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Request } from '@/lib/types'

const STAGES: { key: Request['status']; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'text-accent' },
  { key: 'site_visit', label: 'Site Visit', color: 'text-warning' },
  { key: 'quoted', label: 'Quoted', color: 'text-accent' },
  { key: 'negotiating', label: 'Negotiating', color: 'text-text-muted' },
  { key: 'won', label: 'Won', color: 'text-success' },
  { key: 'lost', label: 'Lost', color: 'text-danger' },
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
  const [aiGenerating, setAiGenerating] = useState(false)
  const [dragOver, setDragOver] = useState<Request['status'] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

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

  const aiSuggestQuote = async () => {
    if (!panel) return
    setAiGenerating(true)
    try {
      const res = await fetch('/api/ai-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: panel.job_type,
          description: panel.description,
          location: panel.location,
          budget_estimate: panel.budget_estimate,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI quote generation failed')
      setQuoteItems(json.line_items.map((li: { description: string; qty: number; unit: string; unit_price: number }) => ({
        description: li.description,
        qty: String(li.qty),
        unit: li.unit,
        unit_price: String(li.unit_price),
      })))
      if (json.notes) setQuoteNotes(json.notes)
      toast('AI generated quote items')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI generation failed', 'error')
    } finally {
      setAiGenerating(false)
    }
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
      <div className="pt-6 px-6 pb-12">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Client Requests</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">
              {thisMonth.length} this month · {quoted.length} quoted · {won.length} won · {convRate}% conversion · {fmt(totalWon)} won value
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
            + Log Request
          </button>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Pipeline board */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const stageReqs = requests.filter(r => r.status === stage.key)
              const isOver = dragOver === stage.key
              return (
                <div key={stage.key} className="w-64 flex-shrink-0"
                  onDragOver={e => { e.preventDefault(); setDragOver(stage.key) }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                  onDrop={async e => {
                    e.preventDefault(); setDragOver(null)
                    const id = e.dataTransfer.getData('requestId')
                    const req = requests.find(r => r.id === id)
                    if (req && req.status !== stage.key) await moveStage(req, stage.key)
                    setDraggingId(null)
                  }}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs font-bold text-text-muted">{stageReqs.length}</span>
                  </div>
                  <div className={`space-y-2 min-h-[400px] rounded-xl p-1 transition-colors ${isOver ? 'bg-muted' : ''}`}>
                    {loading ? (
                      <div className="space-y-2">{[1,2].map(i=><div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
                    ) : stageReqs.map(req => (
                      <div key={req.id}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData('requestId', req.id); setDraggingId(req.id) }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => setPanel(req)}
                        className={`bg-surface border border-border rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-accent transition-colors select-none ${draggingId === req.id ? 'opacity-50' : ''}`}>
                        <div className="text-xs font-bold text-text-primary mb-1">{req.client_name}</div>
                        {req.job_type && <div className="text-[11px] text-text-muted mb-2">{req.job_type}</div>}
                        {req.location && (
                          <div className="flex items-center gap-1 text-[11px] text-text-muted mb-2">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                            {req.location}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {req.budget_estimate && <span className="text-xs font-mono font-bold text-accent">{fmt(req.budget_estimate)}</span>}
                          <span className="text-[10px] text-text-muted ml-auto">{new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    ))}
                    {!loading && stageReqs.length === 0 && (
                      <div className="text-center py-10 text-[11px] text-text-muted">No requests</div>
                    )}
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
          <div className="fixed top-0 right-0 h-full w-[440px] bg-surface border-l border-border shadow-2xl z-40 flex flex-col overflow-hidden">
            <div className="h-12 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
              <span className="font-bold text-sm text-text-primary">{panel.client_name}</span>
              <button onClick={() => setPanel(null)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Contact */}
              <div className="space-y-1">
                {panel.client_email && <div className="text-xs text-text-muted">{panel.client_email}</div>}
                {panel.client_phone && <div className="text-xs text-text-muted">{panel.client_phone}</div>}
                {panel.location && <div className="text-xs text-text-muted">{panel.location}</div>}
              </div>
              {/* Description */}
              {panel.description && (
                <div className="bg-background border border-border rounded-lg p-3 text-xs text-text-secondary leading-relaxed">{panel.description}</div>
              )}
              {panel.quote_value && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-success">Quote sent</span>
                  <span className="text-sm font-bold font-mono text-success">{fmt(panel.quote_value)}</span>
                </div>
              )}
              {/* Stage buttons */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-2">Move Stage</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.filter(s => s.key !== panel.status).map(s => (
                    <button key={s.key} onClick={() => moveStage(panel, s.key)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border text-text-muted hover:border-accent hover:text-accent transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Internal Notes</label>
                <textarea defaultValue={panel.internal_notes || ''} onBlur={e => saveNotes(panel.id, e.target.value)} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" placeholder="Private notes about this lead..." />
              </div>
            </div>
            {/* Actions */}
            <div className="border-t border-border p-4 flex-shrink-0 space-y-2">
              {panel.status !== 'won' && panel.status !== 'lost' && (
                <button onClick={() => setShowQuote(true)} className="w-full text-xs font-semibold text-white bg-accent py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
                  Generate Quote
                </button>
              )}
              {(panel.status === 'quoted' || panel.status === 'negotiating') && (
                <button onClick={convertToProject} className="w-full text-xs font-semibold text-white bg-success py-2.5 rounded-lg hover:opacity-90 transition-colors">
                  Convert to Project
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quote builder */}
      {showQuote && panel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowQuote(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Quote Builder — {panel.client_name}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={aiSuggestQuote}
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 disabled:opacity-50 transition-colors"
                >
                  {aiGenerating ? (
                    <span className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>
                  )}
                  {aiGenerating ? 'Generating...' : 'AI Suggest'}
                </button>
                <button onClick={() => setShowQuote(false)} className="text-text-muted hover:text-text-primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <table className="w-full mb-3">
                <thead><tr className="bg-background">
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Description</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left w-16">Qty</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left w-20">Unit</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-right w-24">Unit Price</th>
                  <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-right w-24">Total</th>
                  <th className="w-8" />
                </tr></thead>
                <tbody>
                  {quoteItems.map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-2"><input value={item.description} onChange={e => { const n=[...quoteItems]; n[i].description=e.target.value; setQuoteItems(n) }} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="e.g. First fix electrics" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.qty} onChange={e => { const n=[...quoteItems]; n[i].qty=e.target.value; setQuoteItems(n) }} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" /></td>
                      <td className="px-2 py-2"><input value={item.unit} onChange={e => { const n=[...quoteItems]; n[i].unit=e.target.value; setQuoteItems(n) }} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.unit_price} onChange={e => { const n=[...quoteItems]; n[i].unit_price=e.target.value; setQuoteItems(n) }} className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none text-right focus:border-accent" /></td>
                      <td className="px-2 py-2 text-xs font-mono text-right text-text-primary">{item.qty && item.unit_price ? `£${(parseFloat(item.qty)*parseFloat(item.unit_price)).toFixed(2)}` : '—'}</td>
                      <td className="px-2 py-2"><button onClick={() => setQuoteItems(q => q.filter((_,j)=>j!==i))} className="text-text-muted hover:text-danger"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => setQuoteItems(q => [...q, { description: '', qty: '1', unit: 'item', unit_price: '' }])} className="text-xs text-accent font-semibold hover:underline mb-4">+ Add line item</button>
              <div className="border-t border-border pt-4 space-y-1 text-right">
                <div className="flex justify-between text-xs"><span className="text-text-muted">Subtotal</span><span className="font-mono font-semibold text-text-primary">£{quoteSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-text-muted">VAT (20%)</span><span className="font-mono font-semibold text-text-primary">£{quoteVat.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm font-bold text-text-primary"><span>Total</span><span className="font-mono text-accent">£{quoteTotal.toFixed(2)}</span></div>
              </div>
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" placeholder="Payment terms, exclusions..." />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowQuote(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={sendQuote} disabled={saving || quoteItems.every(i=>!i.description)} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send Quote & Generate Contract'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Log New Request</h3>
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Client Name *</label>
                  <input value={newForm.client_name} onChange={e => setNewForm(f=>({...f,client_name:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Sarah Mitchell" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Job Type</label>
                  <input value={newForm.job_type} onChange={e => setNewForm(f=>({...f,job_type:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Loft conversion" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Email</label>
                  <input type="email" value={newForm.client_email} onChange={e => setNewForm(f=>({...f,client_email:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Phone</label>
                  <input value={newForm.client_phone} onChange={e => setNewForm(f=>({...f,client_phone:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Location</label>
                  <input value={newForm.location} onChange={e => setNewForm(f=>({...f,location:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Clapham, SW4" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Budget Est (£)</label>
                  <input type="number" value={newForm.budget_estimate} onChange={e => setNewForm(f=>({...f,budget_estimate:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="35000" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Description</label>
                <textarea value={newForm.description} onChange={e => setNewForm(f=>({...f,description:e.target.value}))} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" placeholder="Scope of works requested..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNew(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !newForm.client_name} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50">
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
