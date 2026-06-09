'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isContract?: boolean
  isInvoiceIntent?: boolean
  isProjectRisk?: boolean
}

const SUGGESTED_PROMPTS = [
  'What projects are at risk?',
  'Show my overdue invoices',
  'Generate a contract for a subcontractor',
  "What's my cashflow looking like?",
  'Which subs need Right to Work checks?',
]

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi 👋 I'm your BuildOps AI. Ask me anything — project status, invoices, cashflow, contracts, or just tell me what you need done.",
}

function ThreeDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </span>
  )
}

function isContractContent(text: string) {
  return (
    text.length > 400 &&
    /\b(agreement|services agreement|contract between|witnesseth|schedule of works|payment schedule|termination|governing law)\b/i.test(text)
  )
}

function isInvoiceContent(text: string) {
  return /navigate to (invoicing|the invoicing)|go to invoicing|create (the|an|this) invoice/i.test(text)
}

function isProjectRiskContent(text: string) {
  return /at[\s-]risk|overdue|behind schedule|delayed|flagged/i.test(text)
}

export default function AIAssistant() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contractText, setContractText] = useState<string | null>(null)
  const [savingContract, setSavingContract] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const msgHistory = messages.filter(m => m.id !== 'welcome')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim() }
    const history = [...msgHistory, userMsg]
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const aiId = `a-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', isStreaming: true }])

    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed')
        throw new Error(errText)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: full } : m))
      }

      const isContract = isContractContent(full)
      const isInvoiceIntent = isInvoiceContent(full)
      const isProjectRisk = isProjectRiskContent(full)
      if (isContract) setContractText(full)

      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: full, isStreaming: false, isContract, isInvoiceIntent, isProjectRisk }
          : m
      ))
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiId
          ? { ...m, content: 'Sorry, I hit an error. Please try again.', isStreaming: false }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }, [loading, msgHistory])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const handleSaveContract = async () => {
    if (!contractText) return
    setSavingContract(true)
    const contractNumber = `AI-${Date.now().toString().slice(-6)}`
    const { error } = await supabase.from('sub_contracts').insert({
      contract_number: contractNumber,
      subcontractor_name: 'To be assigned',
      generated_contract_text: contractText,
      status: 'draft',
    })
    setSavingContract(false)
    if (error) { toast.error('Failed to save: ' + error.message); return }
    toast.success('Contract saved — ' + contractNumber)
    router.push('/contracts')
  }

  const handleDailyBriefing = () => sendMessage('Send me the daily briefing')

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-0 rounded-full bg-[#6366f1]/25 animate-ping" style={{ animationDuration: '2s' }} />
          <button
            onClick={() => setOpen(true)}
            aria-label="Open AI Assistant"
            className="relative w-14 h-14 rounded-full bg-[#6366f1] hover:bg-[#4f46e5] shadow-2xl shadow-[#6366f1]/40 flex items-center justify-center transition-all active:scale-95"
          >
            <Sparkles size={22} className="text-white" />
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 380, height: 520, background: '#111111', border: '1px solid #1f1f1f' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #1f1f1f' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#6366f1] flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white">BuildOps AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <span className="text-[10px] text-[#22c55e]">Online</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#52525b] hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn(
                  'max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-[#1a1a1a] text-[#f0f0f0]'
                )}>
                  {msg.isStreaming && !msg.content ? <ThreeDots /> : msg.content}
                </div>

                {/* Suggested prompts under welcome */}
                {msg.id === 'welcome' && messages.length === 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-full">
                    {SUGGESTED_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[#888] border border-[#2a2a2a] hover:text-white hover:border-[#6366f1]/40 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={handleDailyBriefing}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 hover:bg-[#6366f1]/20 transition-colors"
                    >
                      Daily briefing
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                {msg.role === 'assistant' && !msg.isStreaming && msg.id !== 'welcome' && msg.content.length > 80 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <button
                      onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Copied') }}
                      className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-[#1f1f1f] text-[#666] hover:text-white transition-colors"
                    >
                      Copy
                    </button>
                    {msg.isContract && (
                      <button
                        onClick={handleSaveContract}
                        disabled={savingContract}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#6366f1]/20 text-[#6366f1] hover:bg-[#6366f1]/30 disabled:opacity-50 transition-colors"
                      >
                        {savingContract ? 'Saving...' : 'Save to Contracts →'}
                      </button>
                    )}
                    {msg.isInvoiceIntent && (
                      <button
                        onClick={() => router.push('/invoicing?new=1')}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#6366f1]/20 text-[#6366f1] hover:bg-[#6366f1]/30 transition-colors"
                      >
                        Go to Invoicing →
                      </button>
                    )}
                    {msg.isProjectRisk && (
                      <button
                        onClick={() => router.push('/projects')}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30 transition-colors"
                      >
                        View Projects →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #1f1f1f' }}>
            <div
              className="flex items-center gap-2"
              style={{ background: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: 12, padding: '10px 12px' }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your projects..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder:text-[#444] outline-none"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg bg-[#6366f1] disabled:opacity-30 hover:bg-[#4f46e5] transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
