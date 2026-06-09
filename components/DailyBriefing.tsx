'use client'

import { useState, useEffect } from 'react'
import { Bot, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'

interface BriefingCache {
  briefing: string
  timestamp: number
  generatedAt: string
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000
const CACHE_KEY_PREFIX = 'buildops_briefing_'

function todayKey() {
  return CACHE_KEY_PREFIX + new Date().toISOString().split('T')[0]
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(isoStr: string) {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function BriefingContent({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isHeader = /^\*\*(.+)\*\*\s*$/.test(line)
        const bulletMatch = line.match(/^-\s+(.+)/)

        if (!line.trim()) return <div key={i} className="h-1.5" />

        if (isHeader) {
          const label = line.replace(/\*\*/g, '').trim()
          const isTodayPriority = label.toLowerCase().includes('priority')
          return (
            <div
              key={i}
              className={`mt-3 mb-1 ${isTodayPriority ? 'pl-3 border-l-2 border-[#6366f1]' : ''}`}
            >
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#f0f0f0]">
                {label}
              </span>
            </div>
          )
        }

        if (bulletMatch) {
          const content = bulletMatch[1]
          const parts = content.split(/(£[\d,]+(?:\.\d{2})?)/g)
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#22c55e] flex-shrink-0" />
              <span className="text-[12px] text-[#888] leading-relaxed">
                {parts.map((p, pi) =>
                  p.startsWith('£') ? (
                    <span key={pi} className="text-[#6366f1] font-medium">{p}</span>
                  ) : p
                )}
              </span>
            </div>
          )
        }

        const parts = line.split(/(£[\d,]+(?:\.\d{2})?)/g)
        return (
          <p key={i} className="text-[12px] text-[#888] leading-relaxed">
            {parts.map((p, pi) =>
              p.startsWith('£') ? (
                <span key={pi} className="text-[#6366f1] font-medium">{p}</span>
              ) : p
            )}
          </p>
        )
      })}
    </div>
  )
}

function BriefingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[70, 90, 55, 80, 65].map((w, i) => (
        <div key={i} className="h-2.5 rounded-full bg-[#1f1f1f]" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

export default function DailyBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const generate = async () => {
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
    generate()
  }

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0d0d18 0%, #111111 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
            <Bot size={15} className="text-[#6366f1]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {greeting()}, Daniel
            </div>
            <div className="text-[10px] text-[#444]">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#6366f1]/10 text-[#6366f1] hover:bg-[#6366f1]/20 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Generating…' : 'Regenerate'}
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-[#52525b] hover:text-white transition-colors p-1"
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-5 pb-5">
          <div className="border-t border-[#1f1f1f] pt-4">
            {loading ? (
              <BriefingSkeleton />
            ) : error ? (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#ef4444]">{error}</span>
                <button
                  onClick={generate}
                  className="text-[11px] text-[#6366f1] hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : briefing ? (
              <>
                <BriefingContent text={briefing} />
                {generatedAt && (
                  <div className="mt-4 text-right text-[10px] text-[#444]">
                    Last updated {formatTime(generatedAt)}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-[12px] text-[#444]">
                  Click Regenerate to get your AI-powered daily briefing.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
