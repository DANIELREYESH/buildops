'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project, AiForecast } from '@/lib/types'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

const HEALTH_STYLES: Record<string, { bg: string; text: string; dot: string; border: string; label: string }> = {
  on_track: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success', border: 'border-success/20', label: 'On Track' },
  at_risk: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning', border: 'border-warning/20', label: 'At Risk' },
  critical: { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger', border: 'border-danger/20', label: 'Critical' },
}
const healthStyle = (h: string | null) => HEALTH_STYLES[h || ''] || HEALTH_STYLES.at_risk

export default function ForecastPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [forecast, setForecast] = useState<AiForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').in('status', ['active', 'delayed']).order('name')
    setProjects((data as Project[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const generate = useCallback(async (force: boolean) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Forecast generation failed')
      setForecast(json.forecast as AiForecast)
      toast.success(json.cached ? 'Loaded cached forecast' : 'Forecast generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Forecast generation failed')
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => { if (!loading && projects.length > 0) generate(false) }, [loading, projects.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const overall = healthStyle(forecast?.overall_health || null)
  const projName = (id: string) => projects.find(p => p.id === id)?.name || id

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              AI Forecast
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent"><Sparkles size={10} /> Claude</span>
            </h1>
            <p className="text-xs text-text-muted mt-1">Portfolio health, margin and completion predictions powered by Claude.</p>
          </div>
          <button onClick={() => generate(true)} disabled={generating || projects.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={generating ? 'animate-spin' : ''} /> {generating ? 'Analysing...' : 'Regenerate'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        ) : projects.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp size={20} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-text-primary">No active projects to forecast</p>
            <p className="text-xs text-text-muted mt-1">Create projects and log costs to see AI predictions.</p>
          </div>
        ) : (
          <>
            {/* Health banner */}
            {forecast ? (
              <div className={cn('rounded-xl border p-5 mb-5', overall.bg, overall.border)}>
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', overall.bg)}>
                    <span className={cn('w-2.5 h-2.5 rounded-full', overall.dot)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn('text-sm font-semibold', overall.text)}>Portfolio: {overall.label}</span>
                      <span className="text-[10px] text-text-muted">Generated {new Date(forecast.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-3">{forecast.executive_summary}</p>
                    {forecast.top_3_risks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {forecast.top_3_risks.map((r, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-background/60 text-text-secondary border border-border">
                            <AlertTriangle size={9} className={overall.text} /> {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="skeleton h-28 rounded-xl mb-5" />
            )}

            {/* Forecast cards */}
            <div className="space-y-2.5">
              {(forecast?.projects || []).map(fp => {
                const isOpen = expanded.has(fp.project_id)
                const project = projects.find(p => p.id === fp.project_id)
                const style = healthStyle(fp.health)
                return (
                  <div key={fp.project_id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    <button onClick={() => toggle(fp.project_id)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left">
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', style.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate mb-0.5">{fp.name || projName(fp.project_id)}</div>
                        <div className="text-[11px] text-text-muted truncate">{fp.summary}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-[10px] text-text-muted mb-0.5">Projected margin</div>
                        <div className={cn('text-sm font-semibold font-mono', fp.projected_margin < 10 ? 'text-danger' : fp.projected_margin < 20 ? 'text-warning' : 'text-success')}>
                          {fp.projected_margin}%
                        </div>
                      </div>
                      <span className={cn('inline-flex px-2 py-1 rounded-lg text-[10px] font-medium flex-shrink-0', style.bg, style.text)}>{style.label}</span>
                      <ChevronRight size={14} className={cn('text-text-muted transition-transform flex-shrink-0', isOpen && 'rotate-90')} />
                    </button>
                    {isOpen && (
                      <div className="border-t border-border px-5 py-4 grid grid-cols-3 gap-5">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">Projected Completion</div>
                          <div className="text-sm font-medium text-text-primary tabular-nums">{fp.projected_completion ? new Date(fp.projected_completion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                          {project?.deadline && <div className="text-[11px] text-text-muted mt-0.5">Deadline: {new Date(project.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">Budget</div>
                          <div className="text-sm font-medium text-text-primary font-mono">{project?.budget ? fmt(project.budget) : '—'}</div>
                          <div className="text-[11px] text-text-muted mt-0.5">{project?.progress || 0}% complete</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">AI Assessment</div>
                          <p className="text-xs text-text-secondary leading-relaxed">{fp.summary}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
