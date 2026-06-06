'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

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
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Suppliers & Prices</span>
        </div>
        <button onClick={() => setShowNew(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Add Supplier
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Suppliers & Prices</h1>
          <p className="text-xs text-[#9B978F] mt-1">{suppliers.length} suppliers on record. Click any row to view contact details.</p>
        </div>

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade or contact..." className="w-full max-w-sm border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
        </div>

        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-[#F7F6F2] border-b border-[#E5E2DB]">
              <th className="px-5 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Supplier</th>
              <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Trade / Category</th>
              <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Contact</th>
              <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Phone</th>
              <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Email</th>
              <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">Location</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {loading ? (
                [1,2,3,4].map(i => <tr key={i}><td colSpan={6} className="px-5 py-3"><div className="animate-pulse h-4 bg-gray-100 rounded w-3/4" /></td></tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-16 text-center">
                  <p className="text-sm font-semibold text-gray-500">{search ? 'No suppliers match your search' : 'No suppliers yet'}</p>
                  {!search && <p className="text-xs text-[#9B978F] mt-1">Add your first supplier to start tracking contact details and pricing</p>}
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} onClick={() => setPanel(s)} className="hover:bg-[#F7F6F2] cursor-pointer transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#F0EDE8] flex items-center justify-center text-[10px] font-bold text-[#9B978F] flex-shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.trade && <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F0EDE8] text-[#9B978F]">{s.trade}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">{s.contact || <span className="text-[#9B978F]">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{s.phone || <span className="text-[#9B978F]">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{s.email ? <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="text-[#1A3FAA] hover:underline">{s.email}</a> : <span className="text-[#9B978F]">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{s.address || <span className="text-[#9B978F]">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier detail panel */}
      {panel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setPanel(null)} />
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-40 border-l border-[#E5E2DB] flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#E5E2DB] px-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#F0EDE8] flex items-center justify-center text-[10px] font-bold text-[#9B978F]">
                  {panel.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-bold text-sm text-gray-900">{panel.name}</span>
              </div>
              <button onClick={() => setPanel(null)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
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
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">{label}</label>
                  {type === 'select' ? (
                    <select
                      defaultValue={(panel as unknown as Record<string, string | null>)[field] ?? ''}
                      onBlur={e => saveField(panel.id, field, e.target.value)}
                      className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]"
                    >
                      <option value="">No category</option>
                      {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      type={type}
                      defaultValue={(panel as unknown as Record<string, string | null>)[field] ?? ''}
                      onBlur={e => saveField(panel.id, field, e.target.value)}
                      className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <textarea
                  defaultValue={panel.notes ?? ''}
                  onBlur={e => saveField(panel.id, 'notes', e.target.value)}
                  rows={4}
                  className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none"
                  placeholder="Pricing agreements, lead times, account numbers..."
                />
              </div>
              <div className="text-[10px] text-[#9B978F]">Added {new Date(panel.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="border-t border-[#E5E2DB] p-4 flex-shrink-0">
              <button onClick={() => handleDelete(panel.id)} className="w-full text-xs font-semibold text-[#B8301A] border border-[#F5C0BC] py-2.5 rounded-lg hover:bg-[#FEF2F2] transition-colors">
                Remove Supplier
              </button>
            </div>
          </div>
        </>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Add Supplier</h3>
              <button onClick={() => setShowNew(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Company Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Travis Perkins, Jewson..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Category</label>
                  <select value={form.trade} onChange={e => setForm(f=>({...f,trade:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    <option value="">Select...</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Contact Name</label>
                  <input value={form.contact} onChange={e => setForm(f=>({...f,contact:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Branch address or depot" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="Account number, pricing agreements..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowNew(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
