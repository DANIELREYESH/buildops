import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SYSTEM_PROMPT = `You are an AI financial and operations analyst for a UK construction company called BuildOps. You are given a compiled snapshot of the company's active projects — including budgets, costs logged to date, progress percentages, deadlines, task completion and timesheet hours — and must produce a portfolio-wide forecast.

Return a structured JSON object with exactly these fields:
- "overall_health": one of "on_track", "at_risk", "critical" — the overall state of the portfolio
- "projects": an array of objects, one per project provided, each with:
  - "project_id": the project's id, copied verbatim from the input
  - "name": the project's name
  - "health": one of "on_track", "at_risk", "critical"
  - "projected_margin": a number (percentage, can be negative) estimating final profit margin based on spend rate vs budget and progress
  - "projected_completion": an ISO date string (YYYY-MM-DD) estimating the completion date based on progress rate and deadline
  - "summary": a one-sentence assessment of this project's trajectory
- "executive_summary": a 2-3 sentence plain-English summary of the overall portfolio health for a business owner
- "top_3_risks": an array of up to 3 short strings naming the most pressing risks across the portfolio (can be fewer than 3 if there isn't enough signal)

Base your numbers on the data provided — extrapolate sensibly from burn rate (spend ÷ progress) and progress rate (progress ÷ days elapsed). Be direct and specific; do not hedge unnecessarily. Respond with ONLY the JSON object, no other text.`

type ProjectSnapshot = {
  id: string
  name: string
  client_name: string | null
  status: string
  budget: number | null
  deadline: string | null
  progress: number
  created_at: string
  spent: number
  task_total: number
  task_done: number
  timesheet_hours: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const force = body?.force === true

    if (!force) {
      const { data: cached } = await supabaseAdmin
        .from('ai_forecasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached && Date.now() - new Date(cached.created_at).getTime() < 1000 * 60 * 60 * 6) {
        return NextResponse.json({ forecast: cached, cached: true })
      }
    }

    const [{ data: projects }, { data: costs }, { data: tasks }, { data: timesheets }] = await Promise.all([
      supabaseAdmin.from('projects').select('*').in('status', ['active', 'delayed']),
      supabaseAdmin.from('costs').select('project_id, amount'),
      supabaseAdmin.from('tasks').select('project_id, status'),
      supabaseAdmin.from('timesheets').select('project_id, hours'),
    ])

    const ps = projects || []
    if (ps.length === 0) {
      return NextResponse.json({ error: 'No active projects to forecast' }, { status: 400 })
    }

    const spentMap: Record<string, number> = {}
    ;(costs || []).forEach((c: { project_id: string | null; amount: number }) => {
      if (c.project_id) spentMap[c.project_id] = (spentMap[c.project_id] || 0) + c.amount
    })
    const taskMap: Record<string, { total: number; done: number }> = {}
    ;(tasks || []).forEach((t: { project_id: string | null; status: string }) => {
      if (!t.project_id) return
      taskMap[t.project_id] ||= { total: 0, done: 0 }
      taskMap[t.project_id].total++
      if (t.status === 'done') taskMap[t.project_id].done++
    })
    const hoursMap: Record<string, number> = {}
    ;(timesheets || []).forEach((t: { project_id: string | null; hours: number | null }) => {
      if (t.project_id) hoursMap[t.project_id] = (hoursMap[t.project_id] || 0) + (t.hours || 0)
    })

    const snapshot: ProjectSnapshot[] = ps.map(p => ({
      id: p.id, name: p.name, client_name: p.client_name, status: p.status,
      budget: p.budget, deadline: p.deadline, progress: p.progress, created_at: p.created_at,
      spent: Math.round((spentMap[p.id] || 0) * 100) / 100,
      task_total: taskMap[p.id]?.total || 0,
      task_done: taskMap[p.id]?.done || 0,
      timesheet_hours: Math.round((hoursMap[p.id] || 0) * 10) / 10,
    }))

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Today's date: ${new Date().toISOString().split('T')[0]}\n\nActive project snapshot (JSON):\n${JSON.stringify(snapshot, null, 2)}`,
      }],
    })

    const block = completion.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from AI')
    const match = block.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object found in AI response')
    const parsed = JSON.parse(match[0])

    const forecast = {
      overall_health: String(parsed.overall_health || 'at_risk'),
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      executive_summary: String(parsed.executive_summary || ''),
      top_3_risks: Array.isArray(parsed.top_3_risks) ? parsed.top_3_risks.map(String) : [],
      raw_response: parsed,
    }

    const { data, error } = await supabaseAdmin.from('ai_forecasts').insert(forecast).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ forecast: data, cached: false })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
