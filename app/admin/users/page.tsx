const MOCK_USERS = [
  { name: 'Tom Marsh', email: 'tom@ironcladbuilds.co.uk', plan: 'Pro', status: 'Active', joined: '2026-06-08' },
  { name: 'Sarah Chen', email: 'sarah@chenconstruction.co.uk', plan: 'Starter', status: 'Active', joined: '2026-06-05' },
  { name: 'James Okafor', email: 'james@okaforgroup.co.uk', plan: 'Enterprise', status: 'Active', joined: '2026-06-01' },
]

export default function AdminUsersPage() {
  return (
    <div style={{ padding: 28, fontFamily: "'Inter', system-ui, sans-serif", color: '#fafafa', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4 }}>Users</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>All registered BuildOps accounts.</p>

      <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 14, padding: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#666', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Name</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Email</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Plan</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Status</th>
              <th style={{ paddingBottom: 8, fontWeight: 500 }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map(u => (
              <tr key={u.email} style={{ borderTop: '1px solid #1f1f1f' }}>
                <td style={{ padding: '8px 0', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '8px 0', color: '#a1a1aa' }}>{u.email}</td>
                <td style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', background: 'rgba(99,102,241,.12)', padding: '2px 8px', borderRadius: 999 }}>{u.plan}</span>
                </td>
                <td style={{ padding: '8px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>{u.status}</span>
                </td>
                <td style={{ padding: '8px 0', color: '#666' }}>{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
