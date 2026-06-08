import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SYSTEM_PROMPT = `You are an AI site manager assistant for a UK construction company called BuildOps. You analyse end-of-day check-in messages submitted by tradespeople and subcontractors on site.

Given a worker's check-in message, return a structured analysis as JSON with exactly these fields:
- "summary": a one or two sentence plain-English summary of what the worker reported
- "risks": an array of short strings describing any risks, delays, or concerns raised (empty array if none)
- "action_items": an array of short strings describing concrete follow-up actions the project manager should take (empty array if none)
- "sentiment": one of "positive", "neutral", or "negative" — the overall tone/outlook of the report
- "safety_flags": an array of short strings describing any health & safety concerns mentioned (empty array if none)

Be concise and practical. Write for a busy site manager who needs to scan this in seconds. Only flag genuine risks or safety issues — do not invent concerns that aren't supported by the message.

Respond with ONLY the JSON object, no other text.`

type CheckinAnalysis = {
  summary: string
  risks: string[]
  action_items: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  safety_flags: string[]
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
  }
}

export async function POST(req: Request) {
  try {
    const { checkin_id, project_id, worker_name, message } = await req.json()
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Worker: ${worker_name || 'Unknown'}\n\nCheck-in message:\n"""\n${message}\n"""`,
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
      raw_response: analysis,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ analysis, record: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
