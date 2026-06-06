'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Cost, Project } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

type ExtractedData = {
  supplier: string; amount_ex_vat: string; vat: string; total: string; date: string
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

  const mockExtract = (file: File) => {
    setPreview(URL.createObjectURL(file))
    setAnalysing(true)
    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0]
      const mock: ExtractedData = {
        supplier: 'Travis Perkins Ltd',
        amount_ex_vat: '340.80',
        vat: '68.16',
        total: '408.96',
        date: today,
      }
      setExtracted(mock)
      setForm(f => ({ ...f, supplier: mock.supplier, amount: mock.amount_ex_vat, vat: mock.vat, total: mock.total, date: mock.date }))
      setAnalysing(false)
    }, 2000)
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast('Please upload an image or PDF', 'error'); return
    }
    mockExtract(file)
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
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Scan Tickets</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9B978F]">{fmt(weeklyTotal)} logged this week via scan</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF0FD] text-[#1A3FAA]">AI</span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Scan Tickets</h1>
          <p className="text-xs text-[#9B978F] mt-1">Photograph a receipt and AI extracts the data instantly. Never lose a cost again.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Scanner */}
          <div className="col-span-2 space-y-4">
            {!preview ? (
              <div
                className={`border-2 border-dashed rounded-[10px] flex flex-col items-center justify-center py-20 cursor-pointer transition-colors ${dragging ? 'border-[#D4561A] bg-[#FEF6E4]' : 'border-[#DDD9D0] hover:border-[#D4561A] hover:bg-[#F7F6F2]'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-4">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#9B978F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="#9B978F" strokeWidth="1.5"/>
                </svg>
                <p className="text-sm font-semibold text-gray-700">Drop receipt or click to scan</p>
                <p className="text-xs text-[#9B978F] mt-1">JPG, PNG or PDF — AI extracts supplier, amount and VAT</p>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview + analysis */}
                <div className="bg-white border border-[#DDD9D0] rounded-[10px] p-4 flex gap-4">
                  <div className="w-40 h-40 rounded-lg overflow-hidden bg-[#F7F6F2] flex-shrink-0">
                    <img src={preview} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    {analysing ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-6 h-6 border-2 border-[#D4561A] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-semibold text-gray-700">Analysing with AI...</p>
                        <p className="text-xs text-[#9B978F]">Extracting supplier, amount and VAT</p>
                      </div>
                    ) : extracted && (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#E8F5EE] text-[#1A6B45] text-[10px] font-bold mb-2">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          AI extraction complete
                        </div>
                        {[
                          { label: 'Supplier', val: extracted.supplier },
                          { label: 'Amount ex. VAT', val: `£${extracted.amount_ex_vat}` },
                          { label: 'VAT (20%)', val: `£${extracted.vat}` },
                          { label: 'Total inc. VAT', val: `£${extracted.total}` },
                          { label: 'Date', val: extracted.date },
                        ].map(r => (
                          <div key={r.label} className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9B978F] w-28">{r.label}</span>
                            <span className="text-xs font-semibold text-gray-900">{r.val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Editable form */}
                {!analysing && (
                  <div className="bg-white border border-[#DDD9D0] rounded-[10px] p-5 space-y-4">
                    <h3 className="text-xs font-bold text-gray-900">Confirm & Edit Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Supplier</label>
                        <input value={form.supplier} onChange={e => setForm(f => ({...f, supplier: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Amount ex. VAT (£)</label>
                        <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Category</label>
                        <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value as Cost['category']}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                          {(['materials','labour','subcontractors','equipment','other'] as Cost['category'][]).map(c => (
                            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project *</label>
                        <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                          <option value="">Select...</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                      <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Optional" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={reset} className="text-xs font-semibold text-[#9B978F] hover:text-gray-700 underline">Scan another</button>
                      <button onClick={handleConfirm} disabled={saving || !form.project_id} className="flex-1 bg-[#1A6B45] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#145538] disabled:opacity-50">
                        {saving ? 'Saving...' : `Confirm & Log ${form.amount ? fmt(parseFloat(form.amount)) : ''}` }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent scans */}
          <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F0EDE8]">
              <span className="text-xs font-bold text-gray-900">Recent Scans</span>
            </div>
            <div className="divide-y divide-[#F0EDE8] overflow-y-auto max-h-[480px]">
              {recentScans.length === 0 ? (
                <p className="text-xs text-[#9B978F] text-center py-10">No scans yet.</p>
              ) : recentScans.map(c => (
                <div key={c.id} className="px-4 py-3 hover:bg-[#F7F6F2] transition-colors">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-900 truncate">{c.supplier || 'Unknown supplier'}</span>
                    <span className="text-xs font-mono font-bold text-gray-900">{fmt(c.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#9B978F]">{c.date}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-[#9B978F] capitalize">{c.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
