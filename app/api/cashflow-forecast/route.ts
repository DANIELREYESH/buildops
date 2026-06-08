import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a construction business cashflow analyst. Based on the financial data provided, generate a 90-day cashflow forecast. Return JSON with:
- current_balance_estimate: number
- forecast_periods: array of 13 weekly objects, each with:
  week_label (e.g. "Week 1 — 9 Jun"),
  money_in: number,
  money_out: number,
  net: number,
  cumulative_balance: number,
  confidence: "high" | "medium" | "low"
- traffic_light: "green" | "amber" | "red"
- traffic_light_reason: string
- key_risks: string[] (max 3)
- recommendations: string[] (max 3)
- break_even_week: number | null (which week balance goes negative, null if never)

Respond with ONLY the JSON object, no other text.`

type ForecastPeriod = {
  week_label: string
  money_in: number
  money_out: number
  net: number
  cumulative_balance: number
  confidence: 'high' | 'medium' | 'low'
}

type ForecastResult = {
  current_balance_estimate: number
  forecast_periods: ForecastPeriod[]
  traffic_light: 'green' | 'amber' | 'red'
  traffic_light_reason: string
  key_risks: string[]
  recommendations: string[]
  break_even_week: number | null
}

function parseForecast(text: string): ForecastResult {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in AI response')
  const p = JSON.parse(match[0])
  return {
    current_balance_estimate: Number(p.current_balance_estimate) || 0,
    forecast_periods: Array.isArray(p.forecast_periods) ? p.forecast_periods.map((w: ForecastPeriod) => ({
      week_label: String(w.week_label || ''),
      money_in: Number(w.money_in) || 0,
      money_out: Number(w.money_out) || 0,
      net: Number(w.net) || 0,
      cumulative_balance: Number(w.cumulative_balance) || 0,
      confidence: ['high', 'medium', 'low'].includes(w.confidence) ? w.confidence : 'medium',
    })) : [],
    traffic_light: ['green', 'amber', 'red'].includes(p.traffic_light) ? p.traffic_light : 'amber',
    traffic_light_reason: String(p.traffic_light_reason || ''),
    key_risks: Array.isArray(p.key_risks) ? p.key_risks.map(String) : [],
    recommendations: Array.isArray(p.recommendations) ? p.recommendations.map(String) : [],
    break_even_week: p.break_even_week !== null && p.break_even_week !== undefined ? Number(p.break_even_week) : null,
  }
}

export async function POST(req: Request) {
  try {
    const { financialSummary, currentDate } = await req.json()
    if (!financialSummary) return NextResponse.json({ error: 'financialSummary required' }, { status: 400 })

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Current date: ${currentDate || new Date().toLocaleDateString('en-GB')}\n\n${financialSummary}`,
      }],
    })

    const block = completion.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from AI')
    const forecast = parseForecast(block.text)

    return NextResponse.json(forecast)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
