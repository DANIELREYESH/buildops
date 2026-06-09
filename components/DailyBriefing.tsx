'use client'

import { useState, useEffect } from 'react'
import { Bot, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer,
} from 'recharts'

// ── Cache ───────────────────────────────────────────────────────────────────────

interface BriefingCache { briefing: string; timestamp: number; generatedAt: string }
const CACHE_TTL_MS = 2 * 60 * 60 * 1000
const CACHE_KEY_PREFIX = 'buildops_briefing_'
function todayKey() { return CACHE_KEY_PREFIX + new Date().toISOString().split('T')[0] }

// ── Helpers ─────────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(isoStr: string) {
  try { return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

// ── Section parsing ─────────────────────────────────────────────────────────────

interface Section { header: string; content: string; bullets: string[] }

function parseBriefing(text: string): Section[] {
  const sections: Section[] = []
  let cur: Section | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const hm = line.match(/^\*\*(.+)\*\*\s*$/)
    if (hm) {
      if (cur) sections.push(cur)
      cur = { header: hm[1].trim(), content: '', bullets: [] }
    } else if (cur) {
      const bm = line.match(/^-\s+(.+)/)
      if (bm) cur.bullets.push(bm[1].trim())
      else if (line) cur.content = cur.content ? cur.content + ' ' + line : line
    }
  }
  if (cur) sections.push(cur)
  return sections
}

// ── Inline £ highlighting ───────────────────────────────────────────────────────

function Hi({ text }: { text: string }) {
  const parts = text.split(/(£[\d,]+(?:\.\d{2})?(?:k|m)?)/gi)
  return (
    <>
      {parts.map((p, i) =>
        /^£/i.test(p)
          ? <span key={i} className="text-[#6366f1] font-medium">{p}</span>
          : p
      )}
    </>
  )
}

// ── Briefing text ───────────────────────────────────────────────────────────────

