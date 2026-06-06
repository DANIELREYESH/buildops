'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import type { Checkin, Project } from '@/lib/types'

function Chevron() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="#9B978F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

const STATUS_COLORS: Record<Checkin['status'], string> = {
  received: 'bg-[#E8F5EE] text-[#1A6B45]',
  pending: 'bg-[#FEF6E4] text-[#96670A]',
  issue: 'bg-[#FCEAE8] text-[#B8301A]',
  no_response: 'bg-gray-100 text-[#9B978F]',
}
const STATUS_LABELS: Record<Checkin['status'], string> = {
  received: 'Received', pending: 'Pending', issue: 'Issue', no_response: 'No Response',
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

export default function CheckinsPage() {
  const { toast } = useToast()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)

  const [form, setForm] = useState({
    project_id: '', worker_name: '', worker_phone: '', message: '',
    progress_extracted: '', cost_extracted: '', issue_flagged: false, issue_description: '',
  })

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('checkins').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    ])
    setCheckins((c as Checkin[]) || [])
    setProjects((p as Project[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const parseMessage = () => {
    const msg = form.message.toLowerCase()
    setParsing(true)
    setTimeout(() => {
      const progressMatch = msg.match(/(\d+)\s*%/)
      const costMatch = msg.match(/£\s*([\d,]+(?:\.\d+)?)/)
      const hasIssue = msg.includes('issue') || msg.includes('problem') || msg.includes('blocked') || msg.includes('delay')
      setForm(f => ({
        ...f,
        progress_extracted: progressMatch ? progressMatch[1] : f.progress_extracted,
        cost_extracted: costMatch ? costMatch[1].replace(',', '') : f.cost_extracted,
        issue_flagged: hasIssue,
        issue_description: hasIssue ? 'Issue detected in message — review required' : f.issue_description,
      }))
      setParsing(false)
      toast('Message parsed', 'info')
    }, 800)
  }

  const handleCreate = async () => {
    if (!form.worker_name || !form.message) return
    setSaving(true)
    const aiSummary = `Worker: ${form.worker_name}. ${form.progress_extracted ? `Progress: ${form.progress_extracted}%.` : ''} ${form.cost_extracted ? `Materials logged: £${form.cost_extracted}.` : ''} ${form.issue_flagged ? `ISSUE: ${form.issue_description}` : 'No issues reported.'}`
    const { data, error } = await supabase.from('checkins').insert({
      project_id: form.project_id || null,
      worker_name: form.worker_name, worker_phone: form.worker_phone || null,
      message: form.message, ai_summary: aiSummary,
      progress_extracted: form.progress_extracted ? parseInt(form.progress_extracted) : null,
      cost_extracted: form.cost_extracted ? parseFloat(form.cost_extracted) : null,
      issue_flagged: form.issue_flagged,
      issue_description: form.issue_description || null,
      status: form.issue_flagged ? 'issue' : 'received',
      checkin_date: today,
    }).select()
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    if (data) setCheckins(prev => [data[0] as Checkin, ...prev])
    setShowModal(false)
    setForm({ project_id: '', worker_name: '', worker_phone: '', message: '', progress_extracted: '', cost_extracted: '', issue_flagged: false, issue_description: '' })
    toast('Check-in submitted')
  }

  const updateStatus = async (id: string, status: Checkin['status']) => {
    const { error } = await supabase.from('checkins').update({ status }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setCheckins(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    toast('Status updated')
  }

  const todayCheckins = checkins.filter(c => c.checkin_date === today)
  const issueCount = todayCheckins.filter(c => c.issue_flagged).length
  const autoLogged = todayCheckins.reduce((s, c) => s + (c.cost_extracted || 0), 0)
  const projName = (id: string | null) => projects.find(p => p.id === id)?.name || 'Unknown project'

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <AppLayout>
      <div className="sticky top-0 z-10 h-12 bg-white border-b border-[#E5E2DB] px-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#9B978F]">BuildOps</span>
          <Chevron />
          <span className="text-xs font-semibold text-gray-900">AI Check-ins</span>
        </div>
        <button onClick={() => setShowModal(true)} className="text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-1.5 rounded-lg hover:bg-[#BE4A16] transition-colors">
          + Submit Check-in
        </button>
      </div>

      <div className="p-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AI Check-ins</h1>
          <p className="text-xs text-[#9B978F] mt-1">
            {todayCheckins.length} received today · {issueCount} issue{issueCount !== 1 ? 's' : ''} flagged · {fmt(autoLogged)} auto-logged
          </p>
        </div>

        {/* Issue alerts */}
        {checkins.filter(c => c.issue_flagged && c.status === 'issue').slice(0, 2).map(c => (
          <div key={c.id} className="mb-3 bg-[#FCEAE8] border border-[#B8301A]/20 rounded-[10px] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#B8301A" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="#B8301A" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#B8301A"/></svg>
              <p className="text-xs text-[#B8301A] font-semibold">
                <span className="font-bold">{c.worker_name}</span> on {projName(c.project_id)}: {c.issue_description}
              </p>
            </div>
            <button onClick={() => updateStatus(c.id, 'received')} className="text-[10px] font-bold text-[#B8301A] border border-[#B8301A]/30 px-2.5 py-1 rounded-lg hover:bg-[#f8d5d2]">
              Resolve
            </button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-5">
          {/* Check-in cards */}
          <div className="col-span-1 space-y-4">
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[10px]" />)}
              </div>
            ) : checkins.length === 0 ? (
              <div className="bg-white border border-[#DDD9D0] rounded-[10px] p-14 text-center">
                <p className="text-sm text-gray-400 font-semibold">No check-ins yet</p>
                <p className="text-xs text-gray-300 mt-1">Workers submit daily reports via the mobile app.</p>
                <button onClick={() => setShowModal(true)} className="mt-4 text-xs font-semibold text-white bg-[#D4561A] px-3.5 py-2 rounded-lg hover:bg-[#BE4A16]">+ Submit Check-in</button>
              </div>
            ) : checkins.map(c => (
              <div key={c.id} className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold text-gray-900">{c.worker_name}</div>
                    <div className="text-[11px] text-[#9B978F]">{projName(c.project_id)} · {fmtTime(c.created_at)}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>

                {/* Chat bubble */}
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-white">AI</span>
                    </div>
                    <div className="bg-[#F7F6F2] rounded-lg rounded-tl-none px-3 py-2 text-xs text-gray-700 max-w-[80%]">
                      End of day check-in: How did the site go today? Any issues, costs or progress to report?
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="bg-[#D4561A] rounded-lg rounded-tr-none px-3 py-2 text-xs text-white max-w-[80%]">
                      {c.message}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#D4561A]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-[#D4561A]">{c.worker_name.charAt(0)}</span>
                    </div>
                  </div>
                </div>

                {/* AI summary */}
                {c.ai_summary && (
                  <div className="bg-[#EBF0FD] rounded-lg px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold text-[#1A3FAA] uppercase tracking-wide">AI Summary</span>
                    </div>
                    {c.progress_extracted !== null && (
                      <div className="flex items-center gap-2 text-xs text-[#1A3FAA]">
                        <span className="font-semibold">Progress:</span> {c.progress_extracted}%
                      </div>
                    )}
                    {c.cost_extracted !== null && (
                      <div className="flex items-center gap-2 text-xs text-[#1A3FAA]">
                        <span className="font-semibold">Costs logged:</span> {fmt(c.cost_extracted)}
                      </div>
                    )}
                    {c.issue_flagged && (
                      <div className="flex items-center gap-2 text-xs text-[#B8301A] font-semibold">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>
                        {c.issue_description}
                      </div>
                    )}
                  </div>
                )}

                {c.status === 'pending' && (
                  <button onClick={() => updateStatus(c.id, 'no_response')} className="mt-2 w-full text-xs font-semibold text-[#96670A] bg-[#FEF6E4] py-1.5 rounded-lg hover:bg-[#fce9c7] transition-colors">
                    Send Reminder
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Timeline sidebar */}
          <div className="col-span-1">
            <div className="bg-white border border-[#DDD9D0] rounded-[10px] shadow-[0_1px_2px_rgba(0,0,0,.05)] overflow-hidden sticky top-16">
              <div className="px-4 py-3 border-b border-[#F0EDE8]">
                <span className="text-xs font-bold text-gray-900">Today&apos;s Timeline</span>
              </div>
              <div className="divide-y divide-[#F0EDE8] max-h-[500px] overflow-y-auto">
                {todayCheckins.length === 0 ? (
                  <p className="text-xs text-[#9B978F] text-center py-10">No check-ins today.</p>
                ) : todayCheckins.map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${c.status === 'received' ? 'bg-[#1A6B45]' : c.status === 'issue' ? 'bg-[#B8301A]' : c.status === 'pending' ? 'bg-[#96670A]' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-900">{c.worker_name}</span>
                        <span className="text-[10px] text-[#9B978F]">{fmtTime(c.created_at)}</span>
                      </div>
                      <span className="text-[11px] text-[#9B978F]">{projName(c.project_id)}</span>
                      {c.issue_flagged && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FCEAE8] text-[#B8301A] ml-2">Issue</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E5E2DB] flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900">Submit Check-in</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9B978F] hover:text-gray-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Worker Name *</label>
                  <input value={form.worker_name} onChange={e => setForm(f => ({...f, worker_name: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]" placeholder="James Reid" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Project</label>
                  <select value={form.project_id} onChange={e => setForm(f => ({...f, project_id: e.target.value}))} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A]">
                    <option value="">Select project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[#9B978F] font-semibold block mb-1.5">Worker Message *</label>
                <textarea value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} rows={4} className="w-full border border-[#E5E2DB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4561A] resize-none" placeholder="e.g. Done first fix electrics ground floor, 65% done. Spent £340 on cable at Travis. No issues." />
                <button onClick={parseMessage} disabled={!form.message || parsing} className="mt-2 text-xs font-semibold text-[#1A3FAA] hover:underline disabled:opacity-50">
                  {parsing ? 'Parsing...' : 'Parse with AI →'}
                </button>
              </div>
              {(form.progress_extracted || form.cost_extracted || form.issue_flagged) && (
                <div className="bg-[#EBF0FD] rounded-lg px-4 py-3 space-y-1">
                  <div className="text-[10px] font-bold text-[#1A3FAA] uppercase tracking-wide mb-1">Extracted</div>
                  {form.progress_extracted && <div className="text-xs text-[#1A3FAA]">Progress: {form.progress_extracted}%</div>}
                  {form.cost_extracted && <div className="text-xs text-[#1A3FAA]">Cost: £{form.cost_extracted}</div>}
                  {form.issue_flagged && <div className="text-xs text-[#B8301A] font-semibold">Issue flagged</div>}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-[#E5E2DB] text-gray-500 text-xs font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !form.worker_name || !form.message} className="flex-1 bg-[#D4561A] text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-[#BE4A16] disabled:opacity-50">
                  {saving ? 'Submitting...' : 'Submit Check-in'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
