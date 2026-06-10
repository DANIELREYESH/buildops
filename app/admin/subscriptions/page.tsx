const MOCK_SUBSCRIPTIONS = [
  { name: 'Tom Marsh', plan: 'Pro', price: '£119/mo', status: 'Active', renews: '2026-07-08' },
  { name: 'Sarah Chen', plan: 'Starter', price: '£49/mo', status: 'Active', renews: '2026-07-05' },
  { name: 'James Okafor', plan: 'Enterprise', price: '£429/mo', status: 'Active', renews: '2026-07-01' },
]

export default function AdminSubscriptionsPage() {
  const total = '£597/mo'

  return (
    <div style={{ padding: 28, fontFamily: "'Inter', system-ui, sans-serif", color: '#fafafa', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>Subscriptions</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Active subscriptions and recurring revenue.</p>

      <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18, marginBottom: 16, maxWidth: 280 }}>
        <div style={{ fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>MRR</div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.5px' }}>{total}</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{MOCK_SUBSCRIPTIONS.length} active subscriptions</div>
      </div>

      <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#666', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Customer</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Plan</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Price</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Renews</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SUBSCRIPTIONS.map(s => (
              <tr key={s.name} style={{ borderTop: '1px solid #1f1f1f' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', background: 'rgba(99,102,241,.12)', padding: '2px 8px', borderRadius: 999 }}>{s.plan}</span>
                </td>
                <td style={{ padding: '8px 0', color: '#a1a1aa' }}>{s.price}</td>
                <td style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>{s.status}</span>
                </td>
                <td style={{ padding: '8px 0', color: '#666' }}>{s.renews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
