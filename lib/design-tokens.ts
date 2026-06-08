export const colors = {
  background: '#0a0a0a',
  surface: '#111111',
  border: '#1f1f1f',
  muted: '#2a2a2a',
  accent: '#6366f1',
  accentHover: '#4f46e5',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#52525b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
} as const

export const statusColors: Record<string, string> = {
  planning: colors.warning,
  active: colors.accent,
  on_hold: '#f97316',
  complete: colors.success,
  draft: colors.textMuted,
  sent: '#3b82f6',
  paid: colors.success,
  overdue: colors.danger,
}
