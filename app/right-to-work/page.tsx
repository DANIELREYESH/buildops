'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  UserCheck, AlertTriangle, XCircle, CheckCircle, Download,
  RefreshCw, Upload, Flag, Clock,
} from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface RtwResult {
  valid: boolean
  confidence: 'high' | 'medium' | 'low'
  document_type_detected: string
  expiry_date_detected: string | null
  name_detected: string | null
  right_to_work_status: 'unlimited' | 'time_limited' | 'cannot_work' | 'manual_check_required'
  time_limited_until: string | null
  restrictions: string[]
  flags: string[]
  recommendation: string
  follow_up_required: boolean
  follow_up_reason: string | null
}

interface RtwCheck extends RtwResult {
  id: string
  worker_name: string
  nationality: string
  document_type: string
  share_code: string | null
  expiry_date: string | null
  checked_by: string | null
  created_at: string
}

interface FormState {
  workerName: string
  nationality: string
  documentType: string
  shareCode: string
  expiryDate: string
  notes: string
  imageFile: File | null
}

const NATIONALITIES = [
  'UK/Irish',
  'EU Settled Status',
  'EU Pre-Settled Status',
  'Skilled Worker Visa',
  'Student Visa',
  'Graduate Visa',
  'Other',
]

const DOCUMENT_TYPES = [
  'UK Passport',
  'BRP Card',
  'EU Passport + Share Code',
  'Passport + Visa Vignette',
  'Other',
]

const STATUS_CONFIG: Record<RtwCheck['right_to_work_status'], {
  label: string; icon: React.ElementType; classes: string; bannerClasses: string
}> = {
  unlimited: {
    label: 'RIGHT TO WORK CONFIRMED — UNLIMITED',
    icon: CheckCircle,
    classes: 'bg-success/10 text-success border-success/30',
    bannerClasses: 'bg-success/10 border-success/30 text-success',
  },
  time_limited: {
    label: 'RIGHT TO WORK CONFIRMED — TIME LIMITED',
    icon: Clock,
    classes: 'bg-warning/10 text-warning border-warning/30',
    bannerClasses: 'bg-warning/10 border-warning/30 text-warning',
  },
  cannot_work: {
    label: 'CANNOT WORK IN UK',
    icon: XCircle,
    classes: 'bg-danger/10 text-danger border-danger/30',
    bannerClasses: 'bg-danger/10 border-danger/30 text-danger',
  },
  manual_check_required: {
    label: 'MANUAL CHECK REQUIRED',
    icon: AlertTriangle,
    classes: 'bg-warning/10 text-warning border-warning/30',
    bannerClasses: 'bg-warning/10 border-warning/30 text-warning',
  },
}

const CONFIDENCE_CLASSES: Record<RtwResult['confidence'], string> = {
  high: 'bg-success/10 text-success border border-success/20',
  medium: 'bg-warning/10 text-warning border border-warning/20',
  low: 'bg-danger/10 text-danger border border-danger/20',
}

const EMPTY_FORM: FormState = {
  workerName: '', nationality: '', documentType: '', shareCode: '',
  expiryDate: '', notes: '', imageFile: null,
}

function inputCls(extra = '') {
  return cn('w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent', extra)
}

