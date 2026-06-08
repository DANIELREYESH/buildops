import {
  LayoutDashboard, FolderKanban, CheckSquare, Clock, ScanLine, Bot,
  Wallet, FileText, Landmark, Banknote, Inbox, Users, Store, TrendingUp,
  Plug, CreditCard, type LucideIcon,
} from 'lucide-react'

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
      { label: 'Timesheets', href: '/timesheets', icon: Clock },
      { label: 'Scan Tickets', href: '/tickets', icon: ScanLine },
      { label: 'AI Check-ins', href: '/checkins', icon: Bot },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { label: 'Budget', href: '/costs', icon: Wallet },
      { label: 'Invoicing', href: '/invoicing', icon: FileText },
      { label: 'Banking', href: '/banking', icon: Landmark },
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
