import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: projects },
      { data: tasks },
      { data: payments },
      { data: checkins },
      { data: costs },
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('name, status, progress, budget, deadline, client_name').order('created_at', { ascending: false }),
      supabaseAdmin.from('tasks').select('title, status, priority, due_date, assigned_to').neq('status', 'done').order('due_date', { ascending: true }).limit(20),
      supabaseAdmin.from('sub_payments').select('milestone, amount, status, due_date').neq('status', 'paid').order('due_date', { ascending: true }).limit(20),
      supabaseAdmin.from('checkins').select('worker_name, message, issue_flagged, checkin_date, issue_description').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('costs').select('amount, category, supplier, date').gte('date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]).order('date', { ascending: false }),
    ])

    const overdueTasks = (tasks || []).filter(t => t.due_date && t.due_date < today)
    const overduePayments = (payments || []).filter(p => p.due_date && p.due_date < today)
    const flaggedCheckins = (checkins || []).filter(c => c.issue_flagged)
    const activeProjects = (projects || []).filter(p => p.status === 'active' || p.status === 'delayed')
    const recentSpend = (costs || []).reduce((s: number, c: { amount: number }) => s + c.amount, 0)

    const context = `
Today is ${today}.

PORTFOLIO SUMMARY:
- Active/delayed projects: ${activeProjects.length}
${activeProjects.slice(0, 5).map((p: { name: string; status: string; progress: number; deadline?: string; client_name?: string }) => `  • ${p.name} (${p.status}) — ${p.progress}% complete${p.deadline ? `, deadline ${p.deadline}` : ''}, client: ${p.client_name || 'unknown'}`).join('\n')}

TASKS:
- Overdue tasks: ${overdueTasks.length}
${overdueTasks.slice(0, 5).map((t: { title: string; priority: string; due_date: string }) => `  • [${t.priority.toUpperCase()}] ${t.title} — due ${t.due_date}`).join('\n')}
- Urgent/high tasks due soon: ${(tasks || []).filter((t: { priority: string }) => t.priority === 'urgent' || t.priority === 'high').length}

PAYMENTS:
- Overdue subcontractor payments: ${overduePayments.length}
- Total overdue: £${overduePayments.reduce((s: number, p: { amount: number }) => s + p.amount, 0).toLocaleString('en-GB')}
${overduePayments.slice(0, 3).map((p: { milestone: string; amount: number; due_date: string }) => `  • ${p.milestone} — £${p.amount.toLocaleString('en-GB')} due ${p.due_date}`).join('\n')}

SITE CHECK-INS (last 10):
- Flagged issues: ${flaggedCheckins.length}
${flaggedCheckins.slice(0, 3).map((c: { worker_name: string; issue_description?: string }) => `  • ${c.worker_name}: ${c.issue_description || 'Issue flagged'}`).join('\n')}

COSTS (last 7 days):
- Total spend: £${recentSpend.toLocaleString('en-GB')}
`

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are an AI assistant for a UK construction management company. Generate a concise morning briefing for the site manager.

Format: 3-4 short paragraphs, no bullet points, no markdown. Plain prose. Be direct and action-oriented. Mention specific numbers and names from the data. If everything looks fine, say so briefly. Highlight the most critical items first. End with one clear priority action for today.`,
      messages: [{ role: 'user', content: `Generate my morning briefing based on this data:\n${context}` }],
    })

    const briefing = (msg.content[0] as { type: string; text: string }).text.trim()

    return NextResponse.json({
      briefing,
      stats: {
        activeProjects: activeProjects.length,
        overdueTasks: overdueTasks.length,
        overduePayments: overduePayments.length,
        flaggedCheckins: flaggedCheckins.length,
        weeklySpend: recentSpend,
      },
    })
  } catch (err) {
    console.error('ai-briefing error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
