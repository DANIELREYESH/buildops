'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Timesheet, Project } from '@/lib/types'
import { CHART_COLORS, CHART_THEME } from '@/lib/chart-colors'

function Skeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-border">
          <td colSpan={9} className="px-4 py-3"><div className="skeleton h-4 rounded w-full" /></td>
        </tr>
      ))}
    </>
  )
}

const LABOUR_RATE = 18 // £/hour

export default function TimesheetsPage() {
  const { toast } = useToast()
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [activeEntry, setActiveEntry] = useState<Timesheet | null>(null)

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const weekStart = (() => {
    const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  })()

  const [dateFrom, setDateFrom] = useState(weekStart)
  const [dateTo, setDateTo] = useState(today)
  const [form, setForm] = useState({ user_name: '', project_id: '', clock_in: '', clock_out: '', notes: '', date: today })

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ts }, { data: ps }, { data: { user } }] = await Promise.all([
      supabase.from('timesheets').select('*').gte('date', dateFrom).lte('date', dateTo).order('date', { ascending: false }).order('clock_in', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
      supabase.auth.getUser(),
    ])
    setTimesheets((ts as Timesheet[]) || [])
    setProjects((ps as Project[]) || [])
    if (user?.email) {
      setUserEmail(user.email)
      const active = (ts as Timesheet[])?.find(t => t.user_email === user.email && t.clock_in && !t.clock_out && t.date === today)
      setActiveEntry(active || null)
    }
    setLoading(false)
  }, [dateFrom, dateTo, today])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.user_name || !form.clock_in) return
    setSaving(true)
    const clockIn = new Date(`${form.date}T${form.clock_in}`)
    const clockOut = form.clock_out ? new Date(`${form.date}T${form.clock_out}`) : null
    const hours = clockOut ? Math.max(0, (clockOut.getTime() - clockIn.getTime()) / 3600000 - 0.5) : null
    const { data, error } = await supabase.from('timesheets').insert({
      user_email: userEmail, user_name: form.user_name,
      project_id: form.project_id || null,
      clock_in: clockIn.toISOString(), clock_out: clockOut?.toISOString() || null,
      hours, notes: form.notes || null, date: form.date,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setTimesheets(prev => [data[0] as Timesheet, ...prev])
    setShowModal(false)
    setForm({ user_name: '', project_id: '', clock_in: '', clock_out: '', notes: '', date: today })
    toast('Timesheet logged')
  }

  const clockIn = async (projectId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date().toISOString()
    const { data, error } = await supabase.from('timesheets').insert({
      user_email: user.email, user_name: user.email?.split('@')[0] || 'Worker',
      project_id: projectId || null, clock_in: now, date: today,
    }).select()
    if (error) { toast(error.message, 'error'); return }
    if (data) { setTimesheets(prev => [data[0] as Timesheet, ...prev]); setActiveEntry(data[0] as Timesheet) }
    toast('Clocked in')
  }

  const clockOut = async () => {
    if (!activeEntry) return
    const now = new Date().toISOString()
    const clockInTime = new Date(activeEntry.clock_in!).getTime()
    const hours = Math.max(0, (new Date(now).getTime() - clockInTime) / 3600000 - 0.5)
    const { error } = await supabase.from('timesheets').update({ clock_out: now, hours: Math.round(hours * 10) / 10 }).eq('id', activeEntry.id)
    if (error) { toast(error.message, 'error'); return }
    setTimesheets(prev => prev.map(t => t.id === activeEntry.id ? { ...t, clock_out: now, hours: Math.round(hours * 10) / 10 } : t))
    setActiveEntry(null)
    toast('Clocked out — ' + Math.round(hours * 10) / 10 + 'h logged')
  }

  const exportCSV = () => {
    const header = ['Name', 'Date', 'Project', 'Clock In', 'Clock Out', 'Hours', 'Break', 'GPS', 'Notes']
    const rows = timesheets.map(t => [
      t.user_name, t.date,
      projects.find(p => p.id === t.project_id)?.name || '',
      t.clock_in ? new Date(t.clock_in).toLocaleTimeString('en-GB') : '',
      t.clock_out ? new Date(t.clock_out).toLocaleTimeString('en-GB') : '',
      t.hours || '', t.break_minutes || 30,
      t.gps_verified ? 'Match' : 'N/A',
      t.notes || '',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `timesheets-${dateFrom}-${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalHours = timesheets.reduce((s, t) => s + (t.hours || 0), 0)
  const todayHours = timesheets.filter(t => t.date === today).reduce((s, t) => s + (t.hours || 0), 0)
  const labourCostToday = Math.round(todayHours * LABOUR_RATE)
  const overtimeEntries = timesheets.filter(t => (t.hours || 0) > 8)
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || '—'

  const weekDays = (() => {
    const days: { date: string; label: string; hours: number; isWeekend: boolean }[] = []
    const base = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(base); d.setDate(base.getDate() + i)
      const iso = d.toISOString().split('T')[0]
      const dayOfWeek = d.getDay()
      days.push({
        date: iso,
        label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek],
        hours: timesheets.filter(t => t.date === iso).reduce((s, t) => s + (t.hours || 0), 0),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      })
    }
    return days
  })()
  const weekTotalHours = weekDays.reduce((s, d) => s + d.hours, 0)

  const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

  const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <>
      <div className="pt-6 px-6 pb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Timesheets</h1>
            <p className="text-sm text-text-secondary mt-0.5">Log and review hours worked across all projects and trades.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="text-xs font-medium text-text-secondary border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Export CSV</button>
            <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-accent px-3.5 py-1.5 rounded-lg hover:bg-accent-hover active:scale-[0.98] transition-colors">+ Log Hours</button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Active Clock-in', value: activeEntry ? '1 active' : 'None active', sub: activeEntry ? `Since ${fmtTime(activeEntry.clock_in)}` : 'No one clocked in', color: activeEntry ? 'text-success' : 'text-text-muted' },
            { label: 'Total Hours Today', value: `${Math.round(todayHours * 10) / 10}h`, sub: `${timesheets.filter(t => t.date === today).length} entries`, color: 'text-text-primary' },
            { label: 'Labour Cost Today', value: fmt(labourCostToday), sub: `@ £${LABOUR_RATE}/hr`, color: 'text-text-primary' },
            { label: 'Overtime Flagged', value: `${overtimeEntries.length}`, sub: 'Over 8h', color: overtimeEntries.length > 0 ? 'text-warning' : 'text-text-muted' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-text-muted mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Weekly hours bar chart */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold text-text-primary">Hours This Week</div>
              <div className="text-[10px] text-text-muted">Mon–Sun · {weekStart} to {today}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-text-primary">{Math.round(weekTotalHours * 10) / 10}h</div>
              <div className="text-[10px] text-text-muted">total this week</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weekDays} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barCategoryGap="30%">
              <XAxis dataKey="label" tick={{ fill: CHART_THEME.textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_THEME.textColor, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background: CHART_THEME.tooltipBg, border: `1px solid ${CHART_THEME.tooltipBorder}` }} className="rounded-lg px-3 py-2 text-xs shadow-xl">
                      <div style={{ color: CHART_THEME.tooltipText }} className="font-semibold">{label}</div>
                      <div style={{ color: CHART_THEME.tooltipText }} className="font-mono">{payload[0].value}h logged</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800}>
                {weekDays.map((d, i) => (
                  <Cell key={i} fill={d.isWeekend ? '#2a2a2a' : d.date === today ? CHART_COLORS.primary : `${CHART_COLORS.primary}99`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clock in/out quick action */}
        {activeEntry ? (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-success">Clocked in</span>
                <span className="text-xl font-bold font-mono text-success tabular-nums">
                  {(() => {
                    const ms = now.getTime() - new Date(activeEntry.clock_in!).getTime()
                    const h = Math.floor(ms / 3600000)
                    const m = Math.floor((ms % 3600000) / 60000)
                    const s = Math.floor((ms % 60000) / 1000)
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                  })()}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-success/70 mt-0.5">Since {fmtTime(activeEntry.clock_in)} · {projName(activeEntry.project_id)}</p>
            </div>
            <button onClick={clockOut} className="text-xs font-bold text-white bg-success px-4 py-2 rounded-lg hover:bg-success/80 transition-colors">Clock Out</button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-text-primary">Not clocked in</span>
              <p className="text-xs text-text-muted mt-0.5">Select a project to start tracking time</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent" id="ci-project">
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => { const sel = document.getElementById('ci-project') as HTMLSelectElement; clockIn(sel?.value || '') }}
                className="text-xs font-bold text-white bg-accent px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors">Clock In</button>
            </div>
          </div>
        )}

        {/* Date range + table */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <span className="text-xs text-text-muted">{Math.round(totalHours * 10) / 10}h total · {fmt(Math.round(totalHours * LABOUR_RATE))} labour cost</span>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-muted text-text-muted text-xs uppercase tracking-wider border-b border-border">
                {['Worker', 'Date', 'Project', 'Clock In', 'Clock Out', 'Hours', 'OT', 'Daily Cost', 'GPS'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] uppercase tracking-wide font-semibold text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <Skeleton /> :
               timesheets.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="text-center py-16">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--color-accent)" strokeWidth="2"/><polyline points="12 7 12 12 15 15" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <p className="text-sm font-medium text-text-primary">No timesheets in this period</p>
                    <p className="text-sm text-text-secondary mt-0.5">Log hours or adjust the date range to see entries.</p>
                  </div>
                </td></tr>
               ) : timesheets.map(t => {
                const overtime = (t.hours || 0) > 8
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-semibold text-text-primary">{t.user_name}</td>
                    <td className="px-4 py-2.5 text-xs text-text-secondary">{t.date}</td>
                    <td className="px-4 py-2.5 text-xs text-text-secondary">{projName(t.project_id)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-primary">{fmtTime(t.clock_in)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-primary">{fmtTime(t.clock_out)}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-text-primary">{t.hours ? `${t.hours}h` : '—'}</td>
                    <td className="px-4 py-2.5">
                      {overtime && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">OT</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-primary">{t.hours ? fmt(Math.round(t.hours * LABOUR_RATE)) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${t.gps_verified ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-text-secondary'}`}>
                        {t.gps_verified ? 'Match' : 'N/A'}
                      </span>
                    </td>
                  </tr>
                )
               })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Log Hours</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Worker Name *</label>
                  <input value={form.user_name} onChange={e => setForm(f => ({...f, user_name: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Project</label>
                <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Clock In *</label>
                  <input type="time" value={form.clock_in} onChange={e => setForm(f => ({...f, clock_in: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Clock Out</label>
                  <input type="time" value={form.clock_out} onChange={e => setForm(f => ({...f, clock_out: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-text-muted font-semibold block mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" placeholder="Optional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-muted hover:bg-border text-text-primary text-xs font-semibold py-2.5 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.user_name || !form.clock_in} className="flex-1 bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Log Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
