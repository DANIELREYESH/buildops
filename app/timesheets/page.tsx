'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Timesheet, Project } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-t border-[#F0EDE8]">
          <div className="h-4 bg-gray-100 rounded w-1/5" />
          <div className="h-4 bg-gray-100 rounded w-1/5" />
          <div className="h-4 bg-gray-100 rounded w-1/5" />
          <div className="h-4 bg-gray-100 rounded w-1/8" />
          <div className="h-4 bg-gray-100 rounded w-1/8" />
        </div>
      ))}
    </div>
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

  const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

  const fmtTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">Timesheets</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-xs text-gray-500 border border-[#E5E2DB] px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">Export CSV</button>
          <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">+ Log Hours</button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Timesheets</h1>
          <p className="text-xs text-[#9B978F] mt-1">Log and review hours worked across all projects and trades.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Active Clock-in', value: activeEntry ? '1 active' : 'None active', sub: activeEntry ? `Since ${fmtTime(activeEntry.clock_in)}` : 'No one clocked in', color: activeEntry ? 'text-[#1A6B45]' : 'text-[#9B978F]' },
            { label: 'Total Hours Today', value: `${Math.round(todayHours * 10) / 10}h`, sub: `${timesheets.filter(t => t.date === today).length} entries`, color: 'text-gray-900' },
            { label: 'Labour Cost Today', value: fmt(labourCostToday), sub: `@ £${LABOUR_RATE}/hr`, color: 'text-gray-900' },
            { label: 'Overtime Flagged', value: `${overtimeEntries.length}`, sub: 'Over 8h', color: overtimeEntries.length > 0 ? 'text-[#96670A]' : 'text-[#9B978F]' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
              <div className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[11px] text-[#9B978F] mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Clock in/out quick action */}
        {activeEntry ? (
          <div className="bg-[#E8F5EE] border border-[#1A6B45]/20 rounded-[10px] p-4 mb-5 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-[#1A6B45]">Clocked in since {fmtTime(activeEntry.clock_in)}</span>
              <p className="text-xs text-[#1A6B45]/70 mt-0.5">Project: {projName(activeEntry.project_id)}</p>
            </div>
            <button onClick={clockOut} className="text-xs font-bold text-white bg-[#1A6B45] px-4 py-2 rounded-lg hover:bg-[#145538]">Clock Out</button>
          </div>
        ) : (
          <div className="bg-[#F7F6F2] border border-[#DDD9D0] rounded-[10px] p-4 mb-5 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900">Not clocked in</span>
              <p className="text-xs text-[#9B978F] mt-0.5">Select a project to start tracking time</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white" id="ci-project">
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => { const sel = document.getElementById('ci-project') as HTMLSelectElement; clockIn(sel?.value || '') }}
                className="text-xs font-bold text-white bg-[#D4561A] px-4 py-2 rounded-lg hover:bg-[#BE4A16]">Clock In</button>
            </div>
          </div>
        )}

        {/* Date range + table */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#9B978F]">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#9B978F]">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-[#E5E2DB] rounded-lg px-3 py-1.5 text-xs focus:outline-none bg-white" />
          </div>
          <span className="text-xs text-[#9B978F]">{Math.round(totalHours * 10) / 10}h total · {fmt(Math.round(totalHours * LABOUR_RATE))} labour cost</span>
        </div>

        <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2]">
                {['Worker', 'Date', 'Project', 'Clock In', 'Clock Out', 'Hours', 'OT', 'Daily Cost', 'GPS'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-[#9B978F] font-semibold text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}><Skeleton /></td></tr> :
               timesheets.length === 0 ? (
                <tr><td colSpan={9} className="py-14 text-center">
                  <p className="text-sm text-gray-400 font-semibold">No timesheets in this period</p>
                </td></tr>
               ) : timesheets.map(t => {
                const overtime = (t.hours || 0) > 8
                return (
                  <tr key={t.id} className="border-t border-[#F0EDE8] hover:bg-[#F7F6F2] transition-colors">
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-900">{t.user_name}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9B978F]">{t.date}</td>
                    <td className="px-4 py-2.5 text-xs text-[#9B978F]">{projName(t.project_id)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{fmtTime(t.clock_in)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{fmtTime(t.clock_out)}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-900">{t.hours ? `${t.hours}h` : '—'}</td>
                    <td className="px-4 py-2.5">
                      {overtime && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF6E4] text-[#96670A]">OT</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-900">{t.hours ? fmt(Math.round(t.hours * LABOUR_RATE)) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${t.gps_verified ? 'bg-[#E8F5EE] text-[#1A6B45]' : 'bg-gray-100 text-[#9B978F]'}`}>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Log Hours</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Worker Name *</label>
                  <input value={form.user_name} onChange={e => setForm(f => ({...f, user_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project</label>
                <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Clock In *</label>
                  <input type="time" value={form.clock_in} onChange={e => setForm(f => ({...f, clock_in: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Clock Out</label>
                  <input type="time" value={form.clock_out} onChange={e => setForm(f => ({...f, clock_out: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="Optional notes" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.user_name || !form.clock_in} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Log Hours'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
