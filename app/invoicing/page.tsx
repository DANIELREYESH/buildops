'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Invoice, Project } from '@/lib/types'
import * as XLSX from 'xlsx'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_COLORS: Record<Invoice['status'], string> = {
  draft:   'bg-gray-100 text-[#9B978F]',
  sent:    'bg-[#EBF0FD] text-[#1A3FAA]',
  paid:    'bg-[#E8F5EE] text-[#1A6B45]',
  overdue: 'bg-[#FCEAE8] text-[#B8301A]',
}

type LineItem = { description: string; qty: number; unit_price: number }

const DEFAULT_ITEMS: LineItem[] = [{ description: '', qty: 1, unit_price: 0 }]

export default function InvoicingPage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [filter, setFilter] = useState<Invoice['status'] | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showPreview, setShowPreview] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState({
    project_id: '',
    client_name: '',
    client_email: '',
    due_date: '',
    notes: '',
    line_items: DEFAULT_ITEMS as LineItem[],
  })

  const load = useCallback(async () => {
    const [{ data: ps }, { data: { user } }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setProjects((ps as Project[]) || [])
    if (user?.email) setUserEmail(user.email)

    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        setTableExists(false)
      }
      setLoading(false)
      return
    }
    setInvoices((data as Invoice[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const subtotal = form.line_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const vat = Math.round(subtotal * 0.20 * 100) / 100
  const total = subtotal + vat

  const nextRef = () => {
    const n = invoices.length + 1
    return `INV-${String(n).padStart(4, '0')}`
  }

  const prefillProject = (projectId: string) => {
    const p = projects.find(x => x.id === projectId)
    if (!p) return
    setForm(f => ({
      ...f,
      project_id: projectId,
      client_name: p.client_name || '',
      client_email: p.client_email || '',
    }))
  }

  const handleCreate = async () => {
    if (!form.client_name || total <= 0) { toast('Add client name and at least one line item', 'error'); return }
    setSaving(true)
    const { data, error } = await supabase.from('invoices').insert({
      project_id: form.project_id || null,
      client_name: form.client_name,
      client_email: form.client_email || null,
      line_items: form.line_items.filter(i => i.description),
      subtotal: Math.round(subtotal * 100) / 100,
      vat,
      total,
      status: 'draft',
      due_date: form.due_date || null,
      invoice_ref: nextRef(),
      notes: form.notes || null,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    setInvoices(prev => [data![0] as Invoice, ...prev])
    setShowCreate(false)
    setForm({ project_id: '', client_name: '', client_email: '', due_date: '', notes: '', line_items: DEFAULT_ITEMS })
    toast('Invoice created')
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
    toast(status === 'paid' ? 'Marked as paid' : status === 'sent' ? 'Marked as sent' : 'Status updated')
  }

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setInvoices(prev => prev.filter(inv => inv.id !== id))
    toast('Invoice deleted')
  }

  const exportExcel = () => {
    const rows = filtered.map(inv => ({
      'Ref': inv.invoice_ref || '',
      'Client': inv.client_name,
      'Email': inv.client_email || '',
      'Subtotal': inv.subtotal,
      'VAT': inv.vat,
      'Total': inv.total,
      'Status': inv.status,
      'Due Date': inv.due_date || '',
      'Created': inv.created_at.split('T')[0],
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
    XLSX.writeFile(wb, 'buildops-invoices.xlsx')
    toast('Exported to Excel')
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  if (!tableExists) {
    return (
      <AppLayout>
        <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#9B978F]">BuildOps</span>
            <Chevron />
            <span className="text-xs font-semibold text-gray-900">Invoicing</span>
          </div>
        </div>
        <div className="p-6 max-w-2xl">
          <div className="bg-[#FEF6E4] border border-[#96670A]/20 rounded-[10px] p-5">
            <h2 className="text-sm font-bold text-[#96670A] mb-2">Database setup required</h2>
            <p className="text-xs text-[#96670A] mb-3">Run this SQL in your Supabase dashboard &rarr; SQL Editor:</p>
            <pre className="bg-white rounded-lg p-4 text-[11px] font-mono text-gray-800 overflow-x-auto border border-[#E5E2DB] whitespace-pre-wrap">{`CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  vat NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue')),
  due_date DATE,
  invoice_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
            <button onClick={() => { setTableExists(true); load() }} className="mt-3 text-xs font-semibold bg-[#D4561A] text-white px-3.5 py-2 rounded-lg hover:bg-[#BE4A16]">
              I've created the table — reload
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Invoicing</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel} className="text-xs font-semibold text-gray-500 border border-[#E5E2DB] px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Export Excel
          </button>
          <button onClick={() => setShowCreate(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16]">
            + New Invoice
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Invoicing</h1>
          <p className="text-xs text-[#9B978F] mt-1">Generate, send and track invoices for all your projects.</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Invoiced', value: fmt(totalInvoiced), color: 'text-gray-900' },
            { label: 'Paid', value: fmt(paid), color: 'text-[#1A6B45]' },
            { label: 'Outstanding', value: fmt(outstanding), color: 'text-[#1A3FAA]' },
            { label: 'Overdue', value: fmt(overdue), color: overdue > 0 ? 'text-[#B8301A]' : 'text-gray-900' },
          ].map(k => (
            <div key={k.label} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
              <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{k.label}</div>
              <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 bg-[#F7F6F2] rounded-xl p-1 w-fit">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-[#9B978F] hover:text-gray-700'}`}
            >
              {s === 'all' ? `All (${invoices.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${invoices.filter(i => i.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3 text-gray-300"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p className="text-sm text-gray-400 font-semibold">No invoices{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg">+ Create Invoice</button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F7F6F2]">
                  <th className="px-5 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Ref</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Client</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Total</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Due</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Status</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] transition-colors">
                    <td className="px-5 py-3 text-xs font-mono font-bold text-gray-900">{inv.invoice_ref || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-gray-900">{inv.client_name}</div>
                      {inv.client_email && <div className="text-[10px] text-[#9B978F]">{inv.client_email}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold font-mono text-gray-900">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-xs text-[#9B978F]">{inv.due_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold capitalize ${STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowPreview(inv)} className="text-[10px] font-semibold text-[#D4561A] hover:underline">Preview</button>
                        {inv.status === 'draft' && (
                          <button onClick={() => updateStatus(inv.id, 'sent')} className="text-[10px] font-semibold text-[#1A3FAA] hover:underline">Send</button>
                        )}
                        {inv.status === 'sent' && (
                          <button onClick={() => updateStatus(inv.id, 'paid')} className="text-[10px] font-semibold text-[#1A6B45] hover:underline">Mark Paid</button>
                        )}
                        <button onClick={() => deleteInvoice(inv.id)} className="text-[10px] font-semibold text-[#9B978F] hover:text-[#B8301A]">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Invoice modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-sm text-gray-900">New Invoice</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Link to Project (optional)</label>
                <select value={form.project_id} onChange={e => prefillProject(e.target.value)} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Name *</label>
                  <input value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Marcus Alderton" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Client Email</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(f => ({...f, client_email: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="marcus@example.com" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
              </div>

              {/* Line items */}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-2">Line Items</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold px-1">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-3 text-right">Unit Price</div>
                    <div className="col-span-1" />
                  </div>
                  {form.line_items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={item.description}
                        onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, description: e.target.value } : li) }))}
                        className="col-span-6 border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]"
                        placeholder="Labour — 3 days"
                      />
                      <input
                        type="number"
                        value={item.qty}
                        min={1}
                        onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, qty: Number(e.target.value) } : li) }))}
                        className="col-span-2 border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#D4561A]"
                      />
                      <input
                        type="number"
                        value={item.unit_price || ''}
                        onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, unit_price: Number(e.target.value) } : li) }))}
                        className="col-span-3 border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-[#D4561A]"
                        placeholder="0.00"
                      />
                      <button onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))} className="col-span-1 text-[#9B978F] hover:text-[#B8301A] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', qty: 1, unit_price: 0 }] }))} className="text-[10px] font-semibold text-[#D4561A] hover:underline mt-1">
                    + Add line item
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-[#F7F6F2] rounded-lg p-4 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-700"><span>Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-xs text-gray-700"><span>VAT (20%)</span><span className="font-mono">{fmt(vat)}</span></div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-[#E5E2DB]"><span>Total</span><span className="font-mono">{fmt(total)}</span></div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Payment terms, bank details, etc." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.client_name || total <= 0} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">{showPreview.invoice_ref}</h3>
              <button onClick={() => setShowPreview(null)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6">
              {/* Invoice header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="font-black text-lg text-gray-900">BuildOps</div>
                  <div className="text-xs text-[#9B978F] mt-0.5">{userEmail}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#9B978F]">Invoice</div>
                  <div className="font-bold text-gray-900">{showPreview.invoice_ref}</div>
                  <div className="text-xs text-[#9B978F] mt-1">Issued: {showPreview.created_at.split('T')[0]}</div>
                  {showPreview.due_date && <div className="text-xs text-[#9B978F]">Due: {showPreview.due_date}</div>}
                </div>
              </div>

              <div className="mb-5 p-3 bg-[#F7F6F2] rounded-lg">
                <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">Bill To</div>
                <div className="text-sm font-semibold text-gray-900">{showPreview.client_name}</div>
                {showPreview.client_email && <div className="text-xs text-[#9B978F]">{showPreview.client_email}</div>}
              </div>

              <table className="w-full mb-4">
                <thead>
                  <tr className="bg-[#F7F6F2]">
                    <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Description</th>
                    <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right">Qty</th>
                    <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right">Unit Price</th>
                    <th className="px-3 py-2 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE8]">
                  {(showPreview.line_items || []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5 text-xs text-gray-900">{item.description}</td>
                      <td className="px-3 py-2.5 text-xs text-right text-gray-700">{item.qty}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-right text-gray-700">{fmt(item.unit_price)}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-right text-gray-900">{fmt(item.qty * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-[#E5E2DB] pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-700"><span>Subtotal</span><span className="font-mono">{fmt(showPreview.subtotal)}</span></div>
                <div className="flex justify-between text-xs text-gray-700"><span>VAT (20%)</span><span className="font-mono">{fmt(showPreview.vat)}</span></div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-[#E5E2DB]"><span>Total</span><span className="font-mono">{fmt(showPreview.total)}</span></div>
              </div>

              {showPreview.notes && (
                <div className="mt-4 p-3 bg-[#F7F6F2] rounded-lg">
                  <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">Notes</div>
                  <p className="text-xs text-gray-700">{showPreview.notes}</p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                {showPreview.status === 'draft' && (
                  <button onClick={() => { updateStatus(showPreview.id, 'sent'); setShowPreview(prev => prev ? { ...prev, status: 'sent' } : null) }} className="flex-1 bg-[#1A3FAA] text-white text-xs font-semibold py-2.5 rounded-lg hover:opacity-90">
                    Mark as Sent
                  </button>
                )}
                {showPreview.status === 'sent' && (
                  <button onClick={() => { updateStatus(showPreview.id, 'paid'); setShowPreview(prev => prev ? { ...prev, status: 'paid' } : null) }} className="flex-1 bg-[#1A6B45] text-white text-xs font-semibold py-2.5 rounded-lg hover:opacity-90">
                    Mark as Paid
                  </button>
                )}
                <button onClick={() => {
                  const lines = (showPreview.line_items || []).map(i => `${i.description}\t${i.qty}\t${fmt(i.unit_price)}\t${fmt(i.qty * i.unit_price)}`).join('\n')
                  const content = `INVOICE ${showPreview.invoice_ref}\n${'='.repeat(40)}\nClient: ${showPreview.client_name}\nEmail: ${showPreview.client_email || '—'}\nDue: ${showPreview.due_date || '—'}\n\n${lines}\n\nSubtotal: ${fmt(showPreview.subtotal)}\nVAT 20%: ${fmt(showPreview.vat)}\nTOTAL: ${fmt(showPreview.total)}${showPreview.notes ? `\n\nNotes: ${showPreview.notes}` : ''}`
                  const blob = new Blob([content], { type: 'text/plain' })
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${showPreview.invoice_ref}.txt`; a.click()
                  toast('Invoice downloaded')
                }} className="flex-1 border border-[#E5E2DB] text-gray-600 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
