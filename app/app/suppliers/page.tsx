'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'

interface Supplier {
  id: string
  name: string
  trade: string | null
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
}

const TRADES = ['Materials', 'Plant Hire', 'Electrical', 'Plumbing', 'Roofing', 'Groundworks', 'Scaffolding', 'Timber', 'Aggregates', 'Tools', 'PPE', 'Other']

export default function SuppliersPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [panel, setPanel] = useState<Supplier | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', trade: '', contact: '', phone: '', email: '', address: '', notes: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    setSuppliers((data as Supplier[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.name) return
    setSaving(true)
    const { data, error } = await supabase.from('suppliers').insert({
      name: form.name, trade: form.trade || null, contact: form.contact || null,
      phone: form.phone || null, email: form.email || null,
      address: form.address || null, notes: form.notes || null,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setSuppliers(prev => [...prev, data[0] as Supplier].sort((a, b) => a.name.localeCompare(b.name)))
    setShowNew(false)
    setForm({ name: '', trade: '', contact: '', phone: '', email: '', address: '', notes: '' })
    toast('Supplier added')
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setSuppliers(prev => prev.filter(s => s.id !== id))
    setPanel(null)
    toast('Supplier removed')
  }

  const saveField = async (id: string, field: string, value: string) => {
    const { error } = await supabase.from('suppliers').update({ [field]: value || null }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    if (panel?.id === id) setPanel(prev => prev ? { ...prev, [field]: value } : prev)
    toast('Saved')
  }

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.trade ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.contact ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="pt-6 px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Suppliers & Prices</h1>
            <p className="text-sm text-text-secondary mt-0.5">{suppliers.length} suppliers on record. Click any row to view contact details.</p>
          </div>
          <button onClick={() => setShowNew(true)} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
            + Add Supplier
          </button>
        </div>
        <div className="border-b border-border mb-6" />

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade or contact..." className="w-full max-w-sm bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Building2 size={20} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-text-primary">{search ? 'No suppliers match your search' : 'No suppliers yet'}</p>
            <p className="text-sm text-text-secondary mt-0.5">{search ? 'Try a different search term' : 'Add your first supplier to start tracking contact details and pricing'}</p>
            {!search && (
              <button onClick={() => setShowNew(true)} className="mt-4 text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">
                + Add Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead><tr className="bg-muted text-text-muted text-xs uppercase tracking-wider border-b border-border">
                <th className="px-5 py-2.5 font-semibold text-left">Supplier</th>
                <th className="px-4 py-2.5 font-semibold text-left">Trade / Category</th>
                <th className="px-4 py-2.5 font-semibold text-left">Contact</th>
                <th className="px-4 py-2.5 font-semibold text-left">Phone</th>
                <th className="px-4 py-2.5 font-semibold text-left">Email</th>
                <th className="px-4 py-2.5 font-semibold text-left">Location</th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setPanel(s)} className="border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/60 transition-colors transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-text-primary">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.trade && <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-text-muted">{s.trade}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.contact || <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.phone || <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.email ? <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="text-accent hover:underline">{s.email}</a> : <span className="text-text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.address || <span className="text-text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier detail panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPanel(null)} />
          <div className="fixed top-0 right-0 h-full w-[400px] bg-surface shadow-2xl z-40 border-l border-border flex flex-col overflow-hidden">
            <div className="h-12 border-b border-border px-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-text-muted">
                  {panel.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-sm text-text-primary">{panel.name}</span>
              </div>
              <button onClick={() => setPanel(null)} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: 'Trade / Category', field: 'trade', type: 'select' },
                { label: 'Contact Name', field: 'contact', type: 'text' },
                { label: 'Phone', field: 'phone', type: 'text' },
                { label: 'Email', field: 'email', type: 'email' },
                { label: 'Address', field: 'address', type: 'text' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">{label}</label>
                  {type === 'select' ? (
                    <select
                      defaultValue={(panel as unknown as Record<string, string | null>)[field] ?? ''}
                      onBlur={e => saveField(panel.id, field, e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="">No category</option>
                      {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      defaultValue={(panel as unknown as Record<string, string | null>)[field] ?? ''}
                      onBlur={e => saveField(panel.id, field, e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <textarea
                  defaultValue={panel.notes ?? ''}
                  onBlur={e => saveField(panel.id, 'notes', e.target.value)}
                  rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
                  placeholder="Pricing agreements, lead times, account numbers..."
                />
              </div>
              <div className="text-[10px] text-text-muted">Added {new Date(panel.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="border-t border-border p-4 flex-shrink-0">
              <button onClick={() => handleDelete(panel.id)} className="w-full text-xs font-semibold text-danger border border-danger/30 py-2.5 rounded-lg hover:bg-danger/10 transition-colors">
                Remove Supplier
              </button>
            </div>
          </div>
        </>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Add Supplier</h3>
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Company Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Travis Perkins, Jewson..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Category</label>
                  <select value={form.trade} onChange={e => setForm(f=>({...f,trade:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">Select...</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Contact Name</label>
                  <input value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Branch address or depot" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none" placeholder="Account number, pricing agreements..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowNew(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
