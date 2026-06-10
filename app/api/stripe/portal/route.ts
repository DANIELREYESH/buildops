import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'placeholder_stripe_key', {
  apiVersion: '2026-05-27.dahlia' as never,
})

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json()
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/users`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
