import { NextResponse } from 'next/server'

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) return false
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    return res.status < 500
  } catch {
    return false
  }
}

async function checkAnthropic(): Promise<boolean> {
  const key = process.env.ANTHROPIC_API_KEY
  return Boolean(key && !key.includes('placeholder'))
}

async function checkStripe(): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY
  return Boolean(key && !key.includes('placeholder'))
}

export async function GET() {
  const [supabase, anthropic, stripe] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkStripe(),
  ])

  return NextResponse.json({ supabase, anthropic, stripe })
}
