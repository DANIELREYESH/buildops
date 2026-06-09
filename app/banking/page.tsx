'use client'

import { useState } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { useToast } from '@/lib/toast'

const fmt = (n: number) => `£${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Bank = { id: string; name: string; color: string; textColor: string; balance: number; accountNo: string; sortCode: string; mark: string }

function BankLogo({ bank, size = 36 }: { bank: Bank; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-black flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: 'white', color: bank.color, fontSize: size * 0.4 }}
    >
      {bank.mark}
    </div>
  )
}
type Transaction = { id: string; bankId: string; date: string; description: string; amount: number; type: 'debit' | 'credit'; category: string; matched: boolean; matchedCostId?: string }

const BANKS: Bank[] = [
  { id: 'barclays',  name: 'Barclays',  color: '#00AEEF', textColor: 'white', balance: 48230.50, accountNo: '****4821', sortCode: '20-00-00', mark: 'B' },
  { id: 'hsbc',      name: 'HSBC',      color: '#DB0011', textColor: 'white', balance: 12890.75, accountNo: '****7293', sortCode: '40-02-50', mark: 'H' },
  { id: 'lloyds',    name: 'Lloyds',    color: '#006A4D', textColor: 'white', balance: 6102.30,  accountNo: '****1138', sortCode: '30-00-00', mark: 'L' },
  { id: 'natwest',   name: 'NatWest',   color: '#42145F', textColor: 'white', balance: 22450.00, accountNo: '****5566', sortCode: '60-60-06', mark: 'N' },
  { id: 'starling',  name: 'Starling',  color: '#7B5EA7', textColor: 'white', balance: 8720.44,  accountNo: '****0012', sortCode: '60-83-71', mark: 'S' },
  { id: 'monzo',     name: 'Monzo',     color: '#FF3B6B', textColor: 'white', balance: 3240.00,  accountNo: '****9871', sortCode: '04-00-04', mark: 'M' },
]

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1',  bankId: 'barclays', date: '2026-06-05', description: 'Travis Perkins Ltd',           amount: -2340.80, type: 'debit',  category: 'Materials',       matched: true  },
  { id: 't2',  bankId: 'barclays', date: '2026-06-05', description: 'Client Payment — Shoreditch',  amount: 12500.00, type: 'credit', category: 'Income',          matched: false },
  { id: 't3',  bankId: 'barclays', date: '2026-06-04', description: 'Jewson Building Supplies',     amount: -1890.00, type: 'debit',  category: 'Materials',       matched: true  },
  { id: 't4',  bankId: 'barclays', date: '2026-06-04', description: 'Selco Builders Warehouse',     amount: -450.50,  type: 'debit',  category: 'Materials',       matched: false },
  { id: 't5',  bankId: 'barclays', date: '2026-06-03', description: 'JCB Plant Hire',               amount: -3200.00, type: 'debit',  category: 'Equipment',       matched: true  },
  { id: 't6',  bankId: 'barclays', date: '2026-06-03', description: 'Payroll — Weekly Run',         amount: -8400.00, type: 'debit',  category: 'Labour',          matched: false },
  { id: 't7',  bankId: 'barclays', date: '2026-06-02', description: 'Client Deposit — Kensington',  amount: 5000.00,  type: 'credit', category: 'Income',          matched: false },
  { id: 't8',  bankId: 'barclays', date: '2026-06-02', description: 'Boels Equipment Rental',       amount: -620.00,  type: 'debit',  category: 'Equipment',       matched: false },
  { id: 't9',  bankId: 'barclays', date: '2026-06-01', description: 'RS Components — Electrical',   amount: -290.40,  type: 'debit',  category: 'Materials',       matched: false },
  { id: 't10', bankId: 'barclays', date: '2026-06-01', description: 'National Grid — Site Power',   amount: -189.00,  type: 'debit',  category: 'Utilities',       matched: false },
  { id: 't11', bankId: 'hsbc',     date: '2026-06-05', description: 'Supabase Inc — SaaS',          amount: -29.00,   type: 'debit',  category: 'Software',        matched: false },
  { id: 't12', bankId: 'hsbc',     date: '2026-06-04', description: 'Client Payment — Battersea',   amount: 7500.00,  type: 'credit', category: 'Income',          matched: false },
  { id: 't13', bankId: 'natwest',  date: '2026-06-05', description: 'Screwfix Direct',               amount: -145.60,  type: 'debit',  category: 'Materials',       matched: false },
  { id: 't14', bankId: 'natwest',  date: '2026-06-03', description: 'B&Q Commercial',               amount: -880.00,  type: 'debit',  category: 'Materials',       matched: false },
  { id: 't15', bankId: 'starling', date: '2026-06-05', description: 'HMRC PAYE',                    amount: -4200.00, type: 'debit',  category: 'Tax',             matched: false },
]

const CATEGORY_COLORS: Record<string, string> = {
  Materials:  'bg-accent/10 text-accent border border-accent/20',
  Equipment:  'bg-warning/10 text-warning border border-warning/20',
  Labour:     'bg-success/10 text-success border border-success/20',
  Income:     'bg-success/10 text-success border border-success/20',
  Utilities:  'bg-muted text-text-secondary',
  Software:   'bg-muted text-text-secondary',
  Tax:        'bg-danger/10 text-danger border border-danger/20',
}

export default function BankingPage() {
  const { toast } = useToast()
  const [selectedBank, setSelectedBank] = useState<string>('barclays')
  const [showConnect, setShowConnect] = useState(false)
  const [connectingBank, setConnectingBank] = useState<Bank | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set(['t1', 't3', 't5']))

  const selectedBankObj = BANKS.find(b => b.id === selectedBank)!
  const transactions = MOCK_TRANSACTIONS.filter(t => t.bankId === selectedBank)

  const totalBalance = BANKS.reduce((s, b) => s + b.balance, 0)
  const totalIn  = MOCK_TRANSACTIONS.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  const totalOut = MOCK_TRANSACTIONS.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0)
  const unmatchedCount = MOCK_TRANSACTIONS.filter(t => t.type === 'debit' && !matchedIds.has(t.id)).length

  const handleMatch = (id: string) => {
    setMatchedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    toast(matchedIds.has(id) ? 'Match removed' : 'Matched to cost record')
  }

  const handleConnect = (bank: Bank) => {
    setConnectingBank(bank)
    setShowConnect(true)
  }

  return (
    <AppLayout>
      <div className="pt-6 px-6 pb-12">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">Open Banking</h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">Connect your bank accounts and automatically match transactions to project costs.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              FCA regulated · Open Banking
            </span>
            {unmatchedCount > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 text-xs text-warning font-semibold">
                {unmatchedCount} transactions unmatched
              </div>
            )}
          </div>
        </div>
        <div className="border-b border-[#1f1f1f] mb-6" />

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Total Balance</div>
            <div className="text-2xl font-bold text-text-primary">{fmt(totalBalance)}</div>
            <div className="text-[11px] text-text-muted mt-0.5">{BANKS.length} accounts connected</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Money In (Jun)</div>
            <div className="text-2xl font-bold text-success">{fmt(totalIn)}</div>
            <div className="text-[11px] text-text-muted mt-0.5">Client payments &amp; deposits</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wide text-text-muted font-semibold mb-1">Money Out (Jun)</div>
            <div className="text-2xl font-bold text-accent">{fmt(totalOut)}</div>
            <div className="text-[11px] text-text-muted mt-0.5">Costs, labour &amp; overheads</div>
          </div>
        </div>

        {/* Bank account tiles */}
        <h2 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-3">Connected Accounts</h2>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {BANKS.map(bank => (
            <button
              key={bank.id}
              onClick={() => setSelectedBank(bank.id)}
              className={`relative rounded-xl p-4 text-left transition-all border-2 ${selectedBank === bank.id ? 'border-accent' : 'border-transparent hover:border-border'}`}
              style={{ backgroundColor: bank.color }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BankLogo bank={bank} />
                  <span className="font-bold text-sm" style={{ color: bank.textColor }}>{bank.name}</span>
                </div>
                {selectedBank === bank.id && (
                  <div className="w-2 h-2 rounded-full bg-white/80" />
                )}
              </div>
              <div className="font-mono text-xl font-bold" style={{ color: bank.textColor }}>
                {fmt(bank.balance)}
              </div>
              <div className="text-[10px] mt-1 opacity-75" style={{ color: bank.textColor }}>
                {bank.sortCode} · {bank.accountNo}
              </div>
            </button>
          ))}
        </div>

        {/* Transaction feed */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
            <div className="rounded-full flex items-center justify-center font-black flex-shrink-0 w-5 h-5 text-[10px]" style={{ backgroundColor: selectedBankObj.color, color: 'white' }}>
              {selectedBankObj.mark}
            </div>
            {selectedBankObj.name} Transactions
          </h2>
          <button onClick={() => handleConnect(selectedBankObj)} className="text-[10px] font-semibold text-accent border border-accent/30 px-2.5 py-1 rounded-lg hover:bg-accent/10 transition-colors">
            Refresh feed
          </button>
        </div>
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-text-muted font-semibold">No transactions for this account</p>
            </div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-5 py-2.5 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Date</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Description</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-left">Category</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[9px] uppercase tracking-wide text-text-muted font-semibold text-center">Match</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isMatched = matchedIds.has(tx.id)
                  return (
                    <tr key={tx.id} className={`border-t border-border transition-colors ${isMatched ? 'bg-success/5' : 'hover:bg-muted/30'}`}>
                      <td className="px-5 py-3 text-xs text-text-muted tabular-nums whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-text-primary">{tx.description}</div>
                        {isMatched && <div className="text-[10px] text-success">Matched to cost record</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${CATEGORY_COLORS[tx.category] || 'bg-muted text-text-secondary'}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs font-mono font-bold text-right tabular-nums ${tx.type === 'credit' ? 'text-success' : 'text-text-primary'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{fmt(Math.abs(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.type === 'debit' && (
                          <button
                            onClick={() => handleMatch(tx.id)}
                            className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-colors ${isMatched ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-text-muted hover:bg-border hover:text-text-primary'}`}
                          >
                            {isMatched ? 'Matched' : 'Match'}
                          </button>
                        )}
                        {tx.type === 'credit' && (
                          <span className="text-[9px] text-text-muted">Income</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FCA badge */}
        <div className="mt-4 flex items-center gap-2 text-[10px] text-text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Bank-level 256-bit encryption · Powered by Open Banking (PSD2) · FCA registered · Read-only access · Data never stored
        </div>
      </div>

      {/* Connect bank modal */}
      {showConnect && connectingBank && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConnect(false)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-primary">Connect {connectingBank.name}</h3>
              <button onClick={() => setShowConnect(false)} className="text-text-muted hover:text-text-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: connectingBank.color }}>
                {connectingBank.name[0]}
              </div>
              <p className="text-sm font-semibold text-text-primary mb-1">Secure Open Banking connection</p>
              <p className="text-xs text-text-muted mb-4">You&apos;ll be redirected to {connectingBank.name} to authorise read-only access. This is a secure FCA-regulated flow.</p>
              <div className="space-y-2 text-left bg-background border border-border rounded-lg p-3 mb-4">
                {['Read-only access — we cannot move money', '90-day re-authentication required', 'Revoke access any time in your bank app', 'Data encrypted in transit and at rest'].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    <span className="text-[11px] text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setShowConnect(false); toast(`${connectingBank.name} connection refreshed`) }} className="w-full bg-accent text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-accent-hover transition-colors">
                Authorise via {connectingBank.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
