import {
  LayoutDashboard, FolderKanban, CheckSquare, Clock, ScanLine, Bot,
  FileSignature, Wallet, FileText, Landmark, Banknote, TrendingUp,
  Inbox, Users, Store, BarChart2, Plug, CreditCard, UserCheck, Smartphone,
  type LucideIcon,
} from 'lucide-react'

export { Smartphone }

export type NavItem = { label: string; href: string; icon: LucideIcon }
export type NavGroup = { group: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    group: 'WORKSPACE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Projects', href: '/projects', icon: FolderKanban },
      { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    ],
  },
  {
    group: 'FIELD OPS',
    items: [
      { label: 'AI Check-ins', href: '/checkins', icon: Bot },
      { label: 'Contracts', href: '/contracts', icon: FileSignature },
      { label: 'Right to Work', href: '/right-to-work', icon: UserCheck },
      { label: 'Timesheets', href: '/timesheets', icon: Clock },
      { label: 'Scan Tickets', href: '/tickets', icon: ScanLine },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { label: 'Budget', href: '/costs', icon: Wallet },
      { label: 'Cashflow', href: '/cashflow', icon: BarChart2 },
      { label: 'Banking', href: '/banking', icon: Landmark },
      { label: 'Invoicing', href: '/invoicing', icon: FileText },
      { label: 'Sub Payments', href: '/payments', icon: Banknote },
    ],
  },
  {
    group: 'CLIENTS',
    items: [
      { label: 'Client Requests', href: '/requests', icon: Inbox },
      { label: 'Client Portal', href: '/client-portal', icon: Users },
    ],
  },
  {
    group: 'NETWORK',
    items: [
      { label: 'Sub Marketplace', href: '/marketplace', icon: Store },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { label: 'AI Forecast', href: '/forecast', icon: TrendingUp },
    ],
  },
  {
    group: 'SETTINGS',
    items: [
      { label: 'Integrations', href: '/integrations', icon: Plug },
      { label: 'Billing', href: '/users', icon: CreditCard },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap(g => g.items)
