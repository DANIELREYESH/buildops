// SQL to run in Supabase:
// CREATE TABLE IF NOT EXISTS sub_contracts (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   contract_number TEXT,
//   subcontractor_name TEXT,
//   project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
//   trade TEXT,
//   contract_value NUMERIC,
//   start_date DATE,
//   end_date DATE,
//   payment_terms TEXT,
//   retention_percent NUMERIC DEFAULT 0,
//   description_of_works TEXT,
//   generated_contract_text TEXT,
//   status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','signed','expired')),
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE sub_contracts DISABLE ROW LEVEL SECURITY;
// GRANT ALL ON sub_contracts TO anon, authenticated, service_role;

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SYSTEM_PROMPT = `You are a UK construction contract specialist. Generate a complete, professional subcontractor agreement compliant with the UK Construction Act 1996 (as amended by LDEDCA 2009). Use the details provided. The contract must include:
1. Parties and recitals
2. Scope of works (detailed, based on description provided)
3. Contract sum and payment schedule
4. Retention terms
5. Variations procedure
6. Payment notices and pay less notices (Construction Act compliant)
7. Suspension rights
8. Adjudication clause (Scheme for Construction Contracts)
9. Practical completion and defects liability period (12 months)
10. Termination clauses
11. Insurance requirements (£2M public liability minimum)
12. Health & Safety obligations
13. Governing law: England and Wales
Format as a complete formal legal document with numbered clauses. Return as plain text, no markdown.`

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '[TBD]'

const fmtMoney = (n: number) =>
  `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      subcontractor_name, trade, project_name, project_id,
      contract_value, start_date, end_date,
      payment_terms, retention_percent,
      description_of_works, special_conditions,
    } = body

    if (!subcontractor_name || !description_of_works) {
      return NextResponse.json({ error: 'subcontractor_name and description_of_works are required' }, { status: 400 })
    }

    const userContent = `Generate a subcontractor agreement with these details:

Subcontractor: ${subcontractor_name}
Trade/Speciality: ${trade}
Project: ${project_name || 'As detailed below'}
Contract Value: ${fmtMoney(Number(contract_value) || 0)}
Start Date: ${fmtDate(start_date)}
Completion Date: ${fmtDate(end_date)}
Payment Terms: ${payment_terms}
Retention: ${retention_percent}%
Description of Works: ${description_of_works}${special_conditions ? `\nSpecial Conditions: ${special_conditions}` : ''}`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })

    const block = completion.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text response from AI')
    const contractText = block.text

    const { count } = await supabaseAdmin
      .from('sub_contracts')
      .select('*', { count: 'exact', head: true })

    const contractNumber = `SC-${String((count || 0) + 1).padStart(4, '0')}`

    const { data, error } = await supabaseAdmin.from('sub_contracts').insert({
      contract_number: contractNumber,
      subcontractor_name,
      project_id: project_id || null,
      trade,
      contract_value: Number(contract_value) || null,
      start_date: start_date || null,
      end_date: end_date || null,
      payment_terms,
      retention_percent: Number(retention_percent) || 0,
      description_of_works,
      generated_contract_text: contractText,
      status: 'draft',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ contract: data, contract_text: contractText })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
