'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Feedback = {
  id: string
  name: string
  message: string
  created_at: string
}

const MOCK_FEEDBACK: Feedback[] = [
  { id: '1', name: 'Tom Marsh', message: 'Cashflow forecast page is brilliant — would love a CSV export.', created_at: '2026-06-07T10:00:00Z' },
  { id: '2', name: 'Sarah Chen', message: 'AI check-ins sometimes misread voice notes with strong accents.', created_at: '2026-06-04T16:30:00Z' },
]

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>(MOCK_FEEDBACK)

  useEffect(() => {
    supabase
      .from('feedback')
      .select('id, name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setFeedback(data as Feedback[])
        }
      })
  }, [])

  return (
    <div style={{ padding: 28, fontFamily: "'Inter', system-ui, sans-serif", color: '#fafafa', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>Feedback</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>User feedback submitted from the app.</p>

      <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18 }}>
        {feedback.length === 0 ? (
          <p style={{ fontSize: 13, color: '#666' }}>No feedback yet.</p>
        ) : (
          feedback.map(f => (
            <div key={f.id} style={{ padding: '12px 0', borderTop: '1px solid #1f1f1f' }}>
              <div style={{ fontSize: 13, color: '#fafafa', marginBottom: 4 }}>{f.message}</div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {f.name} · {new Date(f.created_at).toLocaleString('en-GB')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
