// SQL — run once in Supabase SQL editor:
// CREATE TABLE IF NOT EXISTS right_to_work_checks (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   worker_name TEXT,
//   nationality TEXT,
//   document_type TEXT,
//   share_code TEXT,
//   expiry_date DATE,
//   valid BOOLEAN,
//   confidence TEXT,
//   right_to_work_status TEXT,
//   time_limited_until DATE,
//   restrictions TEXT[] DEFAULT '{}',
//   flags TEXT[] DEFAULT '{}',
//   recommendation TEXT,
//   follow_up_required BOOLEAN DEFAULT false,
//   follow_up_reason TEXT,
//   checked_by TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE right_to_work_checks DISABLE ROW LEVEL SECURITY;
// GRANT ALL ON right_to_work_checks TO anon, authenticated, service_role;

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a UK Right to Work compliance specialist. Analyze this identity document image and the provided worker details. Return JSON with:
- valid: boolean
- confidence: 'high' | 'medium' | 'low'
- document_type_detected: string
- expiry_date_detected: string | null
- name_detected: string | null
- right_to_work_status: 'unlimited' | 'time_limited' | 'cannot_work' | 'manual_check_required'
- time_limited_until: string | null
- restrictions: string[]
- flags: string[]
- recommendation: string
- follow_up_required: boolean
- follow_up_reason: string | null
If no image provided or image is unclear, return manual_check_required with appropriate flags.`

function parseResult(text: string) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON in response')
  const raw = JSON.parse(match[0])
  return {
    valid: Boolean(raw.valid),
    confidence: (['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'low') as 'high' | 'medium' | 'low',
    document_type_detected: String(raw.document_type_detected || 'Unknown'),
    expiry_date_detected: raw.expiry_date_detected ?? null,
    name_detected: raw.name_detected ?? null,
    right_to_work_status: (
      ['unlimited', 'time_limited', 'cannot_work', 'manual_check_required'].includes(raw.right_to_work_status)
        ? raw.right_to_work_status
        : 'manual_check_required'
    ) as 'unlimited' | 'time_limited' | 'cannot_work' | 'manual_check_required',
    time_limited_until: raw.time_limited_until ?? null,
    restrictions: Array.isArray(raw.restrictions) ? raw.restrictions.map(String) : [],
    flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
    recommendation: String(raw.recommendation || 'No recommendation provided'),
    follow_up_required: Boolean(raw.follow_up_required),
    follow_up_reason: raw.follow_up_reason ?? null,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workerName, nationality, documentType, shareCode, expiryDate, imageBase64, imageMediaType, notes } = body

    const userText = `Worker name: ${workerName}
Nationality category: ${nationality}
Document type: ${documentType}${shareCode ? `\nShare code: ${shareCode}` : ''}${expiryDate ? `\nDocument expiry date: ${expiryDate}` : ''}${notes ? `\nAdditional notes: ${notes}` : ''}

Please analyze the document image (if provided) and provide a full UK Right to Work assessment.`

    const content: Anthropic.ContentBlockParam[] = []

    if (imageBase64 && imageMediaType && !imageMediaType.includes('pdf')) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: imageBase64,
        },
      })
      content.push({ type: 'text', text: userText })
    } else {
      const note = imageMediaType?.includes('pdf')
        ? '\n\nNote: A PDF document was uploaded but cannot be analyzed visually. Flag for manual verification.'
        : '\n\nNote: No document image provided. Base assessment on document details and flag for manual verification.'
      content.push({ type: 'text', text: userText + note })
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const block = response.content.find(b => b.type === 'text')
    if (!block || block.type !== 'text') throw new Error('No text in response')

    const result = parseResult(block.text)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
