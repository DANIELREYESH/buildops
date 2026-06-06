'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import type { Project, Cost } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

type ForecastRow = {
  project: Project
  spent: number
  dailyBurn: number
  projectedEndDate: string
  daysOver: number
  margin: number
  confidence: number
  isAtRisk: boolean
  action: string
}

function projectForecast(project: Project, spent: number, costs: Cost[]): ForecastRow {
  const budget = project.budget || 0
  const progress = project.progress || 0
  const deadline = project.deadline

  const projectCosts = costs.filter(c => c.project_id === project.id).sort((a, b) => a.date.localeCompare(b.date))
  const firstDate = projectCosts[0]?.date ? new Date(projectCosts[0].date) : new Date()
  const daysElapsed = Math.max(1, Math.floor((Date.now() - firstDate.getTime()) / 86400000))
  const dailyBurn = spent / daysElapsed

  // Projected end: if progress > 0, extrapolate from progress rate
  let projectedEndDate = deadline || ''
  let daysOver = 0
  if (progress > 0 && daysElapsed > 0) {
    const totalDaysNeeded = Math.round((daysElapsed / progress) * 100)
    const projDate = new Date(firstDate)
    projDate.setDate(projDate.getDate() + totalDaysNeeded)
    projectedEndDate = projDate.toISOString().split('T')[0]
    if (deadline) {
      daysOver = Math.floor((projDate.getTime() - new Date(deadline).getTime()) / 86400000)
    }
  }

  const projectedCost = budget > 0 && progress > 0 ? spent / (progress / 100) : spent
  const revenue = budget
  const margin = revenue > 0 ? Math.round(((revenue - projectedCost) / revenue) * 100) : 0

  // Confidence: higher if progress data is consistent
  const confidence = Math.min(95, Math.max(20, progress > 10 ? 65 + progress * 0.3 : 35))

  const isAtRisk = margin < 15 || daysOver > 14

  let action = ''
  if (margin < 10) action = 'Urgent: Margin below 10% — review cost overruns immediately'
  else if (margin < 15) action = 'Warning: Margin at risk — tighten material and labour costs'
  else if (daysOver > 30) action = 'Delay risk: over 30 days behind schedule — assess blockers'
  else if (daysOver > 14) action = 'Running late: review resourcing and programme'
  else if (progress < 20 && daysElapsed > 30) action = 'Slow start: low progress after 30 days — check programme'
  else action = 'On track — no immediate action required'

  return { project, spent, dailyBurn, projectedEndDate, daysOver, margin, confidence, isAtRisk, action }
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: projects }, { data: costs }] = await Promise.all([
      supabase.from('projects').select('*').in('status', ['active', 'delayed']).order('name'),
      supabase.from('costs').select('*').order('date'),
    ])
    const ps = (projects as Project[]) || []
    const cs = (costs as Cost[]) || []

    const spentMap: Record<string, number> = {}
    cs.forEach(c => { if (c.project_id) spentMap[c.project_id] = (spentMap[c.project_id] || 0) + c.amount })

    const rows = ps.map(p => projectForecast(p, spentMap[p.id] || 0, cs))
    rows.sort((a, b) => a.margin - b.margin)
    setForecasts(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const atRisk = forecasts.filter(f => f.isAtRisk)
  const avgMargin = forecasts.length > 0 ? Math.round(forecasts.reduce((s, f) => s + f.margin, 0) / forecasts.length) : 0
  const totalRevenue = forecasts.reduce((s, f) => s + (f.project.budget || 0), 0)
  const totalSpent = forecasts.reduce((s, f) => s + f.spent, 0)

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">AI Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF0FD] text-[#1A3FAA]">AI</span>
          <span className="text-xs text-[#9B978F]">Live predictions from cost + progress data</span>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AI Forecast</h1>
          <p className="text-xs text-[#9B978F] mt-1">Completion forecasts and margin predictions across all active projects.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Active projects', value: String(forecasts.length), sub: 'In forecast' },
            { label: 'At risk', value: String(atRisk.length), sub: '<15% margin or delayed', accent: atRisk.length > 0 },
            { label: 'Avg margin', value: `${avgMargin}%`, sub: 'Projected across portfolio', accent: avgMargin < 15 },
            { label: 'Total revenue', value: fmt(totalRevenue), sub: `${fmt(totalSpent)} spent to date` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{s.label}</div>
              <div className={`text-lg font-bold ${s.accent ? 'text-[#B8301A]' : 'text-gray-900'}`}>{s.value}</div>
              <div className="text-[10px] text-[#9B978F] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* At-risk alerts */}
        {atRisk.length > 0 && (
          <div className="mb-5 space-y-2">
            {atRisk.map(f => (
              <div key={f.project.id} className="bg-[#FEF2F2] border border-[#F5C0BC] rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#B8301A" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/></svg>
                  <span className="text-xs font-bold text-[#B8301A]">{f.project.name}</span>
                  <span className="text-xs text-[#B8301A]">— {f.action}</span>
                </div>
                <span className="text-xs font-bold font-mono text-[#B8301A]">{f.margin}% margin</span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-[10px]" />)}
          </div>
        ) : forecasts.length === 0 ? (
          <div className="bg-white border border-[#DDD9D0] rounded-[10px] text-center py-16">
            <p className="text-sm font-semibold text-gray-500">No active projects to forecast</p>
            <p className="text-xs text-[#9B978F] mt-1">Create projects and log costs to see AI predictions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forecasts.map(f => {
              const isOpen = expanded.has(f.project.id)
              const marginColor = f.margin < 10 ? 'text-[#B8301A]' : f.margin < 20 ? 'text-[#96670A]' : 'text-[#1A6B45]'
              const marginBg = f.margin < 10 ? 'bg-[#FEF2F2]' : f.margin < 20 ? 'bg-[#FEF6E4]' : 'bg-[#E8F5EE]'
              const burnColor = f.dailyBurn > (f.project.budget || 0) / 30 ? 'text-[#B8301A]' : 'text-gray-900'
              return (
                <div key={f.project.id} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#F7F6F2] transition-colors text-left"
                    onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(f.project.id)) n.delete(f.project.id); else n.add(f.project.id); return n })}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900 truncate">{f.project.name}</span>
                        {f.isAtRisk && <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF2F2] text-[#B8301A]">At risk</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#9B978F]">Progress: {f.project.progress || 0}%</span>
                        {f.projectedEndDate && <span className="text-[10px] text-[#9B978F]">Projected: {f.projectedEndDate}</span>}
                        {f.daysOver > 0 && <span className="text-[10px] font-bold text-[#B8301A]">+{f.daysOver}d late</span>}
                        {f.daysOver < 0 && <span className="text-[10px] font-bold text-[#1A6B45]">{Math.abs(f.daysOver)}d early</span>}
                      </div>
                    </div>
                    {/* Confidence bar */}
                    <div className="w-28 flex-shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-[#9B978F]">Confidence</span>
                        <span className="text-[9px] font-bold text-gray-900">{Math.round(f.confidence)}%</span>
                      </div>
                      <div className="h-1 bg-[#F0EDE8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A3FAA] rounded-full" style={{ width: `${f.confidence}%` }} />
                      </div>
                    </div>
                    {/* Margin badge */}
                    <div className={`flex-shrink-0 px-3 py-2 rounded-lg ${marginBg}`}>
                      <div className="text-[9px] text-center mb-0.5 font-semibold text-[#9B978F]">Margin</div>
                      <div className={`text-sm font-bold font-mono text-center ${marginColor}`}>{f.margin}%</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#F0EDE8] p-5 grid grid-cols-3 gap-5">
                      {/* Cost burn table */}
                      <div className="col-span-2">
                        <h4 className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-3">Cost Burn Rate</h4>
                        <table className="w-full">
                          <tbody className="divide-y divide-[#F0EDE8]">
                            {[
                              { label: 'Budget', value: fmt(f.project.budget || 0) },
                              { label: 'Spent to date', value: fmt(f.spent) },
                              { label: 'Remaining budget', value: fmt(Math.max(0, (f.project.budget || 0) - f.spent)), accent: (f.project.budget || 0) - f.spent < 0 },
                              { label: 'Daily burn rate', value: `${fmt(f.dailyBurn)}/day`, accent: false },
                              { label: 'Projected total cost', value: fmt(f.project.progress ? f.spent / (f.project.progress / 100) : f.spent) },
                              { label: 'Projected margin', value: `${f.margin}%`, accent: f.margin < 15 },
                            ].map(row => (
                              <tr key={row.label}>
                                <td className="py-1.5 text-xs text-[#9B978F]">{row.label}</td>
                                <td className={`py-1.5 text-xs font-mono font-bold text-right ${row.accent ? 'text-[#B8301A]' : 'text-gray-900'}`}>{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Recommended action */}
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-3">Recommended Action</h4>
                        <div className={`rounded-lg p-3 text-xs leading-relaxed ${f.isAtRisk ? 'bg-[#FEF2F2] text-[#B8301A]' : 'bg-[#E8F5EE] text-[#1A6B45]'}`}>
                          {f.action}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#F0EDE8]">
                          <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-2">Daily Burn</div>
                          <div className={`text-lg font-bold font-mono ${burnColor}`}>{fmt(f.dailyBurn)}<span className="text-xs text-[#9B978F] font-normal">/day</span></div>
                          <div className="text-[10px] text-[#9B978F] mt-0.5">Based on {f.project.progress || 0}% progress</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
