import {
  LayoutDashboard, FolderKanban, CheckSquare, Clock, ScanLine, Bot,
  FileSignature, Wallet, FileText, Landmark, Banknote, TrendingUp,
  Inbox, Users, Store, BarChart2, Plug, CreditCard, UserCheck, Smartphone, Building2,
  type LucideIcon,
} from 'lucide-react'

export { Smartphone }

export type NavItem = { label: string; href: string; icon: LucideIcon }
export type NavGroup = { group: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    group: 'WORKSPACE',
    items: [
      { label: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
      { label: 'Projects', href: '/app/projects', icon: FolderKanban },
      { label: 'Tasks', href: '/app/tasks', icon: CheckSquare },
    ],
  },
  {
    group: 'FIELD OPS',
    items: [
      { label: 'AI Check-ins', href: '/app/checkins', icon: Bot },
      { label: 'Contracts', href: '/app/contracts', icon: FileSignature },
      { label: 'Right to Work', href: '/app/right-to-work', icon: UserCheck },
      { label: 'Timesheets', href: '/app/timesheets', icon: Clock },
      { label: 'Scan Tickets', href: '/app/tickets', icon: ScanLine },
    ],
  },
  {
    group: 'FINANCE',
    items: [
      { label: 'Budget', href: '/app/costs', icon: Wallet },
      { label: 'Cashflow', href: '/app/cashflow', icon: BarChart2 },
      { label: 'Banking', href: '/app/banking', icon: Landmark },
      { label: 'Invoicing', href: '/app/invoicing', icon: FileText },
      { label: 'Sub Payments', href: '/app/payments', icon: Banknote },
    ],
  },
  {
    group: 'CLIENTS',
    items: [
      { label: 'Client Requests', href: '/app/requests', icon: Inbox },
      { label: 'Client Portal', href: '/app/client-portal', icon: Users },
    ],
  },
  {
    group: 'NETWORK',
    items: [
      { label: 'Sub Marketplace', href: '/app/marketplace', icon: Store },
      { label: 'Suppliers', href: '/app/suppliers', icon: Building2 },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      { label: 'AI Forecast', href: '/app/forecast', icon: TrendingUp },
    ],
  },
  {
    group: 'SETTINGS',
    items: [
      { label: 'Integrations', href: '/app/integrations', icon: Plug },
      { label: 'Billing', href: '/app/users', icon: CreditCard },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap(g => g.items)
