export function formatCurrency(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCurrencyCompact(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (Math.abs(n) >= 1_000) return `£${(n / 1_000).toFixed(1)}k`
  return `£${n.toFixed(0)}`
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

export function formatRelativeDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(d)
  } catch { return '—' }
}

export function truncate(str: string | null | undefined, n: number): string {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function padRef(prefix: string, n: number | string): string {
  return `${prefix}-${String(n).padStart(3, '0')}`
}
