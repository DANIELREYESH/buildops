// SQL to run in Supabase before using new fields:
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS patterns TEXT[] DEFAULT '{}';
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS productivity_score INTEGER;
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS predicted_delay_days INTEGER DEFAULT 0;
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS materials_mentioned TEXT[] DEFAULT '{}';
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT false;
// ALTER TABLE ai_checkins ADD COLUMN IF NOT EXISTS weather_impact TEXT;

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SYSTEM_PROMPT = `You are an AI construction site intelligence engine. Analyze this check-in AND the historical check-ins provided for this project. Return JSON with:
- summary: string (2 sentences)
- risks: string[]
- action_items: string[]
- sentiment: "positive" | "neutral" | "negative"
- safety_flags: string[]
- patterns: string[] (recurring issues detected across check-ins, empty array if first check-in)
- weather_impact: string | null
- productivity_score: number 1-10
- predicted_delay_days: number (0 if no delay predicted)
- materials_mentioned: string[]
- urgent: boolean (true if immediate action needed)

Respond with ONLY the JSON object, no other text.`

type CheckinAnalysis = {
  summary: string
  risks: string[]
  action_items: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  safety_flags: string[]
  patterns: string[]
  weather_impact: string | null
  productivity_score: number
  predicted_delay_days: number
  materials_mentioned: string[]
  urgent: boolean
}

function parseAnalysis(text: string): CheckinAnalysis {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in AI response')
  const parsed = JSON.parse(match[0])
  return {
    summary: String(parsed.summary || ''),
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items.map(String) : [],
    sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
    safety_flags: Array.isArray(parsed.safety_flags) ? parsed.safety_flags.map(String) : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map(String) : [],
    weather_impact: parsed.weather_impact ? String(parsed.weather_impact) : null,
    productivity_score: typeof parsed.productivity_score === 'number'
      ? Math.min(10, Math.max(1, Math.round(parsed.productivity_score))) : 5,
    predicted_delay_days: typeof parsed.predicted_delay_days === 'number'
      ? Math.max(0, Math.round(parsed.predicted_delay_days)) : 0,
    materials_mentioned: Array.isArray(parsed.materials_mentioned) ? parsed.materials_mentioned.map(String) : [],
    urgent: Boolean(parsed.urgent),
  }
}

export async function POST(req: Request) {
  try {
    const { checkin_id, project_id, worker_name, message } = await req.json()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    // Fetch last 10 historical analyses for this project
    let historyText = 'No previous check-ins for this project.'
    if (project_id) {
      const { data: history } = await supabaseAdmin
        .from('ai_checkins')
        .select('summary, risks, patterns, productivity_score, created_at')
        .eq('project_id', project_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (history && history.length > 0) {
        historyText = 'Historical check-ins for this project (most recent first):\n' +
          (history as Array<{ summary: string; risks: string[]; patterns: string[]; productivity_score: number; created_at: string }>)
            .map((h, i) =>
              `[${i + 1}] ${new Date(h.created_at).toLocaleDateString('en-GB')}: ${h.summary} | Risks: ${(h.risks || []).join(', ') || 'none'} | Productivity: ${h.productivity_score || 'N/A'}/10`
            ).join('\n')
      }
    }

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Worker: ${worker_name || 'Unknown'}\n\nToday's check-in:\n"""\n${message}\n"""\n\n${historyText}`,
      }],
    })

    const block = completion.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from AI')
    const analysis = parseAnalysis(block.text)

    const { data, error } = await supabaseAdmin.from('ai_checkins').insert({
      checkin_id: checkin_id || null,
      project_id: project_id || null,
      summary: analysis.summary,
      risks: analysis.risks,
      action_items: analysis.action_items,
      sentiment: analysis.sentiment,
      safety_flags: analysis.safety_flags,
      patterns: analysis.patterns,
      weather_impact: analysis.weather_impact,
      productivity_score: analysis.productivity_score,
      predicted_delay_days: analysis.predicted_delay_days,
      materials_mentioned: analysis.materials_mentioned,
      urgent: analysis.urgent,
      raw_response: analysis,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ analysis, record: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
