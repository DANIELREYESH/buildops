import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: LucideIcon
  className?: string
}

export function PageHeader({ title, subtitle, actions, icon: Icon, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-[#6366f1]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      <div className="border-b border-border mt-4" />
    </div>
  )
}
