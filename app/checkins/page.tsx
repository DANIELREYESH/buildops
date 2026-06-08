'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Bot, X, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Checkin, Project, AiCheckin } from '@/lib/types'

const STATUS_STYLES: Record<Checkin['status'], string> = {
  received: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  issue: 'bg-danger/10 text-danger',
  no_response: 'bg-muted text-text-muted',
}
const STATUS_LABELS: Record<Checkin['status'], string> = {
  received: 'Received', pending: 'Pending', issue: 'Issue', no_response: 'No Response',
}
const SENTIMENT_DOT: Record<string, string> = {
  positive: 'bg-success', neutral: 'bg-text-muted', negative: 'bg-danger',
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

function AiAnalysisBlock({ analysis }: { analysis: AiCheckin }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setDone(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  return (
    <div className="bg-accent/[0.06] border border-accent/15 rounded-lg px-3.5 py-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles size={11} className="text-accent" />
        <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">AI Analysis</span>
        {analysis.sentiment && (
          <span className="flex items-center gap-1 ml-auto text-[10px] text-text-muted capitalize">
            <span className={cn('w-1.5 h-1.5 rounded-full', SENTIMENT_DOT[analysis.sentiment])} />
            {analysis.sentiment}
          </span>
        )}
      </div>

      {analysis.summary && <p className="text-xs text-text-secondary leading-relaxed">{analysis.summary}</p>}

      {analysis.risks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.risks.map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning">
              <AlertTriangle size={9} /> {r}
            </span>
          ))}
        </div>
      )}

      {analysis.safety_flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.safety_flags.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger">
              <ShieldAlert size={9} /> {s}
            </span>
          ))}
        </div>
      )}

      {analysis.action_items.length > 0 && (
        <div className="space-y-1 pt-1">
          {analysis.action_items.map((a, i) => (
            <label key={i} className="flex items-start gap-2 cursor-pointer group">
              <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} className="mt-0.5 accent-accent" />
              <span className={cn('text-xs text-text-secondary group-hover:text-text-primary transition-colors', done.has(i) && 'line-through text-text-muted')}>{a}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [analyses, setAnalyses] = useState<Record<string, AiCheckin>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const [form, setForm] = useState({ project_id: '', worker_name: '', worker_phone: '', message: '' })

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
      supabase.from('ai_checkins').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setCheckins((c as Checkin[]) || [])
    setProjects((p as Project[]) || [])
    const map: Record<string, AiCheckin> = {}
    ;((a as AiCheckin[]) || []).forEach(rec => { if (rec.checkin_id && !map[rec.checkin_id]) map[rec.checkin_id] = rec })
    setAnalyses(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.worker_name || !form.message) return
    setSaving(true)
    const { data, error } = await supabase.from('checkins').insert({
      project_id: form.project_id || null,
      worker_name: form.worker_name, worker_phone: form.worker_phone || null,
      message: form.message,
      status: 'received',
      checkin_date: today,
    }).select()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    const checkin = data?.[0] as Checkin
    if (checkin) setCheckins(prev => [checkin, ...prev])
    setShowModal(false)
    setForm({ project_id: '', worker_name: '', worker_phone: '', message: '' })
    toast.success('Check-in submitted')

    if (checkin) {
      setAnalyzing(true)
      try {
        const res = await fetch('/api/ai-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkin_id: checkin.id, project_id: checkin.project_id,
            worker_name: checkin.worker_name, message: checkin.message,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'AI analysis failed')
        setAnalyses(prev => ({ ...prev, [checkin.id]: json.record as AiCheckin }))

        if ((json.analysis?.risks?.length || 0) > 0 || (json.analysis?.safety_flags?.length || 0) > 0) {
          await supabase.from('checkins').update({ status: 'issue', issue_flagged: true, issue_description: json.analysis.risks[0] || json.analysis.safety_flags[0] }).eq('id', checkin.id)
          setCheckins(prev => prev.map(c => c.id === checkin.id ? { ...c, status: 'issue', issue_flagged: true, issue_description: json.analysis.risks[0] || json.analysis.safety_flags[0] } : c))
        }
        toast.success('AI analysis complete')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'AI analysis failed')
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const updateStatus = async (id: string, status: Checkin['status']) => {
    const { error } = await supabase.from('checkins').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setCheckins(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    toast.success('Status updated')
  }

  const todayCheckins = useMemo(() => checkins.filter(c => c.checkin_date === today), [checkins, today])
  const issueCount = todayCheckins.filter(c => c.issue_flagged).length
  const autoLogged = todayCheckins.reduce((s, c) => s + (c.cost_extracted || 0), 0)
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || 'Unknown project'

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">AI Check-ins</h1>
            <p className="text-xs text-text-muted mt-1">
              {todayCheckins.length} received today · {issueCount} issue{issueCount !== 1 ? 's' : ''} flagged · {fmt(autoLogged)} auto-logged
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors">
            + Submit Check-in
          </button>
        </div>

        {/* Issue alerts */}
        {checkins.filter(c => c.issue_flagged && c.status === 'issue').slice(0, 2).map(c => (
          <div key={c.id} className="mb-3 bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={14} className="text-danger flex-shrink-0" />
              <p className="text-xs text-danger">
                <span className="font-semibold">{c.worker_name}</span> on {projName(c.project_id)}: {c.issue_description}
              </p>
            </div>
            <button onClick={() => updateStatus(c.id, 'received')} className="text-[10px] font-medium text-danger border border-danger/30 px-2.5 py-1 rounded-lg hover:bg-danger/10 transition-colors flex-shrink-0">
              Resolve
            </button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-1 space-y-4">
            {loading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-xl" />)}</div>
            ) : checkins.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Bot size={20} className="text-accent" />
                </div>
                <p className="text-sm font-medium text-text-primary">No check-ins yet</p>
                <p className="text-xs text-text-muted mt-1">Workers submit daily reports via the mobile app.</p>
                <button onClick={() => setShowModal(true)} className="mt-4 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-2 rounded-lg transition-colors">+ Submit Check-in</button>
              </div>
            ) : checkins.map(c => (
              <div key={c.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-medium text-text-primary">{c.worker_name}</div>
                    <div className="text-[11px] text-text-muted">{projName(c.project_id)} · {fmtTime(c.created_at)}</div>
                  </div>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', STATUS_STYLES[c.status])}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={11} className="text-accent" />
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none px-3 py-2 text-xs text-text-secondary max-w-[80%]">
                      End of day check-in: How did the site go today? Any issues, costs or progress to report?
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-accent rounded-lg rounded-tr-none px-3 py-2 text-xs text-white max-w-[80%]">
                      {c.message}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-accent">{c.worker_name.charAt(0)}</span>
                    </div>
                  </div>
                </div>

                {analyses[c.id] ? (
                  <AiAnalysisBlock analysis={analyses[c.id]} />
                ) : analyzing ? (
                  <div className="skeleton h-16 rounded-lg" />
                ) : null}

                {c.status === 'pending' && (
                  <button onClick={() => updateStatus(c.id, 'no_response')} className="mt-2 w-full text-xs font-medium text-warning bg-warning/10 py-1.5 rounded-lg hover:bg-warning/15 transition-colors">
                    Send Reminder
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="col-span-1">
            <div className="bg-surface border border-border rounded-xl overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-medium text-text-primary">Today&apos;s Timeline</span>
              </div>
              <div className="divide-y divide-border max-h-[560px] overflow-y-auto">
                {todayCheckins.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-10">No check-ins today.</p>
                ) : todayCheckins.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                    <span className={cn('w-2 h-2 rounded-full mt-1 flex-shrink-0',
                      c.status === 'received' ? 'bg-success' : c.status === 'issue' ? 'bg-danger' : c.status === 'pending' ? 'bg-warning' : 'bg-text-muted')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-text-primary">{c.worker_name}</span>
                        <span className="text-[10px] text-text-muted">{fmtTime(c.created_at)}</span>
                      </div>
                      <span className="text-[11px] text-text-muted">{projName(c.project_id)}</span>
                      {c.issue_flagged && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-danger/10 text-danger ml-2">Issue</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-text-primary">Submit Check-in</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Worker Name *</label>
                  <input value={form.worker_name} onChange={e => setForm(f => ({ ...f, worker_name: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" placeholder="James Reid" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Project</label>
                  <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-medium block mb-1.5">Worker Message *</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
                  placeholder="e.g. Done first fix electrics ground floor, 65% done. Spent £340 on cable at Travis. No issues." />
                <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1.5">
                  <Sparkles size={10} className="text-accent" /> Claude will analyse this message for risks, action items and safety concerns after submission.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.worker_name || !form.message} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                  {saving ? 'Submitting...' : <><CheckCircle2 size={13} /> Submit Check-in</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
