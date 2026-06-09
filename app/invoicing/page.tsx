'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, FileText, Plus, Trash2, Download, Send, CheckCircle2 } from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { StatusBadge, statusVariant } from '@/components/StatusBadge'
import { formatDate } from '@/lib/format'
import type { Invoice, Project } from '@/lib/types'
import * as XLSX from 'xlsx'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type LineItem = { description: string; qty: number; unit_price: number }
const DEFAULT_ITEMS: LineItem[] = [{ description: '', qty: 1, unit_price: 0 }]

function StatPill({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'accent' | 'danger' }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 flex-1">
      <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">{label}</div>
      <div className={cn('text-lg font-semibold tabular-nums', tone === 'success' ? 'text-success' : tone === 'accent' ? 'text-accent' : tone === 'danger' ? 'text-danger' : 'text-text-primary')}>{value}</div>
    </div>
  )
}

// ── New Invoice drawer ──────────────────────────────────────────────────────────

function NewInvoiceDrawer({ open, onClose, projects, nextRef, onCreated }: {
  open: boolean; onClose: () => void; projects: Project[]; nextRef: () => string
  onCreated: (inv: Invoice) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    project_id: '', client_name: '', client_email: '', due_date: '', notes: '',
    line_items: DEFAULT_ITEMS as LineItem[],
  })

  const subtotal = form.line_items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const vat = Math.round(subtotal * 0.20 * 100) / 100
  const total = subtotal + vat

  const prefillProject = (projectId: string) => {
    const p = projects.find(x => x.id === projectId)
    setForm(f => ({
      ...f, project_id: projectId,
      client_name: p?.client_name || f.client_name,
      client_email: p?.client_email || f.client_email,
    }))
  }

  const reset = () => setForm({ project_id: '', client_name: '', client_email: '', due_date: '', notes: '', line_items: DEFAULT_ITEMS })

  const handleCreate = async () => {
    if (!form.client_name || total <= 0) { toast.error('Add client name and at least one line item'); return }
    setSaving(true)
    const { data, error } = await supabase.from('invoices').insert({
      project_id: form.project_id || null,
      client_name: form.client_name,
      client_email: form.client_email || null,
      line_items: form.line_items.filter(i => i.description),
      subtotal: Math.round(subtotal * 100) / 100,
      vat, total, status: 'draft',
      due_date: form.due_date || null,
      invoice_ref: nextRef(),
      notes: form.notes || null,
    }).select()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    if (data) onCreated(data[0] as Invoice)
    reset()
    toast.success('Invoice created')
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
          <span className="font-semibold text-sm text-text-primary">New Invoice</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Link to Project</label>
            <select value={form.project_id} onChange={e => prefillProject(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Client Name *</label>
              <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="Marcus Alderton" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Client Email</label>
              <input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="marcus@example.com" />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-2">Line Items</label>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[9px] uppercase tracking-wide text-text-muted font-medium px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit Price</div>
                <div className="col-span-1" />
              </div>
              {form.line_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input value={item.description}
                    onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, description: e.target.value } : li) }))}
                    className="col-span-6 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent" placeholder="Labour — 3 days" />
                  <input type="number" value={item.qty} min={1}
                    onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, qty: Number(e.target.value) } : li) }))}
                    className="col-span-2 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-right text-text-primary focus:outline-none focus:border-accent" />
                  <input type="number" value={item.unit_price || ''}
                    onChange={e => setForm(f => ({ ...f, line_items: f.line_items.map((li, i) => i === idx ? { ...li, unit_price: Number(e.target.value) } : li) }))}
                    className="col-span-3 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-right text-text-primary focus:outline-none focus:border-accent" placeholder="0.00" />
                  <button onClick={() => setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }))} className="col-span-1 text-text-muted hover:text-danger flex items-center justify-center">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, line_items: [...f.line_items, { description: '', qty: 1, unit_price: 0 }] }))}
                className="flex items-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent-hover mt-1">
                <Plus size={12} /> Add line item
              </button>
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-3.5 space-y-1.5">
            <div className="flex justify-between text-xs text-text-secondary"><span>Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>
            <div className="flex justify-between text-xs text-text-secondary"><span>VAT (20%)</span><span className="font-mono">{fmt(vat)}</span></div>
            <div className="flex justify-between text-sm font-semibold text-text-primary pt-1.5 border-t border-border"><span>Total</span><span className="font-mono">{fmt(total)}</span></div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" placeholder="Payment terms, bank details, etc." />
          </div>
        </div>
        <div className="border-t border-border p-4 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !form.client_name || total <= 0} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Preview panel ───────────────────────────────────────────────────────────────

