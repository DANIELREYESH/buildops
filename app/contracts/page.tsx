'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Contract, Project } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const TYPE_LABELS: Record<Contract['type'], string> = { service: 'Service', sub: 'Sub-contract', variation: 'Variation', quote: 'Quote' }
const TYPE_COLORS: Record<Contract['type'], string> = {
  service: 'bg-[#EBF0FD] text-[#1A3FAA]', sub: 'bg-[#E8F5EE] text-[#1A6B45]',
  variation: 'bg-[#FEF6E4] text-[#96670A]', quote: 'bg-gray-100 text-[#9B978F]',
}
const STATUS_COLORS: Record<Contract['status'], string> = {
  draft: 'bg-gray-100 text-[#9B978F]',
  awaiting_client: 'bg-[#FEF6E4] text-[#96670A]',
  awaiting_company: 'bg-[#FEF6E4] text-[#96670A]',
  active: 'bg-[#E8F5EE] text-[#1A6B45]',
  expired: 'bg-[#FCEAE8] text-[#B8301A]',
}
const STATUS_LABELS: Record<Contract['status'], string> = {
  draft: 'Draft', awaiting_client: 'Awaiting Client', awaiting_company: 'Awaiting Us', active: 'Active', expired: 'Expired',
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

function generateBody(project: Project | null, contract: Partial<Contract>, userEmail: string): string {
  const pName = project?.name || '[Project Name]'
  const cName = project?.client_name || '[Client Name]'
  const addr = project?.address || '[Site Address]'
  const budget = project?.budget ? fmt(project.budget) : '[Contract Value]'
  const deadline = project?.deadline || '[Completion Date]'
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return `1. PARTIES
This agreement is entered into on ${today} between the Contractor ("BuildOps Contractor") and the Client ("${cName}").

2. SCOPE OF WORKS
The Contractor agrees to carry out the following works at ${addr}: ${project?.description || pName}. Works shall be carried out in a good and workmanlike manner in accordance with the current edition of the Building Regulations and all relevant British Standards.

3. CONTRACT VALUE & PAYMENT SCHEDULE
The Contract Sum is ${budget}, exclusive of VAT at the current rate. Payment shall be made in three equal instalments: 30% on commencement, 40% on practical completion of first fix, and 30% on practical completion. Invoices are due within 14 days of issue. Late payment shall attract interest at 8% per annum above the Bank of England base rate under the Late Payment of Commercial Debts (Interest) Act 1998.

4. PROGRAMME & MILESTONES
Works are to commence within 5 working days of contract execution and reach practical completion by ${deadline}. Any extension of time shall only be granted in writing by both parties.

5. VARIATIONS
No variations to the agreed scope of works shall be carried out without prior written authorisation from the Client. All variations shall be priced and agreed in writing before work commences. Verbal instructions shall not constitute a variation order.

6. DEFECTS LIABILITY PERIOD
A Defects Liability Period of 12 months shall commence from the date of practical completion. The Contractor shall remedy any defects arising from faulty workmanship or materials at no additional cost to the Client.

7. TERMINATION
Either party may terminate this agreement with 14 days' written notice if the other party is in material breach of its obligations. In the event of insolvency, termination shall be immediate.

8. GOVERNING LAW
This agreement is governed by and construed in accordance with the law of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales. The parties agree to attempt mediation before commencing any legal proceedings.`
}

export default function ContractsPage() {
  const { toast } = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewContract, setViewContract] = useState<Contract | null>(null)
  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signingClient, setSigningClient] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const [form, setForm] = useState({ project_id: '', type: 'service' as Contract['type'] })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: { user } }] = await Promise.all([
      supabase.from('contracts').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setContracts((c as Contract[]) || [])
    setProjects((p as Project[]) || [])
    if (user?.email) setUserEmail(user.email)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openView = (c: Contract) => {
    setViewContract(c)
    setViewProject(projects.find(p => p.id === c.project_id) || null)
  }

  const handleGenerate = async () => {
    if (!form.project_id) return
    setSaving(true)
    const proj = projects.find(p => p.id === form.project_id)
    const ref = `BO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    const { data, error } = await supabase.from('contracts').insert({
      project_id: form.project_id,
      contract_ref: ref,
      type: form.type,
      value: proj?.budget || null,
      company_signed_at: new Date().toISOString(),
      company_signed_by: userEmail,
      status: 'awaiting_client',
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setContracts(prev => [data[0] as Contract, ...prev])
    setShowModal(false)
    setForm({ project_id: '', type: 'service' })
    toast('Contract generated')
  }

  const downloadContract = () => {
    if (!viewContract) return
    const body = generateBody(viewProject, viewContract, userEmail)
    const signBlock = [
      '\n\nSIGNATURES',
      '─'.repeat(60),
      `Contractor: ${viewContract.company_signed_by || '(unsigned)'}  |  Date: ${viewContract.company_signed_at ? new Date(viewContract.company_signed_at).toLocaleDateString('en-GB') : '—'}`,
      `Client:     ${viewContract.client_signed_by || '(unsigned)'}  |  Date: ${viewContract.client_signed_at ? new Date(viewContract.client_signed_at).toLocaleDateString('en-GB') : '—'}`,
    ].join('\n')
    const content = `BuildOps Services Contract\nReference: ${viewContract.contract_ref}\n${'─'.repeat(60)}\n\n${body}${signBlock}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${viewContract.contract_ref}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast('Contract downloaded')
  }

  const handleClientSign = async () => {
    if (!viewContract) return
    setSigningClient(true)
    const clientEmail = viewProject?.client_email || prompt('Enter client email to sign:') || 'client@unknown.com'
    setTimeout(async () => {
      const now = new Date().toISOString()
      const { error } = await supabase.from('contracts').update({
        client_signed_at: now, client_signed_by: clientEmail, status: 'active',
      }).eq('id', viewContract.id)
      setSigningClient(false)
      if (error) { toast(error.message, 'error'); return }
      const updated = { ...viewContract, client_signed_at: now, client_signed_by: clientEmail, status: 'active' as Contract['status'] }
      setContracts(prev => prev.map(c => c.id === viewContract.id ? updated : c))
      setViewContract(updated)
      toast('Contract fully executed')
    }, 1200)
  }

  const filtered = contracts.filter(c => filterStatus === 'all' || c.status === filterStatus)
  const awaiting = contracts.filter(c => c.status === 'awaiting_client' || c.status === 'awaiting_company').length
  const totalValue = contracts.filter(c => c.status === 'active').reduce((s, c) => s + (c.value || 0), 0)
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || '—'

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Contracts</span>
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Generate Contract
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Contracts</h1>
          <p className="text-xs text-[#9B978F] mt-1">
            {contracts.length} contracts · {fmt(totalValue)} active value · {awaiting} awaiting signature
          </p>
        </div>

        <div className="flex items-center gap-0.5 bg-[#F7F6F2] p-0.5 rounded-lg mb-4 w-fit">
          {['all', 'draft', 'awaiting_client', 'active', 'expired'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-[#9B978F] hover:text-gray-700'}`}>
              {s === 'all' ? 'All' : s === 'awaiting_client' ? 'Awaiting' : STATUS_LABELS[s as Contract['status']]}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2]">
                {['Ref', 'Type', 'Project', 'Value', 'Company Sig', 'Client Sig', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><div className="animate-pulse space-y-2 px-4">{[1,2,3].map(i=><div key={i} className="h-8 bg-gray-100 rounded"/>)}</div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center">
                  <p className="text-sm text-gray-400 font-semibold">No contracts yet</p>
                  <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg hover:bg-[#BE4A16]">+ Generate Contract</button>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onClick={() => openView(c)} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 text-xs font-mono font-bold text-gray-900">{c.contract_ref}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[c.type]}`}>{TYPE_LABELS[c.type]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{projName(c.project_id)}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{c.value ? fmt(c.value) : '—'}</td>
                  <td className="px-4 py-2.5">
                    {c.company_signed_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1A6B45]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        Signed
                      </span>
                    ) : <span className="text-[10px] text-[#9B978F]">Pending</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.client_signed_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1A6B45]">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        Signed
                      </span>
                    ) : <span className="text-[10px] text-[#9B978F]">Pending</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract viewer */}
      {viewContract && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setViewContract(null)} />
          <div className="fixed inset-4 bg-white rounded-2xl z-50 flex flex-col shadow-2xl overflow-hidden">
            <div className="h-12 border-b border-[#E5E2DB] px-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-gray-900">{viewContract.contract_ref}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_COLORS[viewContract.type]}`}>{TYPE_LABELS[viewContract.type]}</span>
                {viewContract.status === 'active' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1A6B45] bg-[#E8F5EE] px-3 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    Fully Executed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadContract} className="text-xs font-semibold text-gray-500 border border-[#E5E2DB] px-3 py-1.5 rounded-lg hover:bg-gray-50">Download</button>
                <button onClick={() => setViewContract(null)} className="text-[#9B978F] hover:text-gray-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <div className="text-center mb-8">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">BuildOps Services Contract</h2>
                <p className="text-xs text-[#9B978F] mt-1">Reference: {viewContract.contract_ref}</p>
              </div>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-700 bg-[#F7F6F2] rounded-lg p-6">
                  {generateBody(viewProject, viewContract, userEmail)}
                </pre>
              </div>
              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 mt-8">
                <div className="border border-[#DDD9D0] rounded-[10px] p-4">
                  <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-3">Contractor Signature</div>
                  {viewContract.company_signed_at ? (
                    <div>
                      <div className="text-sm font-bold italic text-gray-900 font-serif mb-1">{viewContract.company_signed_by}</div>
                      <div className="text-[10px] text-[#9B978F]">Signed {new Date(viewContract.company_signed_at).toLocaleDateString('en-GB')}</div>
                    </div>
                  ) : (
                    <div className="h-12 border-b-2 border-dashed border-[#DDD9D0] flex items-end pb-1">
                      <span className="text-xs text-[#9B978F]">Awaiting signature</span>
                    </div>
                  )}
                </div>
                <div className="border border-[#DDD9D0] rounded-[10px] p-4">
                  <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-3">Client Signature</div>
                  {viewContract.client_signed_at ? (
                    <div>
                      <div className="text-sm font-bold italic text-gray-900 font-serif mb-1">{viewContract.client_signed_by}</div>
                      <div className="text-[10px] text-[#9B978F]">Signed {new Date(viewContract.client_signed_at).toLocaleDateString('en-GB')}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="h-12 border-b-2 border-dashed border-[#DDD9D0] flex items-end pb-1 mb-2">
                        <span className="text-xs text-[#9B978F]">Click to sign</span>
                      </div>
                      <button onClick={handleClientSign} disabled={signingClient} className="w-full text-xs font-semibold text-white bg-[#D4561A] py-2 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                        {signingClient ? 'Signing...' : 'Client: Sign Here'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Generate Contract</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project *</label>
                <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">Select project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Contract Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['service', 'sub', 'variation', 'quote'] as Contract['type'][]).map(t => (
                    <button key={t} onClick={() => setForm(f => ({...f, type: t}))} className={`py-2 rounded-lg text-xs font-semibold border transition-all ${form.type === t ? 'border-[#D4561A] bg-[#FEF6E4] text-[#D4561A]' : 'border-[#E5E2DB] text-[#9B978F] hover:border-gray-300'}`}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-[#F7F6F2] rounded-lg p-3 text-xs text-[#9B978F]">
                Contract will be auto-generated from project data, pre-signed by you, and sent to the client for counter-signature.
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleGenerate} disabled={saving || !form.project_id} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Generating...' : 'Generate & Sign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
