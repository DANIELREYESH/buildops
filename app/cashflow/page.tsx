'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import AppLayout from '@/app/dashboard/layout'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { CashflowForecast, ForecastPeriod } from '@/lib/types'

const fmt = (n: number) => `£${Math.abs(n).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(n)}`

const TRAFFIC_COLORS = {
  green: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', dot: 'bg-success' },
  amber: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', dot: 'bg-warning' },
  red: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', dot: 'bg-danger' },
}

const CONFIDENCE_COLORS: Record<ForecastPeriod['confidence'], string> = {
  high: 'bg-success/10 text-success border border-success/20',
  medium: 'bg-warning/10 text-warning border border-warning/20',
  low: 'bg-muted text-text-muted',
}

function buildFinancialSummary(
  invoices: Array<{ total: number; status: string; due_date: string | null }>,
  payments: Array<{ amount: number; status: string; due_date: string | null }>,
  timesheets: Array<{ hours: number | null }>,
  costs: Array<{ amount: number; category: string }>,
): string {
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0)
  const paidInvoices = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const outstandingInvoices = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

  const pendingPayments = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const processingPayments = payments.filter(p => p.status === 'processing').reduce((s, p) => s + p.amount, 0)

  const totalHours = timesheets.reduce((s, t) => s + (t.hours || 0), 0)
  const estWeeklyLabour = totalHours > 0 ? (totalHours / Math.max(timesheets.length, 1)) * 5 * 15 : 0

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0)

  const upcoming = invoices
    .filter(i => i.status === 'sent' && i.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5)
    .map(i => `£${i.total.toLocaleString()} due ${i.due_date}`)
    .join(', ')

  return `FINANCIAL SNAPSHOT

INVOICES (Money In):
- Total invoiced: £${totalInvoiced.toLocaleString()}
- Collected/paid: £${paidInvoices.toLocaleString()}
- Outstanding (sent): £${outstandingInvoices.toLocaleString()}
- Overdue: £${overdueInvoices.toLocaleString()}
- Upcoming payments: ${upcoming || 'none'}

SUBCONTRACTOR PAYMENTS (Money Out):
- Pending approval: £${pendingPayments.toLocaleString()}
- In processing: £${processingPayments.toLocaleString()}

LABOUR COSTS:
- Total hours logged: ${totalHours.toFixed(0)}h
- Estimated weekly labour spend: £${estWeeklyLabour.toFixed(0)} (based on £15/hr avg)

PROJECT COSTS TO DATE:
- Total costs logged: £${totalCosts.toLocaleString()}

Generate a realistic 90-day cashflow forecast based on this data. Assume outstanding invoices are collected within 4-6 weeks. Pending sub payments fall due over next 3-4 weeks.`
}

