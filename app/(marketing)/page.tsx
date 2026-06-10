import type { Metadata } from 'next'
import MarketingClient from './MarketingClient'

export const metadata: Metadata = {
  title: 'BuildOps — Construction Management Software',
  description: 'The AI-powered platform for UK contractors. Manage projects, subcontractors, compliance and cashflow in one place.',
}

export default function MarketingPage() {
  return <MarketingClient />
}
