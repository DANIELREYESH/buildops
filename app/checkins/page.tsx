'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Bot, X, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, TrendingUp, Zap } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Checkin, Project, AiCheckin } from '@/lib/types'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// Productivity score circular gauge
function ProductivityGauge({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const fill = (score / 10) * circ
  const color = score >= 8
    ? 'var(--color-success)'
    : score >= 5
      ? 'var(--color-warning)'
      : 'var(--color-danger)'
  const textCls = score >= 8 ? 'text-success' : score >= 5 ? 'text-warning' : 'text-danger'
  return (
    <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[10px] font-bold ${textCls}`}>{score}</span>
    </div>
  )
}

function AiAnalysisBlock({ analysis }: { analysis: AiCheckin }) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setDone(prev => {
    const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next
  })
  const safe = (arr: unknown): string[] => Array.isArray(arr) ? arr.map(String) : []

  const risks = safe(analysis.risks)
  const safetyFlags = safe(analysis.safety_flags)
  const actionItems = safe(analysis.action_items)
  const patterns = safe(analysis.patterns)
  const materials = safe(analysis.materials_mentioned)

  return (
    <div className="space-y-2.5">
      {/* Urgent banner */}
      {analysis.urgent && (
        <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          <Zap size={12} className="text-danger flex-shrink-0" />
          <span className="text-[11px] font-bold text-danger uppercase tracking-wide">URGENT — Immediate Action Required</span>
        </div>
      )}

      <div className="bg-accent/[0.06] border border-accent/15 rounded-lg px-3.5 py-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-accent" />
          <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">AI Analysis</span>
          {analysis.sentiment && (
            <span className={cn(
              'flex items-center gap-1 ml-auto text-[10px] font-medium capitalize px-2 py-0.5 rounded-full',
              analysis.sentiment === 'positive' ? 'bg-success/10 text-success' :
              analysis.sentiment === 'negative' ? 'bg-danger/10 text-danger' :
              'bg-muted text-text-muted'
            )}>
              {analysis.sentiment}
            </span>
          )}
        </div>

        {analysis.summary && <p className="text-xs text-text-secondary leading-relaxed">{analysis.summary}</p>}

        {/* Patterns banner */}
        {patterns.length > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={10} className="text-warning" />
              <span className="text-[10px] font-bold text-warning uppercase tracking-wide">Recurring Issues Detected</span>
            </div>
            <ul className="space-y-0.5">
              {patterns.map((p, i) => (
                <li key={i} className="text-[11px] text-warning/90 flex items-start gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-warning flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Predicted delay */}
        {(analysis.predicted_delay_days || 0) > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warning">
            <AlertTriangle size={11} />
            +{analysis.predicted_delay_days} day{analysis.predicted_delay_days !== 1 ? 's' : ''} predicted delay
          </div>
        )}

        {/* Safety flags */}
        {safetyFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {safetyFlags.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-danger/10 text-danger border border-danger/20">
                <ShieldAlert size={9} /> {s}
              </span>
            ))}
          </div>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {risks.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/10 text-warning border border-warning/20">
                <AlertTriangle size={9} /> {r}
              </span>
            ))}
          </div>
        )}

        {/* Action items */}
        {actionItems.length > 0 && (
          <div className="space-y-1 pt-0.5">
            {actionItems.map((a, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer group">
                <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} className="mt-0.5 accent-accent" />
                <span className={cn('text-xs text-text-secondary group-hover:text-text-primary transition-colors', done.has(i) && 'line-through text-text-muted')}>{a}</span>
              </label>
            ))}
          </div>
        )}

        {/* Materials */}
        {materials.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {materials.map((m, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-text-muted">{m}</span>
            ))}
          </div>
        )}

        {/* Weather impact */}
        {analysis.weather_impact && (
          <p className="text-[11px] text-text-muted italic">{analysis.weather_impact}</p>
        )}
      </div>
    </div>
  )
}

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [analyses, setAnalyses] = useState<AiCheckin[]>([])
  const [analysesByCheckin, setAnalysesByCheckin] = useState<Record<string, AiCheckin>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [filterProject, setFilterProject] = useState<string>('all')

  const [form, setForm] = useState({ project_id: '', worker_name: '', worker_phone: '', message: '' })

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('ai_checkins').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    setCheckins((c as Checkin[]) || [])
    setProjects((p as Project[]) || [])
    const allAnalyses = (a as AiCheckin[]) || []
    setAnalyses(allAnalyses)
    const map: Record<string, AiCheckin> = {}
    allAnalyses.forEach(rec => { if (rec.checkin_id && !map[rec.checkin_id]) map[rec.checkin_id] = rec })
    setAnalysesByCheckin(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.worker_name || !form.message) return
    setSaving(true)
    const { data, error } = await supabase.from('checkins').insert({
      project_id: form.project_id || null,
      worker_name: form.worker_name,
      worker_phone: form.worker_phone || null,
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
        const record = json.record as AiCheckin
        setAnalysesByCheckin(prev => ({ ...prev, [checkin.id]: record }))
        setAnalyses(prev => [record, ...prev])

        if ((json.analysis?.risks?.length || 0) > 0 || (json.analysis?.safety_flags?.length || 0) > 0) {
          await supabase.from('checkins').update({
            status: 'issue', issue_flagged: true,
            issue_description: json.analysis.risks[0] || json.analysis.safety_flags[0],
          }).eq('id', checkin.id)
          setCheckins(prev => prev.map(c => c.id === checkin.id
            ? { ...c, status: 'issue', issue_flagged: true, issue_description: json.analysis.risks[0] || json.analysis.safety_flags[0] }
            : c))
        }
        toast.success('AI analysis complete')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'AI analysis failed')
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || 'Unknown project'

  // Stats
  const filteredAnalyses = useMemo(() =>
    filterProject === 'all' ? analyses : analyses.filter(a => a.project_id === filterProject),
    [analyses, filterProject]
  )

  const filteredCheckins = useMemo(() =>
    filterProject === 'all' ? checkins : checkins.filter(c => c.project_id === filterProject),
    [checkins, filterProject]
  )

  const avgProductivity = useMemo(() => {
    const scores = filteredAnalyses.filter(a => a.productivity_score !== null).map(a => a.productivity_score as number)
    return scores.length ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10 : null
  }, [filteredAnalyses])

  const safetyFlagCount = useMemo(() =>
    filteredAnalyses.reduce((s, a) => s + (Array.isArray(a.safety_flags) ? a.safety_flags.length : 0), 0),
    [filteredAnalyses]
  )

  const urgentCount = useMemo(() =>
    filteredAnalyses.filter(a => a.urgent).length,
    [filteredAnalyses]
  )

  const totalDelayDays = useMemo(() =>
    filteredAnalyses.reduce((s, a) => s + (a.predicted_delay_days || 0), 0),
    [filteredAnalyses]
  )

  // Most common risks
  const topRisks = useMemo(() => {
    const freq: Record<string, number> = {}
    filteredAnalyses.forEach(a => {
      ;(Array.isArray(a.risks) ? a.risks : []).forEach(r => { freq[r] = (freq[r] || 0) + 1 })
    })
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [filteredAnalyses])

  // Sparkline data
  const sparkData = useMemo(() =>
    filteredAnalyses
      .filter(a => a.productivity_score !== null)
      .slice(0, 15)
      .reverse()
      .map((a, i) => ({ i, score: a.productivity_score as number })),
    [filteredAnalyses]
  )

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">AI Site Intelligence</h1>
            <p className="text-xs text-text-muted mt-1">AI-powered analysis of daily site check-ins with pattern detection</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors"
            >
              + Submit Check-in
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Check-ins', value: filteredCheckins.length.toString(), sub: 'all time' },
            {
              label: 'Avg Productivity',
              value: avgProductivity !== null ? `${avgProductivity}/10` : '—',
              sub: avgProductivity !== null
                ? avgProductivity >= 8 ? 'High' : avgProductivity >= 5 ? 'Moderate' : 'Low'
                : 'no data',
              tone: avgProductivity !== null
                ? avgProductivity >= 8 ? 'success' : avgProductivity >= 5 ? 'warning' : 'danger'
                : undefined,
            },
            {
              label: 'Safety Flags',
              value: safetyFlagCount.toString(),
              sub: 'active issues',
              tone: safetyFlagCount > 0 ? 'danger' : undefined,
            },
            {
              label: 'Urgent Items',
              value: urgentCount.toString(),
              sub: 'need action',
              tone: urgentCount > 0 ? 'danger' : undefined,
            },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">{s.label}</div>
              <div className={cn(
                'text-xl font-bold',
                s.tone === 'success' ? 'text-success' : s.tone === 'warning' ? 'text-warning' : s.tone === 'danger' ? 'text-danger' : 'text-text-primary'
              )}>{s.value}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{s.sub}</div>
            </div>
          ))}
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
            <button
              onClick={async () => {
                await supabase.from('checkins').update({ status: 'received', issue_flagged: false }).eq('id', c.id)
                setCheckins(prev => prev.map(x => x.id === c.id ? { ...x, status: 'received', issue_flagged: false } : x))
                toast.success('Issue resolved')
              }}
              className="text-[10px] font-medium text-danger border border-danger/30 px-2.5 py-1 rounded-lg hover:bg-danger/10 transition-colors flex-shrink-0"
            >
              Resolve
            </button>
          </div>
        ))}

        {/* Main layout: 2/3 cards + 1/3 intelligence panel */}
        <div className="grid grid-cols-3 gap-5">
          {/* Card list */}
          <div className="col-span-2 space-y-4">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-xl" />)
            ) : filteredCheckins.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Bot size={20} className="text-accent" />
                </div>
                <p className="text-sm font-medium text-text-primary">No check-ins yet</p>
                <p className="text-xs text-text-muted mt-1">Workers submit daily reports from the mobile app.</p>
                <button onClick={() => setShowModal(true)} className="mt-4 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-2 rounded-lg transition-colors">
                  + Submit Check-in
                </button>
              </div>
            ) : filteredCheckins.map(c => {
              const analysis = analysesByCheckin[c.id]
              return (
                <div key={c.id} className={cn(
                  'bg-surface border rounded-xl p-4 transition-all',
                  analysis?.urgent ? 'border-danger/40' : 'border-border'
                )}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {analysis?.productivity_score != null
                        ? <ProductivityGauge score={analysis.productivity_score} />
                        : <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-accent">{c.worker_name.charAt(0)}</span>
                          </div>
                      }
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text-primary">{c.worker_name}</div>
                        <div className="text-[11px] text-text-muted">{projName(c.project_id)}</div>
                        <div className="text-[10px] text-text-muted">{fmtDate(c.created_at)} · {fmtTime(c.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {analysis?.predicted_delay_days ? (
                        <span className="text-[10px] font-semibold text-warning">+{analysis.predicted_delay_days}d delay</span>
                      ) : null}
                      <span className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
                        c.status === 'received' ? 'bg-success/10 text-success' :
                        c.status === 'issue' ? 'bg-danger/10 text-danger' :
                        c.status === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-text-muted'
                      )}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  {/* Worker message */}
                  <div className="bg-muted border border-border rounded-lg px-3 py-2 text-xs text-text-secondary mb-3">
                    {c.message}
                  </div>

                  {/* AI analysis */}
                  {analysis ? (
                    <AiAnalysisBlock analysis={analysis} />
                  ) : analyzing ? (
                    <div className="skeleton h-16 rounded-lg" />
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Intelligence Summary panel */}
          <div className="col-span-1">
            <div className="bg-surface border border-border rounded-xl overflow-hidden sticky top-6">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Sparkles size={13} className="text-accent" />
                <span className="text-xs font-semibold text-text-primary">Intelligence Summary</span>
                {filterProject !== 'all' && (
                  <span className="ml-auto text-[10px] text-text-muted truncate max-w-[100px]">
                    {projects.find(p => p.id === filterProject)?.name}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-4">
                {/* Aggregated stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Analyses', value: filteredAnalyses.length },
                    { label: 'Urgent', value: urgentCount, tone: urgentCount > 0 ? 'danger' : null },
                    { label: 'Delay Days', value: totalDelayDays, tone: totalDelayDays > 0 ? 'warning' : null },
                    { label: 'Safety Issues', value: safetyFlagCount, tone: safetyFlagCount > 0 ? 'danger' : null },
                  ].map(s => (
                    <div key={s.label} className="bg-background border border-border rounded-lg p-2.5">
                      <div className="text-[9px] uppercase tracking-wide text-text-muted font-semibold">{s.label}</div>
                      <div className={cn(
                        'text-lg font-bold',
                        s.tone === 'danger' ? 'text-danger' : s.tone === 'warning' ? 'text-warning' : 'text-text-primary'
                      )}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Productivity sparkline */}
                {sparkData.length > 1 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-2">Productivity Trend</div>
                    <div className="bg-background border border-border rounded-lg p-2">
                      <ResponsiveContainer width="100%" height={70}>
                        <LineChart data={sparkData}>
                          <YAxis domain={[0, 10]} hide />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                            formatter={(v: unknown) => [`${v}/10`, 'Productivity']}
                            labelFormatter={() => ''}
                          />
                          <Line
                            type="monotone" dataKey="score"
                            stroke="var(--color-accent)" strokeWidth={2}
                            dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-text-muted">Oldest</span>
                        <span className="text-[9px] text-text-muted">Latest</span>
                      </div>
                    </div>
                    {avgProductivity !== null && (
                      <div className="mt-2 text-center">
                        <span className={cn(
                          'text-xs font-bold',
                          avgProductivity >= 8 ? 'text-success' : avgProductivity >= 5 ? 'text-warning' : 'text-danger'
                        )}>
                          {avgProductivity}/10
                        </span>
                        <span className="text-[10px] text-text-muted ml-1">avg</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Most common risks */}
                {topRisks.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-2">Most Common Risks</div>
                    <div className="space-y-1.5">
                      {topRisks.map(([risk, count]) => (
                        <div key={risk} className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-secondary truncate flex-1">{risk}</span>
                          <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full flex-shrink-0">×{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total delay */}
                {totalDelayDays > 0 && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wide text-warning font-semibold mb-1">Cumulative Delay Risk</div>
                    <div className="text-2xl font-bold text-warning">+{totalDelayDays}</div>
                    <div className="text-[10px] text-warning/80">total predicted delay days</div>
                  </div>
                )}

                {filteredAnalyses.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">Submit check-ins to see intelligence data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit modal */}
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
                  <Sparkles size={10} className="text-accent" />
                  AI will analyse for risks, patterns, productivity and safety flags.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-border text-text-secondary text-xs font-medium py-2.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.worker_name || !form.message}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
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
