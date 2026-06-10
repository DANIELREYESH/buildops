'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { X, Sparkles, Download, Copy, CheckCircle2, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { StatusBadge, statusVariant } from '@/components/StatusBadge'
import { formatDate, formatCurrency } from '@/lib/format'
import type { SubContract, Project } from '@/lib/types'

// SQL to run in Supabase:
// CREATE TABLE IF NOT EXISTS sub_contracts (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   contract_number TEXT,
//   subcontractor_name TEXT,
//   project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
//   trade TEXT,
//   contract_value NUMERIC,
//   start_date DATE,
//   end_date DATE,
//   payment_terms TEXT,
//   retention_percent NUMERIC DEFAULT 0,
//   description_of_works TEXT,
//   generated_contract_text TEXT,
//   status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','signed','expired')),
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE sub_contracts DISABLE ROW LEVEL SECURITY;
// GRANT ALL ON sub_contracts TO anon, authenticated, service_role;



const TRADES = [
  'Electrical', 'Plumbing', 'Scaffolding', 'Tiling', 'Carpentry',
  'Roofing', 'Painting', 'General Labour', 'Other',
]
const PAYMENT_TERMS = ['Weekly', 'Fortnightly', 'Monthly', 'Milestone-based']
const RETENTION_OPTIONS = ['0', '2.5', '5', '10']