function BriefingText({ sections, compact }: { sections: Section[]; compact: boolean }) {
  return (
    <div className="space-y-2">
      {sections.map((sec, si) => {
        const isPriority = /priority/i.test(sec.header)
        const bullets = compact ? sec.bullets.slice(0, 1) : sec.bullets
        return (
          <div key={si}>
            <div className={`mb-0.5 ${isPriority ? 'pl-2.5 border-l-2 border-[#6366f1]' : ''}`}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                {sec.header}
              </span>
            </div>
            {sec.content && (
              <p className="text-[12px] text-text-secondary leading-relaxed">
                <Hi text={sec.content} />
              </p>
            )}
            {bullets.map((b, bi) => (
              <div key={bi} className="flex items-start gap-1.5 pl-1 mt-0.5">
                <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-[#6366f1] flex-shrink-0" />
                <span className="text-[12px] text-text-secondary leading-relaxed">
                  <Hi text={b} />
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse pt-1">
      {[60, 80, 50, 72, 55].map((w, i) => (
        <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// ── Mini stats ───────────────────────────────────────────────────────────────────

interface MiniStats {
  active: number; atRisk: number; complete: number; totalProjects: number
  todo: number; inProgress: number; done: number; totalTasks: number
  cashflow: Array<{ w: number; v: number }>
}

// ── Mini visuals ─────────────────────────────────────────────────────────────────

function ProjectDonut({ active, atRisk, complete, total }: { active: number; atRisk: number; complete: number; total: number }) {
  const raw = [
    { v: active, color: '#22c55e' },
    { v: atRisk, color: '#ef4444' },
    { v: complete, color: '#6366f1' },
  ].filter(d => d.v > 0)
  const data = raw.length ? raw : [{ v: 1, color: '#3a3a3a' }]
  return (
    <div className="flex flex-col items-center gap-1">
      <PieChart width={44} height={44}>
        <Pie data={data} dataKey="v" cx={22} cy={22} innerRadius={12} outerRadius={19} strokeWidth={0}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
      </PieChart>
      <span className="text-[10px] text-text-secondary">{total} projects</span>
    </div>
  )
}

function CashflowSparkline({ data }: { data: Array<{ w: number; v: number }> }) {
  const filled = data.some(d => d.v > 0) ? data : [{ w: 1, v: 1 }, { w: 2, v: 2 }, { w: 3, v: 1.5 }, { w: 4, v: 2.5 }]
  return (
    <div className="flex flex-col items-center gap-1">
      <ResponsiveContainer width={80} height={26}>
        <AreaChart data={filled} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id="dbCashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={1.5} fill="url(#dbCashGrad)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <span className="text-[10px] text-text-secondary">Cashflow</span>
    </div>
  )
}

function TaskBars({ todo, inProgress, done, totalTasks }: Pick<MiniStats, 'todo' | 'inProgress' | 'done' | 'totalTasks'>) {
  const sum = todo + inProgress + done || 1
  const tw = Math.round((todo / sum) * 80)
  const iw = Math.round((inProgress / sum) * 80)
  const dw = 80 - tw - iw
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-1.5 rounded-full overflow-hidden" style={{ width: 80 }}>
        <div style={{ width: tw, background: '#3f3f46' }} />
        <div style={{ width: iw, background: '#6366f1' }} />
        <div style={{ width: dw, background: '#22c55e' }} />
      </div>
      <span className="text-[10px] text-text-secondary">{totalTasks} tasks</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────────

export default function DailyBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [stats, setStats] = useState<MiniStats | null>(null)

  useEffect(() => {
    void loadStats()
    const cached = localStorage.getItem(todayKey())
    if (cached) {
      try {
        const parsed: BriefingCache = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          setBriefing(parsed.briefing)
          setGeneratedAt(parsed.generatedAt)
          return
        }
      } catch {}
    }
    void generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStats() {
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
    const [{ data: ps }, { data: ts }, { data: cs }] = await Promise.all([
      supabase.from('projects').select('status'),
      supabase.from('tasks').select('status'),
      supabase.from('costs').select('amount, date').gte('date', fourWeeksAgo),
    ])
    const projects = ps || []
    const tasks = ts || []
    const costs = cs || []
    const now = Date.now()
    const cashflow = [3, 2, 1, 0].map(w => ({
      w: 4 - w,
      v: costs
        .filter(c => {
          const d = new Date(c.date).getTime()
          return d >= now - (w + 1) * 7 * 86400000 && d < now - w * 7 * 86400000
        })
        .reduce((s, c) => s + Number(c.amount), 0),
    }))
    setStats({
      active: projects.filter(p => p.status === 'active').length,
      atRisk: projects.filter(p => p.status === 'delayed').length,
      complete: projects.filter(p => p.status === 'completed').length,
      totalProjects: projects.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      totalTasks: tasks.length,
      cashflow,
    })
  }

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/daily-briefing', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate')
      setBriefing(json.briefing)
      setGeneratedAt(json.generatedAt)
      const cache: BriefingCache = { briefing: json.briefing, timestamp: Date.now(), generatedAt: json.generatedAt }
      localStorage.setItem(todayKey(), JSON.stringify(cache))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate briefing')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = () => {
    localStorage.removeItem(todayKey())
    void generate()
  }

  const sections = briefing ? parseBriefing(briefing) : []

  return (
    <div
      className="mb-6 rounded-2xl bg-surface"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(99,102,241,0.2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
            <Bot size={15} className="text-[#6366f1]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary leading-tight">
              {greeting()}, Daniel
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#6366f1]/10 text-[#6366f1] hover:bg-[#6366f1]/20 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      {/* Body — compact (clipped) or expanded */}
      <div
        className="border-t border-border overflow-hidden transition-[max-height] duration-300"
        style={{ maxHeight: expanded ? '600px' : '120px' }}
      >
        <div className="px-5 pt-3 pb-3 flex gap-5">
          {/* Text column */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <Skeleton />
            ) : error ? (
              <div className="flex items-center gap-3 py-1">
                <span className="text-[12px] text-danger flex-1">{error}</span>
                <button onClick={() => void generate()} className="text-[11px] text-[#6366f1] hover:underline flex-shrink-0">Retry</button>
              </div>
            ) : sections.length > 0 ? (
              <BriefingText sections={sections} compact={!expanded} />
            ) : (
              <p className="text-[12px] text-text-muted py-1">Click Regenerate to get your AI-powered daily briefing.</p>
            )}
          </div>

          {/* Mini visuals — hidden on mobile */}
          {stats && (
            <div className="hidden md:flex flex-col items-center gap-3 flex-shrink-0 pt-0.5" style={{ width: 88 }}>
              <ProjectDonut active={stats.active} atRisk={stats.atRisk} complete={stats.complete} total={stats.totalProjects} />
              <CashflowSparkline data={stats.cashflow} />
              <TaskBars todo={stats.todo} inProgress={stats.inProgress} done={stats.done} totalTasks={stats.totalTasks} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          {generatedAt && !loading ? `Updated ${formatTime(generatedAt)}` : loading ? 'Generating…' : ''}
        </span>
        {(briefing || !loading) && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[11px] font-medium text-[#6366f1] hover:underline disabled:opacity-30"
            disabled={!briefing}
          >
            {expanded ? 'Show less ↑' : 'Show full briefing ↓'}
          </button>
        )}
      </div>
    </div>
  )
}
