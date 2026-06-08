'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronsLeft, ChevronsRight, ChevronDown, Search, Bell, Plus,
  Settings, LogOut, FolderPlus, ListPlus, FileText, Sun, Moon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ToastProvider } from '@/lib/toast'
import { NAV, ALL_NAV_ITEMS } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/command-palette'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [email, setEmail] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
    })
  }, [])

  useEffect(() => { setMounted(true) }, [])

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = email ? email[0].toUpperCase() : 'U'
  const expanded = !collapsed || hovering
  const breadcrumb = useMemo(() => {
    const match = ALL_NAV_ITEMS.find(i => pathname === i.href || pathname?.startsWith(i.href + '/'))
    return match ? `BuildOps / ${match.label}` : 'BuildOps'
  }, [pathname])

  return (
    <ToastProvider>
      <div className="h-screen bg-background flex overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          onMouseEnter={() => collapsed && setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={cn(
            'bg-surface border-r border-border flex flex-col fixed top-0 left-0 bottom-0 z-30 transition-[width] duration-200 overflow-hidden',
            expanded ? 'w-60' : 'w-[60px]'
          )}
        >
          {/* Wordmark */}
          <div className="h-14 flex items-center px-4 gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs">B</span>
            </div>
            {expanded && (
              <>
                <span className="font-bold text-sm tracking-tight text-text-primary whitespace-nowrap">BuildOps</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">beta</span>
              </>
            )}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="ml-auto text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>

          {/* Workspace switcher */}
          {expanded && (
            <button className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors text-left">
              <div className="w-5 h-5 rounded bg-text-muted/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-text-secondary">H</span>
              </div>
              <span className="text-xs font-medium text-text-secondary truncate flex-1">Helion Tech Ltd</span>
              <ChevronDown size={12} className="text-text-muted flex-shrink-0" />
            </button>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-1 px-3">
            {NAV.map((section, idx) => (
              <div key={section.group} className={idx > 0 ? 'mt-4' : ''}>
                {expanded && (
                  <div className="px-2.5 mb-1">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted uppercase select-none">
                      {section.group}
                    </span>
                  </div>
                )}
                {section.items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname?.startsWith(href + '/')
                  return (
                    <button
                      key={href}
                      onClick={() => router.push(href)}
                      title={!expanded ? label : undefined}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg mb-0.5 text-left transition-all border-l-2',
                        active
                          ? 'bg-accent/10 text-accent border-accent'
                          : 'text-text-secondary border-transparent hover:bg-muted hover:text-text-primary'
                      )}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      {expanded && <span className="text-xs font-medium flex-1 truncate">{label}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* User footer */}
          <div className="border-t border-border p-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 px-0.5">
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-accent">{initials}</span>
              </div>
              {expanded && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate leading-tight">Helion Tech Ltd</div>
                    <div className="text-[10px] text-text-muted truncate leading-tight">{email || '—'}</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                    title={mounted ? (resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
                    suppressHydrationWarning
                  >
                    {mounted && resolvedTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                  <button onClick={() => router.push('/users')} className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0" title="Settings">
                    <Settings size={14} />
                  </button>
                  <button onClick={handleLogout} className="text-text-muted hover:text-danger transition-colors flex-shrink-0" title="Sign out">
                    <LogOut size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className={cn('flex-1 flex flex-col h-screen transition-[margin-left] duration-200', collapsed ? 'ml-[60px]' : 'ml-60')}>
          {/* Top bar */}
          <header className="h-[52px] bg-background border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-20">
            <span className="text-xs text-text-secondary whitespace-nowrap">{breadcrumb}</span>

            <button
              onClick={() => setPaletteOpen(true)}
              className="flex-1 max-w-md mx-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-text-muted/40 transition-colors text-left"
            >
              <Search size={13} className="text-text-muted" />
              <span className="text-xs text-text-muted flex-1">Search or jump to...</span>
              <kbd className="text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={toggleTheme}
                className="text-text-muted hover:text-text-primary transition-colors"
                title={mounted ? (resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
                suppressHydrationWarning
              >
                {mounted && resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button className="text-text-muted hover:text-text-primary transition-colors relative" title="Notifications">
                <Bell size={16} />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
              </button>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={13} />
                    New
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="bg-surface border border-border rounded-xl shadow-2xl p-1.5 min-w-[180px] z-[250]"
                  >
                    <DropdownMenu.Item
                      onSelect={() => router.push('/projects?new=1')}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-text-secondary cursor-pointer outline-none hover:bg-muted hover:text-text-primary"
                    >
                      <FolderPlus size={14} /> New Project
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => router.push('/tasks?new=1')}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-text-secondary cursor-pointer outline-none hover:bg-muted hover:text-text-primary"
                    >
                      <ListPlus size={14} /> New Task
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => router.push('/invoicing?new=1')}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-text-secondary cursor-pointer outline-none hover:bg-muted hover:text-text-primary"
                    >
                      <FileText size={14} /> New Invoice
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-accent">{initials}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </ToastProvider>
  )
}
