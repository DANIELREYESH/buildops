import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type Msg = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: Msg[] }
    const today = new Date().toISOString().split('T')[0]

    const [
      { data: projects },
      { data: invoices },
      { data: tasks },
      { data: checkins },
      { data: contracts },
    ] = await Promise.all([
      supabaseAdmin.from('projects').select('id, name, status, budget, progress, deadline, client_name'),
      supabaseAdmin.from('invoices').select('id, status, total, due_date, client_name, invoice_ref'),
      supabaseAdmin.from('tasks').select('id, title, status, due_date, priority').neq('status', 'done').limit(20),
      supabaseAdmin.from('ai_checkins').select('summary, sentiment, urgent, created_at').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('sub_contracts').select('subcontractor_name, status, contract_value, trade').limit(20),
    ])

    let rtwChecks: Array<{ worker_name: string; right_to_work_status: string; expiry_date: string | null }> | null = null
    try {
      const { data } = await supabaseAdmin.from('right_to_work_checks').select('worker_name, right_to_work_status, expiry_date').limit(20)
      rtwChecks = data
    } catch {}

    const fmtList = <T extends Record<string, unknown>>(arr: T[] | null, fn: (item: T) => string) =>
      arr?.length ? arr.map(fn).join('\n') : '(none)'

    const context = `
PROJECTS (${(projects || []).length}):
${fmtList(projects, p => `- ${p.name} [${p.status}] ${p.progress}% complete${p.budget ? `, budget £${Number(p.budget).toLocaleString()}` : ''}${p.deadline ? `, deadline ${p.deadline}` : ''}${p.client_name ? `, client: ${p.client_name}` : ''} (id:${p.id})`)}

INVOICES:
${fmtList(invoices, i => `- ${i.invoice_ref || 'No ref'} ${i.client_name} £${Number(i.total).toLocaleString()} [${i.status}]${i.due_date ? ` due ${i.due_date}${i.due_date < today ? ' OVERDUE' : ''}` : ''}`)}

OPEN TASKS:
${fmtList(tasks, t => `- [${t.priority}] ${t.title} [${t.status}]${t.due_date ? ` due ${t.due_date}${t.due_date < today ? ' OVERDUE' : ''}` : ''}`)}

RECENT AI CHECK-INS:
${fmtList(checkins, c => `- ${c.sentiment} sentiment${c.urgent ? ' URGENT' : ''}: ${c.summary || 'No summary'}`)}

RIGHT TO WORK RECORDS:
${fmtList(rtwChecks, r => `- ${r.worker_name}: ${r.right_to_work_status}${r.expiry_date ? ` expires ${r.expiry_date}` : ''}`)}

SUB-CONTRACTS:
${fmtList(contracts, c => `- ${c.subcontractor_name || 'Unknown'} (${c.trade || '?'}): ${c.status}, ${c.contract_value ? `£${Number(c.contract_value).toLocaleString()}` : 'no value'}`)}

Today: ${today}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `Your name is Aria. You are a sharp, personal assistant to a UK construction business owner, embedded in the BuildOps platform. You have access to real-time data from their projects, invoices, tasks, subcontractors, and compliance records.

Your personality: direct, warm, and precise. You speak like a trusted EA who knows the business inside out — construction-savvy, finance-aware, compliance-conscious. No waffle, no filler. Get to the point.

When asked about data: answer specifically using the real data provided. When asked to generate something (contract, invoice, letter): produce it immediately. When asked for advice: give it concisely with specific action items.

Current platform data:
${context}

Always respond in plain text. Use line breaks for structure. Keep responses under 200 words unless generating a document. If generating a contract or formal document, you can be longer.

For project risk queries: mention specific project names with the issue. For compliance: reference specific worker names and expiry dates. For cashflow/finance: use real invoice amounts and due dates.`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('ai-assistant error', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
