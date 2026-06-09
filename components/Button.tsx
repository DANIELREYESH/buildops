import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_STYLES: Record<Variant, string> = {
  primary:   'bg-[#6366f1] hover:bg-[#4f46e5] text-white border-transparent',
  secondary: 'bg-muted hover:bg-muted/70 text-text-primary border border-border',
  danger:    'bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/20',
  ghost:     'bg-transparent hover:bg-muted text-text-secondary border-transparent',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
}
