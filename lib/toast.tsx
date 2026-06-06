'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2, 9)
    setItems(prev => [...prev, { id, message, type }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {items.map(item => (
          <div
            key={item.id}
            className={`px-4 py-3 rounded-lg text-sm font-semibold shadow-xl pointer-events-auto min-w-[260px] animate-in slide-in-from-bottom-2 ${
              item.type === 'success' ? 'bg-[#1A6B45] text-white' :
              item.type === 'error' ? 'bg-[#B8301A] text-white' :
              item.type === 'warning' ? 'bg-[#96670A] text-white' :
              'bg-[#1A3FAA] text-white'
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
