// SQL: run in Supabase SQL editor to enable caching:
// CREATE TABLE IF NOT EXISTS daily_briefings (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   briefing_text TEXT,
//   generated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE daily_briefings DISABLE ROW LEVEL SECURITY;
// GRANT ALL ON daily_briefings TO anon, authenticated, service_role;

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
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString()

    const [
      { data: activeProjects },
      { data: overdueInvoices },
      { data: urgentTasks },
      { data: urgentCheckins },
      { data: upcomingPayments },
      { data: cashflow },
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('name, status, progress, budget, deadline, client_name').in('status', ['active', 'delayed']),
      supabaseAdmin.from('invoices').select('invoice_ref, client_name, total, due_date, status').or(`status.eq.overdue,and(due_date.lte.${in7Days},status.neq.paid)`).order('due_date'),
      supabaseAdmin.from('tasks').select('title, priority, due_date, assigned_to, status').or(`due_date.eq.${today},due_date.lt.${today}`).neq('status', 'done').order('due_date'),
      supabaseAdmin.from('ai_checkins').select('summary, sentiment, urgent, project_id').or('sentiment.eq.negative,urgent.eq.true').gte('created_at', yesterday).limit(5),
      supabaseAdmin.from('sub_payments').select('milestone, amount, due_date').neq('status', 'paid').lte('due_date', in7Days).order('due_date').limit(10),
      supabaseAdmin.from('ai_forecasts').select('overall_health, executive_summary, created_at').order('created_at', { ascending: false }).limit(1),
    ])

    let rtwExpiring: Array<{ worker_name: string; expiry_date: string }> | null = null
    try {
      const { data } = await supabaseAdmin
        .from('right_to_work_checks')
        .select('worker_name, expiry_date')
        .lte('expiry_date', in30Days)
        .gte('expiry_date', today)
        .eq('valid', true)
      rtwExpiring = data
    } catch {}

    const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`

    const context = `
Today: ${today}

ACTIVE/DELAYED PROJECTS (${(activeProjects || []).length}):
${(activeProjects || []).map(p => `- ${p.name} [${p.status}] ${p.progress}% complete${p.deadline ? `, deadline ${p.deadline}${p.deadline < today ? ' OVERDUE' : ''}` : ''}${p.client_name ? `, client: ${p.client_name}` : ''}`).join('\n') || '(none)'}

OVERDUE/UPCOMING INVOICES:
${(overdueInvoices || []).map(i => `- ${i.invoice_ref || 'No ref'} ${i.client_name} ${fmt(i.total)} [${i.status}]${i.due_date ? ` due ${i.due_date}` : ''}`).join('\n') || '(none)'}

TODAY/OVERDUE TASKS:
${(urgentTasks || []).map(t => `- [${t.priority}] ${t.title} due ${t.due_date || '?'}${t.assigned_to ? ` — ${t.assigned_to}` : ''}`).join('\n') || '(none)'}

NEGATIVE/URGENT CHECK-INS (last 24h):
${(urgentCheckins || []).map(c => `- ${c.sentiment} ${c.urgent ? '(URGENT)' : ''}: ${c.summary || 'No summary'}`).join('\n') || '(none)'}

SUB PAYMENTS DUE WITHIN 7 DAYS:
${(upcomingPayments || []).map(p => `- ${p.milestone} ${fmt(p.amount)} due ${p.due_date}`).join('\n') || '(none)'}

RIGHT TO WORK EXPIRING (30 days):
${(rtwExpiring || []).map(r => `- ${r.worker_name} expires ${r.expiry_date}`).join('\n') || 'All clear'}

LATEST AI FORECAST:
${(cashflow && cashflow[0]) ? `Overall health: ${cashflow[0].overall_health}. ${cashflow[0].executive_summary || ''}` : '(no forecast available)'}
`

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `You are BuildOps AI generating a daily morning briefing for a UK construction business owner/manager. Based on the data provided, write a concise, intelligent daily briefing.

Format your response EXACTLY like this (use these exact header names):

**Today's Priority**
One sentence — the single most important thing they need to deal with today.

**Projects**
- Bullet point about project status/risk/win (specific names and numbers)
- Bullet point 2
- Bullet point 3

**Finance**
- Bullet point about invoices/cashflow/payments (specific amounts)
- Bullet point 2

**Compliance**
- Bullet point about Right to Work, contract expiries, safety flags (if all clear say so briefly)

**Quick Wins**
- Small action they can do in under 5 minutes
- Small action 2
- Small action 3

IMPORTANT: Keep the entire briefing under 120 words total. Maximum 1 sentence per bullet point. Today's Priority: 1 sentence. Projects: max 2 bullets. Finance: max 2 bullets. Compliance: max 1 bullet. Quick Wins: max 2 bullets. Be brutally concise.

Be specific, not generic. Use real names and numbers. Sound like a sharp EA who knows the business inside out.`,
      messages: [{ role: 'user', content: `Generate my morning briefing:\n${context}` }],
    })

    const briefingText = (msg.content[0] as { type: string; text: string }).text.trim()

    // Persist to Supabase (best effort — table may not exist yet)
    supabaseAdmin.from('daily_briefings').insert({ briefing_text: briefingText }).then(() => {})

    return NextResponse.json({ briefing: briefingText, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('daily-briefing error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
