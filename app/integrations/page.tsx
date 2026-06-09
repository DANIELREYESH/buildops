'use client'

import { useState } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { useToast } from '@/lib/toast'

type IntegrationStatus = 'connected' | 'not_connected' | 'coming_soon'

type Integration = {
  id: string
  name: string
  description: string
  status: IntegrationStatus
  category: string
  logo: React.ReactNode
  inputLabel?: string
  inputPlaceholder?: string
  inputType?: string
}

function LogoTeams() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#6264A7] flex items-center justify-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M20 4H10a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1z" fill="white" fillOpacity=".9"/>
        <path d="M6 8H4a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="15" cy="17" r="3" fill="white" fillOpacity=".7"/>
        <circle cx="7" cy="17" r="3" stroke="white" strokeWidth="1.5"/>
      </svg>
    </div>
  )
}
function LogoMeet() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00AC47] to-[#0066DA] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M15 10l4.55-2.27A1 1 0 0121 8.64v6.72a1 1 0 01-1.45.91L15 14" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="7" width="12" height="10" rx="2" stroke="white" strokeWidth="1.8"/>
      </svg>
    </div>
  )
}
function LogoXLS() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#1D6F42] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="2" fill="white" fillOpacity=".15"/>
        <line x1="7" y1="7" x2="17" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17" y1="7" x2="7" y2="17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="3" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5" strokeOpacity=".5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
