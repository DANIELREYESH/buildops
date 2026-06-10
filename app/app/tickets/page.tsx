'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Cost, Project } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

type ExtractedData = {
  supplier: string; amount_ex_vat: string; vat: string; total: string; date: string; description?: string
}

export default function TicketsPage() {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [recentScans, setRecentScans] = useState<Cost[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedData | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState({
    supplier: '', amount: '', vat: '', total: '', date: '',
    category: 'materials' as Cost['category'], project_id: '', notes: '',
  })

  const weeklyTotal = recentScans.filter(c => {
    const d = new Date(c.date); const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 86400000
    return diff <= 7
  }).reduce((s, c) => s + c.amount, 0)

  const load = useCallback(async () => {
    const [{ data: ps }, { data: cs }, { data: { user } }] = await Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('costs').select('*').not('receipt_url', 'is', null).order('created_at', { ascending: false }).limit(20),
      supabase.auth.getUser(),
    ])
    setProjects((ps as Project[]) || [])
    setRecentScans((cs as Cost[]) || [])
    if (user?.email) setUserEmail(user.email)
  }, [])

  useEffect(() => { load() }, [load])

  const scanWithAI = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setAnalysing(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Scan failed')
      const extracted: ExtractedData = {
        supplier: json.supplier || '',
        amount_ex_vat: json.amount_ex_vat || '',
        vat: json.vat || '',
        total: json.total || '',
        date: json.date || new Date().toISOString().split('T')[0],
        description: json.description || '',
      }
      setExtracted(extracted)
      setForm(f => ({
        ...f,
        supplier: extracted.supplier,
        amount: extracted.amount_ex_vat,
        vat: extracted.vat,
        total: extracted.total,
        date: extracted.date,
        category: (json.category as Cost['category']) || f.category,
        notes: json.description ? `${json.description}` : f.notes,
      }))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'AI scan failed', 'error')
      setPreview(null)
    } finally {
      setAnalysing(false)
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast('Please upload an image or PDF', 'error'); return
    }
    if (file.type === 'application/pdf') {
      toast('PDF scanning coming soon — use an image for now', 'error'); return
    }
    scanWithAI(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleConfirm = async () => {
    if (!form.amount || !form.project_id) { toast('Select a project and verify the amount', 'error'); return }
    setSaving(true)
    const { data, error } = await supabase.from('costs').insert({
      project_id: form.project_id, category: form.category,
      supplier: form.supplier || null, amount: parseFloat(form.amount),
      date: form.date || new Date().toISOString().split('T')[0],
      notes: form.notes || null, logged_by: userEmail,
      receipt_url: preview || 'scanned',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setRecentScans(prev => [data[0] as Cost, ...prev.slice(0, 19)])
    setPreview(null); setExtracted(null)
    setForm({ supplier: '', amount: '', vat: '', total: '', date: '', category: 'materials', project_id: '', notes: '' })
    toast('Cost logged from receipt')
  }

  const reset = () => { setPreview(null); setExtracted(null); setAnalysing(false) }

  return (
      <div className="pt-6 px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Scan Tickets</h1>
            <p className="text-sm text-text-secondary mt-0.5">Photograph a receipt and AI extracts the data instantly. Never lose a cost again.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{fmt(weeklyTotal)} logged this week via scan</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">AI</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Scanner */}
          <div className="col-span-2 space-y-4">
            {!preview ? (
              <div
                className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-20 cursor-pointer transition-colors ${dragging ? 'border-accent bg-muted/30' : 'border-border bg-background hover:border-accent/40 hover:bg-muted/30'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-4">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="var(--color-text-muted)" strokeWidth="1.5"/>
                </svg>
                <p className="text-sm font-semibold text-text-primary">Drop receipt or click to scan</p>
                <p className="text-sm text-text-secondary mt-0.5">JPG, PNG or PDF — AI extracts supplier, amount and VAT</p>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview + analysis */}
                <div className="bg-surface border border-border rounded-xl p-4 flex gap-4">
                  <div className="w-40 h-40 rounded-lg overflow-hidden bg-background flex-shrink-0">
                    <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    {analysing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-text-primary">Analysing with AI...</p>
                        <p className="text-xs text-text-muted">Extracting supplier, amount and VAT</p>
                      </div>
                    ) : extracted && (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-bold mb-2">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          AI extraction complete
                        </div>
                        {[
                          { label: 'Supplier', val: extracted.supplier },
                          { label: 'Amount ex. VAT', val: `£${extracted.amount_ex_vat}` },
                          { label: 'VAT (20%)', val: `£${extracted.vat}` },
                          { label: 'Total inc. VAT', val: `£${extracted.total}` },
                          { label: 'Date', val: extracted.date },
                          ...(extracted.description ? [{ label: 'Items', val: extracted.description }] : []),
                        ].map(r => (
                          <div key={r.label} className="flex items-start gap-2">
                            <span className="text-[10px] text-text-muted w-28 flex-shrink-0 pt-0.5">{r.label}</span>
                            <span className="text-xs font-semibold text-text-primary">{r.val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Editable form */}
                {!analysing && (
                  <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-text-primary">Confirm & Edit Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Supplier</label>
                        <input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Amount ex. VAT (£)</label>
                        <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Category</label>
                        <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as Cost['category']}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                          {(['materials','labour','subcontractors','equipment','other'] as Cost['category'][]).map(c => (
                            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Project *</label>
                        <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                          <option value="">Select...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                      <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Optional" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={reset} className="text-xs font-semibold text-text-muted hover:text-text-primary underline">Scan another</button>
                      <button onClick={handleConfirm} disabled={saving || !form.project_id} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-semibold py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                        {saving ? 'Saving...' : `Confirm & Log ${form.amount ? fmt(parseFloat(form.amount)) : ''}` }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent scans */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-xs font-bold text-text-primary">Recent Scans</span>
            </div>
            <div className="divide-y divide-border overflow-y-auto max-h-[480px]">
              {recentScans.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="var(--color-accent)" strokeWidth="1.5"/></svg>
                  </div>
                  <p className="text-xs font-medium text-text-primary">No scans yet</p>
                  <p className="text-sm text-text-secondary mt-0.5">Scanned receipts will appear here.</p>
                </div>
              ) : recentScans.map(c => (
                <div key={c.id} className="px-4 py-3 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-text-primary truncate">{c.supplier || 'Unknown supplier'}</span>
                    <span className="text-xs font-mono font-bold text-text-primary">{fmt(c.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted">{c.date}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-muted text-text-muted capitalize">{c.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
)
}
