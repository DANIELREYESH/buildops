'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, FolderKanban } from 'lucide-react'
import { ALL_NAV_ITEMS } from '@/lib/nav'
import { supabase } from '@/lib/supabase'

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [recentProjects, setRecentProjects] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (!open) return
    supabase.from('projects').select('id,name').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setRecentProjects(data || []))
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  const go = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <Command
        className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        shouldFilter
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-border">
          <Search size={15} className="text-text-muted" />
          <Command.Input
            autoFocus
            placeholder="Search or jump to..."
            className="w-full bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="text-[10px] text-text-muted border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="text-center text-xs text-text-muted py-8">No results found.</Command.Empty>

          <Command.Group heading="Pages" className="text-[10px] uppercase tracking-wider text-text-muted px-2 py-1.5 [&_[cmdk-group-items]]:mt-1">
            {ALL_NAV_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <Command.Item
                  key={item.href}
                  onSelect={() => go(item.href)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-text-secondary cursor-pointer aria-selected:bg-muted aria-selected:text-text-primary"
                >
                  <Icon size={14} />
                  {item.label}
                </Command.Item>
              )
            })}
          </Command.Group>

          {recentProjects.length > 0 && (
            <Command.Group heading="Recent Projects" className="text-[10px] uppercase tracking-wider text-text-muted px-2 py-1.5 mt-2 [&_[cmdk-group-items]]:mt-1">
              {recentProjects.map(p => (
                <Command.Item
                  key={p.id}
                  onSelect={() => go(`/projects?id=${p.id}`)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-text-secondary cursor-pointer aria-selected:bg-muted aria-selected:text-text-primary"
                >
                  <FolderKanban size={14} />
                  {p.name}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}
