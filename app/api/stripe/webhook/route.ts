import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'placeholder_stripe_key', {
  apiVersion: '2026-05-27.dahlia' as never,
})
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-service-role-key',
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
    if (customer.email) {
      await supabaseAdmin
        .from('team_members')
        .update({ stripe_subscription_id: sub.id, plan: sub.status === 'active' ? 'pro' : 'free' })
        .eq('email', customer.email)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
    if (customer.email) {
      await supabaseAdmin
        .from('team_members')
        .update({ plan: 'free' })
        .eq('email', customer.email)
    }
  }

  return NextResponse.json({ received: true })
}