export default function RightToWorkPage() {
  const [checks, setChecks] = useState<RtwCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<RtwResult | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: rows }, { data: { user } }] = await Promise.all([
      supabase.from('right_to_work_checks').select('*').order('created_at', { ascending: false }),
      supabase.auth.getUser(),
    ])
    setChecks((rows as RtwCheck[]) || [])
    if (user?.email) setUserEmail(user.email)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleFile = (file: File) => {
    setForm(f => ({ ...f, imageFile: file }))
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!form.workerName || !form.nationality || !form.documentType) {
      toast.error('Worker name, nationality and document type are required')
      return
    }
    setChecking(true)
    setResult(null)
    try {
      let imageBase64: string | null = null
      let imageMediaType: string | null = null

      if (form.imageFile) {
        imageMediaType = form.imageFile.type
        if (!imageMediaType.includes('pdf')) {
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => {
              const dataUrl = e.target?.result as string
              resolve(dataUrl.split(',')[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(form.imageFile!)
          })
        }
      }

      const res = await fetch('/api/right-to-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerName: form.workerName,
          nationality: form.nationality,
          documentType: form.documentType,
          shareCode: form.shareCode || null,
          expiryDate: form.expiryDate || null,
          imageBase64,
          imageMediaType,
          notes: form.notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check failed')
      setResult(data as RtwResult)
      toast.success('Right to Work check complete')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setChecking(false)
    }
  }

  const handleSave = async () => {
    if (!result) return
    setSaving(true)
    try {
      const { error } = await supabase.from('right_to_work_checks').insert({
        worker_name: form.workerName,
        nationality: form.nationality,
        document_type: form.documentType,
        share_code: form.shareCode || null,
        expiry_date: form.expiryDate || null,
        valid: result.valid,
        confidence: result.confidence,
        right_to_work_status: result.right_to_work_status,
        time_limited_until: result.time_limited_until || null,
        restrictions: result.restrictions,
        flags: result.flags,
        recommendation: result.recommendation,
        follow_up_required: result.follow_up_required,
        follow_up_reason: result.follow_up_reason || null,
        checked_by: userEmail || null,
      })
      if (error) throw error
      toast.success('Record saved')
      setResult(null)
      setForm(EMPTY_FORM)
      setImagePreview(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    const headers = ['Worker', 'Nationality', 'Document', 'Status', 'Confidence', 'Valid Until', 'Flags', 'Recommendation', 'Follow-up', 'Checked By', 'Date']
    const rows = checks.map(c => [
      c.worker_name, c.nationality, c.document_type, c.right_to_work_status,
      c.confidence, c.time_limited_until || '', c.flags.join('; '),
      c.recommendation.replace(/,/g, ';'), c.follow_up_required ? 'Yes' : 'No',
      c.checked_by || '', new Date(c.created_at).toLocaleDateString('en-GB'),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `right-to-work-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const stats = {
    total: checks.length,
    valid: checks.filter(c => c.valid).length,
    expired: checks.filter(c => c.right_to_work_status === 'cannot_work').length,
    flagged: checks.filter(c => c.follow_up_required).length,
  }

  const sc = result ? STATUS_CONFIG[result.right_to_work_status] : null

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Right to Work Checker</h1>
            <p className="text-xs text-text-muted mt-0.5">AI-powered UK right to work document verification</p>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
            <Download size={12} /> Export CSV
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Checks', value: stats.total, icon: UserCheck, cls: 'text-accent' },
            { label: 'Valid', value: stats.valid, icon: CheckCircle, cls: 'text-success' },
            { label: 'Cannot Work', value: stats.expired, icon: XCircle, cls: 'text-danger' },
            { label: 'Follow-up Required', value: stats.flagged, icon: Flag, cls: 'text-warning' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} className={s.cls} />
                <span className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="text-2xl font-semibold text-text-primary tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
          {/* Left: Checks table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-text-secondary uppercase tracking-wide">Check History</h2>
              <button onClick={load} className="text-text-muted hover:text-text-primary transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {loading ? (
                <div className="space-y-px p-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
                </div>
              ) : checks.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck size={24} className="text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No checks yet</p>
                  <p className="text-xs text-text-muted mt-1">Use the form to run your first check</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border">
                        {['Worker', 'Nationality', 'Document', 'Status', 'Valid Until', 'Follow-up', 'Checked'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {checks.map(c => {
                        const s = STATUS_CONFIG[c.right_to_work_status]
                        return (
                          <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2.5 text-xs font-medium text-text-primary whitespace-nowrap">{c.worker_name}</td>
                            <td className="px-3 py-2.5 text-xs text-text-muted">{c.nationality}</td>
                            <td className="px-3 py-2.5 text-xs text-text-muted">{c.document_type}</td>
                            <td className="px-3 py-2.5">
                              <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border', s.classes)}>
                                <s.icon size={10} />
                                {c.right_to_work_status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-text-muted tabular-nums">
                              {c.time_limited_until
                                ? new Date(c.time_limited_until).toLocaleDateString('en-GB')
                                : c.right_to_work_status === 'unlimited' ? '—' : 'N/A'}
                            </td>
                            <td className="px-3 py-2.5">
                              {c.follow_up_required && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                                  <Flag size={9} /> Yes
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-text-muted whitespace-nowrap">
                              {new Date(c.created_at).toLocaleDateString('en-GB')}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: Form + Result */}
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text-primary mb-4">New Check</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Worker Name *</label>
                  <input
                    value={form.workerName}
                    onChange={e => setForm(f => ({ ...f, workerName: e.target.value }))}
                    className={inputCls()}
                    placeholder="e.g. James Reid"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Nationality *</label>
                  <select value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} className={inputCls()}>
                    <option value="">Select nationality...</option>
                    {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Document Type *</label>
                  <select value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))} className={inputCls()}>
                    <option value="">Select document...</option>
                    {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {form.documentType === 'EU Passport + Share Code' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Share Code</label>
                    <input
                      value={form.shareCode}
                      onChange={e => setForm(f => ({ ...f, shareCode: e.target.value }))}
                      className={inputCls()}
                      placeholder="e.g. W5T-3KM-G9B"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Document Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className={inputCls()}
                  />
                </div>

                {/* File upload */}
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Document Image</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                  {imagePreview ? (
                    <div className="relative">
                      {form.imageFile?.type.includes('pdf') ? (
                        <div className="border border-border rounded-lg p-3 flex items-center gap-2 text-xs text-text-secondary bg-muted/30">
                          <Upload size={14} className="text-text-muted" />
                          {form.imageFile.name}
                        </div>
                      ) : (
                        <img src={imagePreview} alt="Document preview" className="w-full h-32 object-cover rounded-lg border border-border" />
                      )}
                      <button
                        onClick={() => { setImagePreview(null); setForm(f => ({ ...f, imageFile: null })); if (fileRef.current) fileRef.current.value = '' }}
                        className="absolute top-1.5 right-1.5 bg-background/80 rounded p-0.5 text-text-muted hover:text-danger"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-2 text-text-muted hover:border-accent/50 hover:text-accent transition-colors"
                    >
                      <Upload size={18} />
                      <span className="text-xs">Click to upload document</span>
                      <span className="text-[10px]">JPG, PNG, WebP, PDF</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className={inputCls('resize-none')}
                    placeholder="Any additional context..."
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={checking || !form.workerName || !form.nationality || !form.documentType}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {checking ? (
                    <><RefreshCw size={14} className="animate-spin" /> Analysing document...</>
                  ) : (
                    <><UserCheck size={14} /> Run Right to Work Check</>
                  )}
                </button>
              </div>
            </div>

            {/* Result */}
            {result && sc && (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                {/* Status banner */}
                <div className={cn('flex items-center gap-3 rounded-xl border p-4', sc.bannerClasses)}>
                  <sc.icon size={22} />
                  <div>
                    <div className="text-sm font-bold tracking-wide">{sc.label}</div>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', CONFIDENCE_CLASSES[result.confidence])}>
                      {result.confidence.toUpperCase()} CONFIDENCE
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Detected Name', value: result.name_detected || '—' },
                    { label: 'Document Type', value: result.document_type_detected },
                    { label: 'Expiry Detected', value: result.expiry_date_detected || '—' },
                    { label: 'Valid Until', value: result.time_limited_until || (result.right_to_work_status === 'unlimited' ? 'No limit' : '—') },
                  ].map(d => (
                    <div key={d.label} className="bg-muted/30 rounded-lg p-2.5">
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">{d.label}</div>
                      <div className="font-medium text-text-primary">{d.value}</div>
                    </div>
                  ))}
                </div>

                {/* Restrictions */}
                {result.restrictions.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Restrictions</div>
                    <div className="space-y-1">
                      {result.restrictions.map((r, i) => (
                        <div key={i} className="text-xs text-warning bg-warning/5 border border-warning/20 rounded px-2 py-1">{r}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flags */}
                {result.flags.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Flags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.flags.map((f, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation */}
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Recommendation</div>
                  <p className="text-xs text-text-primary leading-relaxed">{result.recommendation}</p>
                </div>

                {/* Follow-up warning */}
                {result.follow_up_required && (
                  <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-warning">Follow-up Required</div>
                      {result.follow_up_reason && (
                        <p className="text-[11px] text-warning/80 mt-0.5">{result.follow_up_reason}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-success hover:opacity-90 px-4 py-2.5 rounded-lg transition-opacity disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