function LogoHubSpot() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#FF7A59] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="white"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
function LogoXero() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#13B5EA] flex items-center justify-center">
      <span className="text-white font-black text-xs">X</span>
    </div>
  )
}
function LogoWhatsApp() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}
function LogoZapier() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[#FF4A00] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6.5L11 22l8.91-10.96A1 1 0 0019 9.5H12.5L13 2z" fill="white"/>
      </svg>
    </div>
  )
}

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [values, setValues] = useState<Record<string, string>>({})
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<string | null>(null)

  const INTEGRATIONS: Integration[] = [
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Send project updates, cost alerts and check-in notifications directly to your Teams channels.',
      status: connected.has('teams') ? 'connected' : 'not_connected',
      category: 'Communication',
      logo: <LogoTeams />,
      inputLabel: 'Incoming Webhook URL',
      inputPlaceholder: 'https://your-org.webhook.office.com/webhookb2/...',
    },
    {
      id: 'meet',
      name: 'Google Meet',
      description: 'Schedule site review calls directly from project pages with auto-generated Meet links.',
      status: 'coming_soon',
      category: 'Communication',
      logo: <LogoMeet />,
    },
    {
      id: 'excel',
      name: 'Excel / Google Sheets',
      description: 'Export any table (costs, timesheets, projects, contracts) to .xlsx with one click.',
      status: 'connected',
      category: 'Productivity',
      logo: <LogoXLS />,
    },
    {
      id: 'hubspot',
      name: 'HubSpot CRM',
      description: 'Sync client requests and project milestones with HubSpot deals and contacts.',
      status: connected.has('hubspot') ? 'connected' : 'not_connected',
      category: 'CRM',
      logo: <LogoHubSpot />,
      inputLabel: 'HubSpot Private API Key',
      inputPlaceholder: 'pat-eu1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      inputType: 'password',
    },
    {
      id: 'xero',
      name: 'Xero Accounting',
      description: 'Push invoices and cost records directly to Xero for seamless bookkeeping.',
      status: 'coming_soon',
      category: 'Finance',
      logo: <LogoXero />,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Send check-in prompts and payment reminders via WhatsApp to workers and clients.',
      status: 'coming_soon',
      category: 'Communication',
      logo: <LogoWhatsApp />,
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect BuildOps to 5,000+ apps. Trigger workflows on any platform event.',
      status: connected.has('zapier') ? 'connected' : 'not_connected',
      category: 'Automation',
      logo: <LogoZapier />,
      inputLabel: 'Zapier Webhook URL',
      inputPlaceholder: 'https://hooks.zapier.com/hooks/catch/...',
    },
  ]

  const handleSave = async (id: string) => {
    const val = values[id]?.trim()
    if (!val) { toast('Enter a value before saving', 'error'); return }
    setSaving(id)
    await new Promise(r => setTimeout(r, 800))
    setSaving(null)
    setConnected(prev => new Set([...prev, id]))
    toast(`${INTEGRATIONS.find(i => i.id === id)?.name} connected`)
  }

  const handleDisconnect = (id: string) => {
    setConnected(prev => { const n = new Set(prev); n.delete(id); return n })
    setValues(prev => ({ ...prev, [id]: '' }))
    toast('Integration disconnected')
  }

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Integrations</h1>
            <p className="text-sm text-text-secondary mt-0.5">Connect BuildOps to the tools your team already uses.</p>
          </div>
          <div className="text-[10px] text-text-muted">
            {INTEGRATIONS.filter(i => i.status === 'connected').length + connected.size} of {INTEGRATIONS.length} connected
          </div>
        </div>
        <div className="border-b border-border mb-6" />

        {categories.map(cat => {
          const items = INTEGRATIONS.filter(i => i.category === cat)
          return (
            <div key={cat} className="mb-7">
              <h2 className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-3">{cat}</h2>
              <div className="grid grid-cols-1 gap-3">
                {items.map(integration => {
                  const isConnected = integration.status === 'connected'
                  const isComingSoon = integration.status === 'coming_soon'

                  return (
                    <div key={integration.id} className={`bg-surface border border-border rounded-xl p-5 ${isComingSoon ? 'opacity-75' : ''}`}>
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">{integration.logo}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-text-primary">{integration.name}</span>
                            {isConnected && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-success/10 text-success border border-success/20">Connected</span>
                            )}
                            {!isConnected && !isComingSoon && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-text-secondary">Not Connected</span>
                            )}
                            {isComingSoon && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-text-muted">Coming soon</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mb-3">{integration.description}</p>

                          {/* Excel export shortcuts */}
                          {integration.id === 'excel' && (
                            <div className="flex flex-wrap gap-2">
                              {['Costs', 'Timesheets', 'Projects', 'Contracts', 'Invoices'].map(table => (
                                <button
                                  key={table}
                                  onClick={() => toast(`Export ${table} → navigate to /${table.toLowerCase()} and click Export Excel`)}
                                  className="text-[10px] font-semibold border border-border px-2.5 py-1 rounded-lg text-text-secondary hover:bg-background flex items-center gap-1"
                                >
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                  {table}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Config input */}
                          {!isComingSoon && integration.id !== 'excel' && integration.inputLabel && (
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <label className="text-[9px] uppercase tracking-wide text-text-muted font-semibold block mb-1">{integration.inputLabel}</label>
                                <input
                                  type={integration.inputType || 'text'}
                                  value={values[integration.id] || ''}
                                  onChange={e => setValues(prev => ({ ...prev, [integration.id]: e.target.value }))}
                                  placeholder={integration.inputPlaceholder}
                                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                                />
                              </div>
                              <button
                                onClick={() => handleSave(integration.id)}
                                disabled={saving === integration.id}
                                className="text-xs font-semibold bg-accent text-white px-3.5 py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 whitespace-nowrap"
                              >
                                {saving === integration.id ? 'Saving...' : 'Save'}
                              </button>
                              {isConnected && (
                                <button onClick={() => handleDisconnect(integration.id)} className="text-xs font-semibold text-text-muted border border-border px-3 py-2 rounded-lg hover:text-danger hover:border-danger/30 whitespace-nowrap">
                                  Disconnect
                                </button>
                              )}
                            </div>
                          )}

                          {/* Already connected without input */}
                          {isConnected && !integration.inputLabel && (
                            <button onClick={() => handleDisconnect(integration.id)} className="text-xs font-semibold text-text-muted hover:text-danger transition-colors">Disconnect</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