function ContractPreviewModal({
  contract,
  onClose,
  onMarkActive,
}: {
  contract: SubContract
  onClose: () => void
  onMarkActive: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(contract.generated_contract_text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 print:hidden" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 bg-surface border border-border rounded-2xl shadow-2xl z-50 flex flex-col print:static print:inset-0 print:rounded-none print:border-none">
        {/* Header */}
        <div className="h-14 border-b border-border px-5 flex items-center gap-3 flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-bold text-sm text-text-primary">{contract.contract_number}</span>
            <StatusBadge label={contract.status} variant={statusVariant(contract.status)} />
            {contract.subcontractor_name && (
              <span className="text-xs text-text-muted truncate">· {contract.subcontractor_name}</span>
            )}
            {contract.contract_value && (
              <span className="text-xs font-mono font-semibold text-text-primary ml-auto">{formatCurrency(contract.contract_value)}</span>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary flex-shrink-0"><X size={16} /></button>
        </div>

        {/* Contract text — stays white/light for print */}
        <div className="flex-1 overflow-y-auto p-8 bg-white print:p-0">
          <pre className="font-mono text-[11px] text-gray-900 whitespace-pre-wrap leading-relaxed">
            {contract.generated_contract_text || 'No contract text available.'}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border p-4 flex gap-3 flex-shrink-0 print:hidden">
          {contract.status === 'draft' && (
            <button
              onClick={onMarkActive}
              className="flex items-center justify-center gap-1.5 flex-1 bg-success text-white text-xs font-semibold py-2.5 rounded-lg hover:opacity-90 transition-colors"
            >
              <CheckCircle2 size={13} /> Mark as Active
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 flex-1 border border-border text-text-secondary text-xs font-semibold py-2.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-1.5 flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Download size={13} /> Download PDF
          </button>
        </div>
      </div>
    </>
  )
}

const INPUT_CLS = 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent'
const LABEL_CLS = 'text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<SubContract[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<SubContract | null>(null)
  const [tableExists, setTableExists] = useState(true)

  const [form, setForm] = useState({
    subcontractor_name: '',
    trade: 'Electrical',
    project_id: '',
    contract_value: '',
    start_date: '',
    end_date: '',
    payment_terms: 'Monthly',
    retention_percent: '5',
    description_of_works: '',
    special_conditions: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: c, error }] = await Promise.all([
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('sub_contracts').select('*').order('created_at', { ascending: false }),
    ])
    setProjects((p as Project[]) || [])
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) setTableExists(false)
      setLoading(false)
      return
    }
    setContracts((c as SubContract[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    if (!form.subcontractor_name || !form.description_of_works) {
      toast.error('Subcontractor name and description of works are required')
      return
    }
    setGenerating(true)
    try {
      const project = projects.find(p => p.id === form.project_id)
      const res = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_name: project?.name,
          contract_value: Number(form.contract_value) || 0,
          retention_percent: Number(form.retention_percent) || 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')
      const newContract = json.contract as SubContract
      setContracts(prev => [newContract, ...prev])
      setPreview(newContract)
      toast.success(`Contract ${newContract.contract_number} generated`)
      setForm({
        subcontractor_name: '', trade: 'Electrical', project_id: '',
        contract_value: '', start_date: '', end_date: '',
        payment_terms: 'Monthly', retention_percent: '5',
        description_of_works: '', special_conditions: '',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate contract')
    } finally {
      setGenerating(false)
    }
  }

  const markActive = async (id: string) => {
    const { error } = await supabase.from('sub_contracts').update({ status: 'active' }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setContracts(prev => prev.map(c => c.id === id ? { ...c, status: 'active' } : c))
    setPreview(prev => prev && prev.id === id ? { ...prev, status: 'active' } : prev)
    toast.success('Contract marked as active')
  }

  if (!tableExists) {
    return (
        <div className="p-6 max-w-2xl">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-warning mb-2">Database setup required</h2>
            <p className="text-xs text-warning/90 mb-3">Run this SQL in Supabase → SQL Editor, then reload.</p>
            <pre className="bg-background rounded-lg p-4 text-[11px] font-mono text-text-secondary overflow-x-auto border border-border whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS sub_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT,
  subcontractor_name TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  trade TEXT,
  contract_value NUMERIC,
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  retention_percent NUMERIC DEFAULT 0,
  description_of_works TEXT,
  generated_contract_text TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sub_contracts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON sub_contracts TO anon, authenticated, service_role;`}</pre>
            <button onClick={() => { setTableExists(true); load() }} className="mt-3 text-xs font-medium bg-accent text-white px-3.5 py-2 rounded-lg hover:bg-accent-hover transition-colors">
              I've created the table — reload
            </button>
          </div>
        </div>
)
  }

  return (
    <>
      <div className="p-6 h-full">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Smart Contract Generator</h1>
          <p className="text-sm text-text-secondary mt-0.5">AI-generated UK Construction Act compliant subcontractor agreements</p>
        </div>

        <div className="flex gap-5 h-full">
          {/* Left 60%: Contract list */}
          <div className="flex-[3] min-w-0">
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">Contracts ({contracts.length})</span>
              </div>

              {loading ? (
                <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg"/>)}</div>
              ) : contracts.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <FileText size={20} className="text-accent" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">No contracts yet</p>
                  <p className="text-sm text-text-secondary mt-0.5">Fill in the form to generate your first AI contract</p>
                </div>
              ) : (
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-muted">
                      {['Contract #', 'Subcontractor', 'Project', 'Trade', 'Value', 'Status', 'Created', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id} onClick={() => setPreview(c)} className="border-t border-border cursor-pointer hover:bg-muted/60 transition-colors transition-colors">
                        <td className="px-3 py-2.5 text-xs font-mono font-semibold text-accent">{c.contract_number}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-text-primary">{c.subcontractor_name}</td>
                        <td className="px-3 py-2.5 text-xs text-text-muted">{projects.find(p => p.id === c.project_id)?.name || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-text-secondary">{c.trade}</td>
                        <td className="px-3 py-2.5 text-xs font-mono text-text-primary">{c.contract_value ? formatCurrency(c.contract_value) : '—'}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={c.status} variant={statusVariant(c.status)} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          {c.status === 'draft' && (
                            <button onClick={() => markActive(c.id)} className="text-[10px] font-medium text-success hover:opacity-80 whitespace-nowrap">
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right 40%: Generate form */}
          <div className="flex-[2] min-w-0">
            <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
                <Sparkles size={13} className="text-accent" />
                <span className="text-xs font-semibold text-text-primary">Generate New Contract</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div>
                  <label className={LABEL_CLS}>Subcontractor Name *</label>
                  <input value={form.subcontractor_name} onChange={e => setForm(f => ({ ...f, subcontractor_name: e.target.value }))}
                    className={INPUT_CLS} placeholder="ABC Electrical Ltd" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Trade / Speciality</label>
                    <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} className={INPUT_CLS}>
                      {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Linked Project</label>
                    <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className={INPUT_CLS}>
                      <option value="">No project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>Contract Value (£)</label>
                  <input type="number" value={form.contract_value} onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))}
                    className={INPUT_CLS} placeholder="15000" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className={INPUT_CLS} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Payment Terms</label>
                    <select value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} className={INPUT_CLS}>
                      {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Retention %</label>
                    <select value={form.retention_percent} onChange={e => setForm(f => ({ ...f, retention_percent: e.target.value }))} className={INPUT_CLS}>
                      {RETENTION_OPTIONS.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLS}>Description of Works *</label>
                  <textarea
                    value={form.description_of_works}
                    onChange={e => setForm(f => ({ ...f, description_of_works: e.target.value }))}
                    rows={4}
                    className={cn(INPUT_CLS, 'resize-none')}
                    placeholder="Full rewire of 3-storey commercial unit including consumer unit upgrade, all first and second fix wiring, lighting circuits, power outlets throughout all floors, EV charging point installation in car park..."
                  />
                  <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                    <Sparkles size={9} className="text-accent" />
                    The more detail you provide, the more accurate the contract scope will be.
                  </p>
                </div>

                <div>
                  <label className={LABEL_CLS}>Special Conditions (optional)</label>
                  <textarea
                    value={form.special_conditions}
                    onChange={e => setForm(f => ({ ...f, special_conditions: e.target.value }))}
                    rows={2}
                    className={cn(INPUT_CLS, 'resize-none')}
                    placeholder="e.g. All works to be completed outside normal business hours. CHAS accreditation required." />
                </div>
              </div>

              <div className="px-4 pb-4 flex-shrink-0">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !form.subcontractor_name || !form.description_of_works}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover active:scale-[0.98] text-white text-xs font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating UK Contract...
                    </>
                  ) : (
                    <><Sparkles size={13} /> Generate Contract</>
                  )}
                </button>
                <p className="text-[10px] text-text-muted text-center mt-2">
                  UK Construction Act 1996 · LDEDCA 2009 compliant
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract preview modal */}
      {preview && (
        <ContractPreviewModal
          contract={preview}
          onClose={() => setPreview(null)}
          onMarkActive={() => markActive(preview.id)}
        />
      )}

      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          .fixed.inset-4 { display: flex !important; position: static !important; inset: 0 !important; height: 100vh !important; }
        }
      `}</style>
    </>
  )
}
