import { cn } from '@/lib/utils'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const VARIANTS: Record<Variant, string> = {
  success: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20',
  warning: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',
  danger:  'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20',
  info:    'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/20',
  neutral: 'bg-muted text-text-secondary border-border',
}

interface StatusBadgeProps {
  label: string
  variant: Variant
  className?: string
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border whitespace-nowrap',
      VARIANTS[variant],
      className,
    )}>
      {label}
    </span>
  )
}

export function statusVariant(status: string): Variant {
  const s = status.toLowerCase().replace(/[\s_-]/g, '_')
  if (['active', 'paid', 'complete', 'completed', 'on_track', 'signed', 'valid', 'matched'].includes(s)) return 'success'
  if (['at_risk', 'pending', 'sent', 'expiring', 'partial', 'unmatched', 'overdue'].includes(s)) return 'warning'
  if (['critical', 'failed', 'expired', 'deleted', 'rejected', 'delayed'].includes(s)) return 'danger'
  if (['draft', 'in_progress', 'in_review', 'generating'].includes(s)) return 'info'
  return 'neutral'
}
