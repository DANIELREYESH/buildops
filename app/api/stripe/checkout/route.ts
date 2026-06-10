import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'placeholder_stripe_key', {
  apiVersion: '2026-05-27.dahlia' as never,
})

export async function POST(req: Request) {
  try {
    const { plan, email } = await req.json()
    const priceId = plan === 'pro'
      ? process.env.STRIPE_PRO_PRICE_ID!
      : process.env.STRIPE_STARTER_PRICE_ID!

    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/users?upgraded=1`,
      cancel_url: `${origin}/users`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
