import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'placeholder' })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image_base64, media_type } = body as { image_base64: string; media_type: string }

    if (!image_base64) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a UK construction receipt and invoice scanner. Extract data from supplier delivery tickets, receipts, and invoices.

Always respond with ONLY a JSON object — no prose, no markdown fences:
{
  "supplier": "supplier name exactly as shown",
  "amount_ex_vat": "numeric string e.g. 340.80",
  "vat": "numeric string e.g. 68.16",
  "total": "numeric string e.g. 408.96",
  "date": "YYYY-MM-DD",
  "category": "materials|labour|equipment|other",
  "description": "brief one-line description of what was purchased"
}

Rules:
- If VAT is not shown, calculate 20% of amount_ex_vat
- If only a total is shown (no ex-VAT breakdown), work backwards: amount_ex_vat = total / 1.20, vat = total - amount_ex_vat
- category: materials for building/plumbing/electrical supplies; equipment for hire/plant; labour for labour-only invoices; other otherwise
- date: use today's date if not visible (respond with empty string "")
- All numeric fields must be strings with 2 decimal places
- supplier: if not readable, use "Unknown Supplier"`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: (media_type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: image_base64 },
          },
          { type: 'text', text: 'Extract all receipt/invoice data from this image. Return only the JSON object.' },
        ],
      }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    let result
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('scan-ticket error', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
