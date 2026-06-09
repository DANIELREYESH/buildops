import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type LineItem = { description: string; qty: number; unit: string; unit_price: number }

export async function POST(req: NextRequest) {
  try {
    const { job_type, description, location, budget_estimate } = await req.json()

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are a UK construction estimator with 20 years of experience. Generate realistic, detailed quote line items for building and construction work.

Respond with ONLY a JSON object:
{
  "line_items": [
    { "description": "string", "qty": number, "unit": "string", "unit_price": number }
  ],
  "notes": "string (payment terms, assumptions, exclusions — 2-3 sentences max)"
}

Rules:
- Use current UK market rates (2025/2026)
- unit must be one of: "day", "m2", "m", "item", "hr", "no."
- unit_price must be a realistic UK rate (e.g. carpenter £220/day, plaster £18/m2)
- Include 3-8 line items that make sense for the job
- If a budget is given, scale the items to fit within it (before 20% VAT)
- Notes must mention VAT, payment terms (e.g. 30% deposit), and any key exclusions`,
      messages: [{
        role: 'user',
        content: `Generate a quote for this construction job:
Job type: ${job_type || 'General building works'}
Description: ${description || 'No description provided'}
Location: ${location || 'UK'}
Client budget estimate: ${budget_estimate ? `£${budget_estimate}` : 'Not specified'}`,
      }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    let result: { line_items: LineItem[]; notes: string }

    try {
      const match = raw.match(/\{[\s\S]*\}/)
      result = JSON.parse(match ? match[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
    }

    if (!Array.isArray(result.line_items) || result.line_items.length === 0) {
      return NextResponse.json({ error: 'No line items generated' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, line_items: result.line_items, notes: result.notes || '' })
  } catch (err) {
    console.error('ai-quote error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