function InvoicePreview({ invoice, userEmail, onClose, onMarkSent, onMarkPaid }: {
  invoice: Invoice | null; userEmail: string; onClose: () => void
  onMarkSent: () => void; onMarkPaid: () => void
}) {
  if (!invoice) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 print:hidden" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col print:static print:w-full print:shadow-none">
        <div className="h-14 border-b border-border px-5 flex items-center justify-between flex-shrink-0 print:hidden">
          <span className="font-semibold text-sm text-text-primary">{invoice.invoice_ref}</span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-white text-gray-900">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center mb-2">
                <span className="text-white font-black text-sm">B</span>
              </div>
              <div className="font-black text-lg tracking-tight">BuildOps</div>
              <div className="text-xs text-gray-500 mt-0.5">{userEmail}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Invoice</div>
              <div className="font-bold text-gray-900">{invoice.invoice_ref}</div>
              <div className="text-xs text-gray-500 mt-1">Issued {new Date(invoice.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              {invoice.due_date && <div className="text-xs text-gray-500">Due {new Date(invoice.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
              <span className={cn('inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>
                {invoice.status}
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Bill To</div>
            <div className="text-sm font-semibold text-gray-900">{invoice.client_name}</div>
            {invoice.client_email && <div className="text-xs text-gray-500">{invoice.client_email}</div>}
          </div>

          <table className="w-full mb-4">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium text-left">Description</th>
                <th className="py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium text-right">Qty</th>
                <th className="py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium text-right">Unit Price</th>
                <th className="py-2 text-[10px] uppercase tracking-wide text-gray-400 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoice.line_items || []).map((item, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-xs text-gray-900">{item.description}</td>
                  <td className="py-2.5 text-xs text-right text-gray-600">{item.qty}</td>
                  <td className="py-2.5 text-xs font-mono text-right text-gray-600">{fmt(item.unit_price)}</td>
                  <td className="py-2.5 text-xs font-mono text-right text-gray-900">{fmt(item.qty * item.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-200 pt-3 space-y-1.5 ml-auto max-w-[220px]">
            <div className="flex justify-between text-xs text-gray-600"><span>Subtotal</span><span className="font-mono">{fmt(invoice.subtotal)}</span></div>
            <div className="flex justify-between text-xs text-gray-600"><span>VAT (20%)</span><span className="font-mono">{fmt(invoice.vat)}</span></div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="font-mono">{fmt(invoice.total)}</span></div>
          </div>

          {invoice.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1">Notes</div>
              <p className="text-xs text-gray-600">{invoice.notes}</p>
            </div>
          )}
        </div>
        <div className="border-t border-border p-4 flex gap-3 flex-shrink-0 print:hidden">
          {invoice.status === 'draft' && (
            <button onClick={onMarkSent} className="flex items-center justify-center gap-1.5 flex-1 bg-accent text-white text-xs font-medium py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
              <Send size={13} /> Mark as Sent
            </button>
          )}
          {invoice.status === 'sent' && (
            <button onClick={onMarkPaid} className="flex items-center justify-center gap-1.5 flex-1 bg-success text-white text-xs font-medium py-2.5 rounded-lg hover:opacity-90 transition-colors">
              <CheckCircle2 size={13} /> Mark as Paid
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center justify-center gap-1.5 flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">
            <Download size={13} /> Download PDF
          </button>
        </div>
      </div>
    </>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

function InvoicingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [filter, setFilter] = useState<Invoice['status'] | 'all'>('all')
  const [showDrawer, setShowDrawer] = useState(false)
  const [preview, setPreview] = useState<Invoice | null>(null)
  const [userEmail, setUserEmail] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: { user } }] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setProjects((ps as Project[]) || [])
    if (user?.email) setUserEmail(user.email)

    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) setTableExists(false)
      setLoading(false)
      return
    }
    setInvoices((data as Invoice[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (searchParams.get('new') === '1') setShowDrawer(true) }, [searchParams])

  const closeDrawer = () => {
    setShowDrawer(false)
    if (searchParams.get('new')) router.replace('/invoicing')
  }

  const nextRef = () => `INV-${String(invoices.length + 1).padStart(4, '0')}`

  const updateStatus = async (id: string, status: Invoice['status']) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv))
    setPreview(prev => prev && prev.id === id ? { ...prev, status } : prev)
    toast.success(status === 'paid' ? 'Marked as paid' : status === 'sent' ? 'Marked as sent' : 'Status updated')
  }

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setInvoices(prev => prev.filter(inv => inv.id !== id))
    toast.success('Invoice deleted')
  }

  const exportExcel = () => {
    const rows = filtered.map(inv => ({
      Ref: inv.invoice_ref || '', Client: inv.client_name, Email: inv.client_email || '',
      Subtotal: inv.subtotal, VAT: inv.vat, Total: inv.total, Status: inv.status,
      'Due Date': inv.due_date || '', Created: inv.created_at.split('T')[0],
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
    XLSX.writeFile(wb, 'buildops-invoices.xlsx')
    toast.success('Exported to Excel')
  }

  const filtered = useMemo(() => filter === 'all' ? invoices : invoices.filter(i => i.status === filter), [invoices, filter])

  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const outstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)

  if (!tableExists) {
    return (
      <AppLayout>
        <div className="p-6 max-w-2xl">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-warning mb-2">Database setup required</h2>
            <p className="text-xs text-warning/90 mb-3">Run this SQL in your Supabase dashboard → SQL Editor, then reload.</p>
            <pre className="bg-background rounded-lg p-4 text-[11px] font-mono text-text-secondary overflow-x-auto border border-border whitespace-pre-wrap">{`CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  line_items JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  vat NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  due_date DATE, invoice_ref TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
            <button onClick={() => { setTableExists(true); load() }} className="mt-3 text-xs font-medium bg-accent text-white px-3.5 py-2 rounded-lg hover:bg-accent-hover transition-colors">
              I've created the table — reload
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12 max-w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Invoicing</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Generate, send and track invoices for all your projects.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <Download size={12} /> Export Excel
            </button>
            <button onClick={() => setShowDrawer(true)} className="text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors">
              + New Invoice
            </button>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3 mb-5">
          <StatPill label="Total Invoiced" value={fmt(totalInvoiced)} />
          <StatPill label="Paid" value={fmt(paid)} tone="success" />
          <StatPill label="Outstanding" value={fmt(outstanding)} tone="accent" />
          <StatPill label="Overdue" value={fmt(overdue)} tone={overdue > 0 ? 'danger' : undefined} />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 mb-4 bg-muted rounded-lg p-0.5 w-fit">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all',
                filter === s ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
              {s === 'all' ? `All (${invoices.length})` : `${s} (${invoices.filter(i => i.status === s).length})`}
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-11 rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <FileText size={20} className="text-accent" />
              </div>
              <p className="text-sm font-medium text-text-primary">No invoices{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
              <button onClick={() => setShowDrawer(true)} className="mt-4 text-xs font-medium text-white bg-accent hover:bg-accent-hover active:scale-[0.98] px-3.5 py-2 rounded-lg transition-colors">+ Create Invoice</button>
            </div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['Ref', 'Client', 'Total', 'Due', 'Status', ''].map(h => (
                    <th key={h} className="px-4 h-10 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left bg-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} onClick={() => setPreview(inv)} className="border-t border-border cursor-pointer hover:bg-muted/60 transition-colors transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-text-primary">{inv.invoice_ref || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-medium text-text-primary">{inv.client_name}</div>
                      {inv.client_email && <div className="text-[10px] text-text-muted">{inv.client_email}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-text-primary">{fmt(inv.total)}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={inv.status.charAt(0).toUpperCase() + inv.status.slice(1)} variant={statusVariant(inv.status)} /></td>
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3">
                        {inv.status === 'draft' && <button onClick={() => updateStatus(inv.id, 'sent')} className="text-[11px] font-medium text-accent hover:text-accent-hover">Send</button>}
                        {inv.status === 'sent' && <button onClick={() => updateStatus(inv.id, 'paid')} className="text-[11px] font-medium text-success hover:opacity-80">Mark Paid</button>}
                        <button onClick={() => deleteInvoice(inv.id)} className="text-text-muted hover:text-danger transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <NewInvoiceDrawer open={showDrawer} onClose={closeDrawer} projects={projects} nextRef={nextRef} onCreated={inv => setInvoices(prev => [inv, ...prev])} />
      <InvoicePreview invoice={preview} userEmail={userEmail} onClose={() => setPreview(null)}
        onMarkSent={() => preview && updateStatus(preview.id, 'sent')}
        onMarkPaid={() => preview && updateStatus(preview.id, 'paid')} />
    </AppLayout>
  )
}

export default function InvoicingPage() {
  return (
    <Suspense>
      <InvoicingPageInner />
    </Suspense>
  )
}