export default function CashflowPage() {
  const [forecast, setForecast] = useState<CashflowForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const generate = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [{ data: invoices }, { data: payments }, { data: timesheets }, { data: costs }] = await Promise.all([
        supabase.from('invoices').select('total, status, due_date'),
        supabase.from('sub_payments').select('amount, status, due_date'),
        supabase.from('timesheets').select('hours'),
        supabase.from('costs').select('amount, category'),
      ])

      const summary = buildFinancialSummary(
        (invoices || []) as Array<{ total: number; status: string; due_date: string | null }>,
        (payments || []) as Array<{ amount: number; status: string; due_date: string | null }>,
        (timesheets || []) as Array<{ hours: number | null }>,
        (costs || []) as Array<{ amount: number; category: string }>,
      )

      const res = await fetch('/api/cashflow-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialSummary: summary,
          currentDate: new Date().toLocaleDateString('en-GB'),
        }),
      })

      let json: unknown
      try {
        json = await res.json()
      } catch {
        throw new Error('Could not parse forecast response — try regenerating')
      }

      if (!res.ok) {
        const errJson = json as { error?: string }
        throw new Error(errJson?.error || `API error ${res.status}`)
      }

      const data = json as CashflowForecast
      if (!data || !Array.isArray(data.forecast_periods)) {
        throw new Error('Forecast response missing forecast_periods — try regenerating')
      }

      setForecast(data)
      setGeneratedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
      toast.success('Cashflow forecast generated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate forecast'
      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    generate()
  }, [generate])

  const tl = forecast?.traffic_light ? TRAFFIC_COLORS[forecast.traffic_light] : null

  const totalMoneyIn = forecast?.forecast_periods.reduce((s, p) => s + p.money_in, 0) || 0
  const totalMoneyOut = forecast?.forecast_periods.reduce((s, p) => s + p.money_out, 0) || 0

  const chartData = forecast?.forecast_periods.map(p => ({
    name: p.week_label.split('—')[0].trim(),
    'Money In': p.money_in,
    'Money Out': p.money_out,
    'Balance': p.cumulative_balance,
    opacity: p.confidence === 'high' ? 1 : p.confidence === 'medium' ? 0.7 : 0.4,
  })) || []

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Cashflow Predictor</h1>
            <p className="text-xs text-text-muted mt-1">AI-powered 90-day cashflow forecast from your live financial data</p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Generating...' : 'Regenerate Forecast'}
          </button>
        </div>

        {!forecast && !errorMsg && (
          <div className="space-y-4">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-72 rounded-xl" />
          </div>
        )}

        {!forecast && errorMsg && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-xl p-5 text-sm">
            <p className="font-medium mb-1">Failed to generate forecast</p>
            <p className="text-xs opacity-80">{errorMsg}</p>
            <button
              onClick={generate}
              className="mt-3 text-xs font-medium bg-danger text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        )}

        {forecast && (
          <>
            {/* Traffic light banner */}
            {tl && (
              <div className={cn('border rounded-xl px-5 py-4 mb-5 flex items-center gap-4', tl.bg, tl.border)}>
                <div className={cn('w-4 h-4 rounded-full flex-shrink-0', tl.dot)} />
                <div className="flex-1">
                  <div className={cn('text-sm font-bold capitalize mb-0.5', tl.text)}>
                    {forecast.traffic_light === 'green' ? 'Cashflow Healthy'
                      : forecast.traffic_light === 'amber' ? 'Cashflow Advisory'
                      : 'Cashflow Warning'}
                  </div>
                  <div className={cn('text-xs', tl.text, 'opacity-90')}>{forecast.traffic_light_reason}</div>
                </div>
                {generatedAt && (
                  <div className="text-[10px] text-text-muted flex-shrink-0">Updated {generatedAt}</div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                {
                  label: 'Est. Current Balance',
                  value: fmt(forecast.current_balance_estimate),
                  tone: forecast.current_balance_estimate >= 0 ? 'success' : 'danger',
                },
                { label: 'Money In (90 days)', value: fmt(totalMoneyIn), tone: 'success' },
                { label: 'Money Out (90 days)', value: fmt(totalMoneyOut), tone: 'danger' },
                {
                  label: 'Break-even Risk',
                  value: forecast.break_even_week ? `Week ${forecast.break_even_week}` : 'No risk',
                  tone: forecast.break_even_week ? 'danger' : 'success',
                },
              ].map(s => (
                <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wide text-text-muted font-medium mb-1">{s.label}</div>
                  <div className={cn(
                    'text-xl font-bold tabular-nums',
                    s.tone === 'success' ? 'text-success' : 'text-danger'
                  )}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-5">
              <div className="text-xs font-semibold text-text-primary mb-4">13-Week Cashflow Forecast</div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                    formatter={(value: unknown, name: unknown) => [`£${Number(value).toLocaleString('en-GB')}`, String(name)]}
                    labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 12 }}
                  />
                  <Bar dataKey="Money In" fill="var(--color-success)" opacity={0.75} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Money Out" fill="var(--color-danger)" opacity={0.75} radius={[3, 3, 0, 0]} />
                  <Line
                    type="monotone" dataKey="Balance"
                    stroke="var(--color-accent)" strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--color-accent)', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Risks + Recommendations */}
            <div className="grid grid-cols-2 gap-5 mb-5">
              {/* Key risks */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-warning" />
                  <span className="text-xs font-semibold text-text-primary">Key Risks</span>
                </div>
                <div className="space-y-2">
                  {forecast.key_risks.map((risk, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-warning/5 border border-warning/15 rounded-lg p-3">
                      <span className="text-warning text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-text-secondary">{risk}</span>
                    </div>
                  ))}
                  {forecast.key_risks.length === 0 && (
                    <p className="text-xs text-text-muted py-2">No significant risks identified</p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-accent" />
                  <span className="text-xs font-semibold text-text-primary">Recommendations</span>
                </div>
                <div className="space-y-2">
                  {forecast.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-accent/5 border border-accent/15 rounded-lg p-3">
                      <span className="text-accent text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-xs text-text-secondary">{rec}</span>
                    </div>
                  ))}
                  {forecast.recommendations.length === 0 && (
                    <p className="text-xs text-text-muted py-2">No recommendations</p>
                  )}
                </div>
              </div>
            </div>

            {/* Weekly breakdown table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-semibold text-text-primary">Weekly Breakdown</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background">
                    {['Week', 'Money In', 'Money Out', 'Net', 'Cumulative Balance', 'Confidence'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-muted font-medium text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast_periods.map((period, i) => (
                    <tr key={i} className={cn(
                      'border-t border-border hover:bg-muted/30 transition-colors',
                      period.cumulative_balance < 0 && 'bg-danger/5'
                    )}>
                      <td className="px-4 py-2.5 text-xs text-text-primary font-medium">{period.week_label}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-success">{fmt(period.money_in)}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-danger">{fmt(period.money_out)}</td>
                      <td className={cn('px-4 py-2.5 text-xs font-mono font-semibold', period.net >= 0 ? 'text-success' : 'text-danger')}>
                        {fmtSigned(period.net)}
                      </td>
                      <td className={cn('px-4 py-2.5 text-xs font-mono font-bold', period.cumulative_balance >= 0 ? 'text-text-primary' : 'text-danger')}>
                        <div className="flex items-center gap-1.5">
                          {period.cumulative_balance >= 0
                            ? <TrendingUp size={11} className="text-success" />
                            : <TrendingDown size={11} className="text-danger" />
                          }
                          {fmt(period.cumulative_balance)}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium capitalize', CONFIDENCE_COLORS[period.confidence])}>
                          {period.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
