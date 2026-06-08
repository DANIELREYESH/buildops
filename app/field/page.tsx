'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList, Clock, Camera, Sun, Cloud, CloudRain, Wind,
  CheckCircle, AlertCircle, Send, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Tab = 'checkin' | 'timesheet' | 'scan'
type Weather = 'sun' | 'cloud' | 'rain' | 'wind' | null

interface Project {
  id: string
  name: string
}

interface AiCheckinResult {
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  urgent: boolean
  safety_flags: string[]
}

const WEATHER_OPTIONS: { id: Weather; icon: React.ElementType; label: string }[] = [
  { id: 'sun', icon: Sun, label: 'Sunny' },
  { id: 'cloud', icon: Cloud, label: 'Cloudy' },
  { id: 'rain', icon: CloudRain, label: 'Rainy' },
  { id: 'wind', icon: Wind, label: 'Windy' },
]

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟',
}

const BREAK_OPTIONS = [
  { value: '0', label: 'No break' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
]

function calcHours(start: string, end: string, breakMins: number): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMins = (eh * 60 + em) - (sh * 60 + sm) - breakMins
  return Math.max(0, totalMins / 60)
}

export default function FieldPage() {
  const [tab, setTab] = useState<Tab>('checkin')
  const [projects, setProjects] = useState<Project[]>([])
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const today = new Date().toISOString().split('T')[0]

  // Check-in state
  const [ciWorker, setCiWorker] = useState('')
  const [ciProject, setCiProject] = useState('')
  const [ciMessage, setCiMessage] = useState('')
  const [ciWeather, setCiWeather] = useState<Weather>(null)
  const [ciSafety, setCiSafety] = useState<boolean | null>(null)
  const [ciSafetyNote, setCiSafetyNote] = useState('')
  const [ciSubmitting, setCiSubmitting] = useState(false)
  const [ciResult, setCiResult] = useState<AiCheckinResult | null>(null)

  // Timesheet state
  const [tsWorker, setTsWorker] = useState('')
  const [tsProject, setTsProject] = useState('')
  const [tsStart, setTsStart] = useState('')
  const [tsEnd, setTsEnd] = useState('')
  const [tsBreak, setTsBreak] = useState('0')
  const [tsNotes, setTsNotes] = useState('')
  const [tsSubmitting, setTsSubmitting] = useState(false)
  const [tsDone, setTsDone] = useState(false)

  // Scan state
  const [scanProject, setScanProject] = useState('')
  const [scanDesc, setScanDesc] = useState('')
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanSubmitting, setScanSubmitting] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('projects').select('id, name').order('name').then(({ data }) => {
      setProjects((data as Project[]) || [])
    })
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      setDate(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const hours = calcHours(tsStart, tsEnd, Number(tsBreak))

  const handleCheckinSubmit = async () => {
    if (!ciWorker || !ciMessage) { toast.error('Enter your name and message'); return }
    setCiSubmitting(true)
    setCiResult(null)
    try {
      const weatherLine = ciWeather ? `\nWeather: ${ciWeather}` : ''
      const safetyLine = ciSafety ? `\nSafety issue: ${ciSafetyNote || 'Yes'}` : ''
      const res = await fetch('/api/ai-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: ciProject || null,
          worker_name: ciWorker,
          message: ciMessage + weatherLine + safetyLine,
        }),
      })
      if (!res.ok) throw new Error('Check-in failed')
      const data = await res.json()
      setCiResult(data as AiCheckinResult)
      setCiMessage('')
      setCiSafety(null)
      setCiSafetyNote('')
      setCiWeather(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setCiSubmitting(false)
    }
  }

  const handleTimesheetSubmit = async () => {
    if (!tsWorker || !tsProject || !tsStart || !tsEnd) {
      toast.error('Fill in all required fields')
      return
    }
    setTsSubmitting(true)
    try {
      const { error } = await supabase.from('timesheets').insert({
        user_name: tsWorker,
        project_id: tsProject,
        date: today,
        clock_in: tsStart,
        clock_out: tsEnd,
        notes: tsNotes || null,
      })
      if (error) throw error
      setTsDone(true)
      toast.success('Timesheet submitted')
      setTsWorker('')
      setTsProject('')
      setTsStart('')
      setTsEnd('')
      setTsBreak('0')
      setTsNotes('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setTsSubmitting(false)
    }
  }

  const handleScanSubmit = async () => {
    if (!scanDesc || !scanProject) { toast.error('Select a project and add a description'); return }
    setScanSubmitting(true)
    try {
      const { error } = await supabase.from('costs').insert({
        project_id: scanProject,
        category: 'materials',
        supplier: 'Field scan',
        amount: 0,
        date: today,
        notes: scanDesc,
      })
      if (error) throw error
      setScanDone(true)
      toast.success('Scan submitted')
      setScanDesc('')
      setScanProject('')
      setScanPreview(null)
      setScanFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setScanSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a', color: '#f5f5f5' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
              <span className="text-white font-black text-[10px]">B</span>
            </div>
            <span className="text-xs font-semibold text-neutral-400 tracking-wide">BuildOps Field</span>
          </div>
          <div className="text-[28px] font-bold leading-none text-white">Hi, {ciWorker || 'Worker'}</div>
          <div className="text-sm text-neutral-400 mt-1">{date}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-semibold text-white">{time}</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 px-5">
        {/* TAB 1: CHECK-IN */}
        {tab === 'checkin' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-semibold text-white">Site Check-in</h2>

            {/* Worker name */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Your Name</label>
              <input
                value={ciWorker}
                onChange={e => setCiWorker(e.target.value)}
                placeholder="James Reid"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Project selector */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Project</label>
              <div className="relative">
                <select
                  value={ciProject}
                  onChange={e => setCiProject(e.target.value)}
                  className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500 pr-10"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">What happened on site today?</label>
              <textarea
                value={ciMessage}
                onChange={e => setCiMessage(e.target.value)}
                rows={4}
                placeholder="Progress made, materials delivered, issues encountered..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Weather */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-2">Weather Conditions</label>
              <div className="grid grid-cols-4 gap-2">
                {WEATHER_OPTIONS.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setCiWeather(ciWeather === w.id ? null : w.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                      ciWeather === w.id
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                    )}
                  >
                    <w.icon size={20} />
                    <span className="text-[10px]">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safety toggle */}
            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-2">Any Safety Issues?</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: false, label: 'No Issues', cls: ciSafety === false ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400' },
                  { v: true, label: 'Yes, Issue', cls: ciSafety === true ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400' },
                ].map(opt => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setCiSafety(ciSafety === opt.v ? null : opt.v)}
                    className={cn('py-3 rounded-xl border text-sm font-medium transition-all', opt.cls)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {ciSafety === true && (
                <input
                  value={ciSafetyNote}
                  onChange={e => setCiSafetyNote(e.target.value)}
                  placeholder="Describe the safety issue..."
                  className="w-full mt-2 bg-neutral-900 border border-red-500/50 rounded-xl px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                />
              )}
            </div>

            <button
              onClick={handleCheckinSubmit}
              disabled={ciSubmitting || !ciWorker || !ciMessage}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-base py-4 rounded-xl transition-colors"
            >
              {ciSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing...</>
              ) : (
                <><Send size={16} /> Submit Check-in</>
              )}
            </button>

            {/* AI Result */}
            {ciResult && (
              <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{SENTIMENT_EMOJI[ciResult.sentiment] || '😐'}</span>
                  <div>
                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide">AI Analysis</div>
                    {ciResult.urgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 mt-1">
                        <AlertCircle size={10} /> Urgent action needed
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">{ciResult.summary}</p>
                {ciResult.safety_flags?.length > 0 && (
                  <div className="space-y-1">
                    {ciResult.safety_flags.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle size={12} /> Check-in recorded
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TIMESHEET */}
        {tab === 'timesheet' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-semibold text-white">Log Time</h2>

            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 text-center">
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Today</div>
              <div className="text-lg font-semibold text-white">{date}</div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Your Name</label>
              <input
                value={tsWorker}
                onChange={e => setTsWorker(e.target.value)}
                placeholder="James Reid"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Project</label>
              <div className="relative">
                <select
                  value={tsProject}
                  onChange={e => setTsProject(e.target.value)}
                  className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500 pr-10"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={tsStart}
                  onChange={e => setTsStart(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">End Time</label>
                <input
                  type="time"
                  value={tsEnd}
                  onChange={e => setTsEnd(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Break Duration</label>
              <div className="grid grid-cols-4 gap-2">
                {BREAK_OPTIONS.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setTsBreak(b.value)}
                    className={cn(
                      'py-2.5 rounded-xl border text-xs font-medium transition-all',
                      tsBreak === b.value
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                    )}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours calculated */}
            {hours > 0 && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-4 text-center">
                <div className="text-xs text-indigo-400 uppercase tracking-wide mb-1">Total Hours</div>
                <div className="text-5xl font-bold text-white tabular-nums">{hours.toFixed(1)}</div>
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Notes (optional)</label>
              <textarea
                value={tsNotes}
                onChange={e => setTsNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this time entry..."
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              onClick={handleTimesheetSubmit}
              disabled={tsSubmitting || !tsWorker || !tsProject || !tsStart || !tsEnd}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-base py-4 rounded-xl transition-colors"
            >
              {tsSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Clock size={16} /> Submit Timesheet</>
              )}
            </button>

            {tsDone && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <CheckCircle size={16} /> Timesheet recorded
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCAN */}
        {tab === 'scan' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-base font-semibold text-white">Scan Ticket</h2>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                setScanFile(f)
                if (f.type.startsWith('image/')) {
                  const reader = new FileReader()
                  reader.onload = ev => setScanPreview(ev.target?.result as string)
                  reader.readAsDataURL(f)
                } else {
                  setScanPreview(null)
                }
              }}
            />

            {!scanPreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-4 bg-neutral-900 border-2 border-dashed border-neutral-700 rounded-2xl py-12 hover:border-indigo-500/50 hover:bg-neutral-800/50 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
                  <Camera size={28} className="text-neutral-400" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-white">Tap to photograph</div>
                  <div className="text-xs text-neutral-500 mt-1">Receipt or delivery ticket</div>
                </div>
              </button>
            ) : (
              <div className="relative">
                <img src={scanPreview} alt="Scan preview" className="w-full rounded-2xl object-cover max-h-56" />
                <button
                  onClick={() => { setScanPreview(null); setScanFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {scanFile && !scanPreview && (
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3 flex items-center gap-2 text-xs text-neutral-400">
                <Camera size={14} /> {scanFile.name}
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">What is this for? *</label>
              <input
                value={scanDesc}
                onChange={e => setScanDesc(e.target.value)}
                placeholder="e.g. Timber delivery from Travis Perkins"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wide text-neutral-500 font-medium block mb-1.5">Project *</label>
              <div className="relative">
                <select
                  value={scanProject}
                  onChange={e => setScanProject(e.target.value)}
                  className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-indigo-500 pr-10"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleScanSubmit}
              disabled={scanSubmitting || !scanDesc || !scanProject}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-base py-4 rounded-xl transition-colors"
            >
              {scanSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : (
                <><Camera size={16} /> Submit Scan</>
              )}
            </button>

            {scanDone && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <CheckCircle size={16} /> Ticket recorded
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 flex border-t border-neutral-800 z-50" style={{ backgroundColor: '#0a0a0a' }}>
        {([
          { id: 'checkin' as Tab, icon: ClipboardList, label: 'Check-in' },
          { id: 'timesheet' as Tab, icon: Clock, label: 'Timesheet' },
          { id: 'scan' as Tab, icon: Camera, label: 'Scan' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-3 transition-colors',
              tab === t.id ? 'text-indigo-400' : 'text-neutral-600'
            )}
          >
            <t.icon size={22} />
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
