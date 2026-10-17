import { useEffect, useState } from 'react'
import { api } from '../../../api-client/server'

type ReviewStatus = 'pending' | 'approved' | 'denied'
interface RoleRequest {
  userId: string
  role: string
  status: ReviewStatus
  name: string
  email: string
  church: string
  requestedAt: string
}

export default function MinistryRoleApprovals() {
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<ReviewStatus>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  async function load() {
    setLoading(true)
    setError('')
    try { setRequests(await api<RoleRequest[]>('/ministry-role-requests')) }
    catch { setError('Unable to load fivefold role requests. Please retry.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function review(request: RoleRequest, decision: 'approve' | 'deny') {
    const key = `${request.userId}:${request.role}`
    setBusy(key)
    setError('')
    try {
      await api(`/ministry-role-requests/${encodeURIComponent(request.userId)}/${encodeURIComponent(request.role)}/${decision}`, { method: 'POST' })
      setRequests(rows => rows.map(row => row.userId === request.userId && row.role === request.role
        ? { ...row, status: decision === 'approve' ? 'approved' : 'denied' } : row))
    } catch { setError('Unable to review this role. Refresh the list and try again.') }
    finally { setBusy(null) }
  }

  const visible = requests.filter(r => r.status === filter)
  return <section style={{ padding: '20px', background: '#161b22', borderRadius: '12px', border: '1px solid rgba(200,155,60,0.25)', marginBottom: '28px', color: '#e6edf3' }}>
    <h2 style={{ margin: '0 0 8px', fontSize: '18px' }}>Fivefold role approvals</h2>
    <p style={{ fontSize: '13px', color: '#a4acb8', lineHeight: 1.5 }}>Review Pastor, Teacher, Evangelist, Apostle, and Prophet requests. Roles appear on member profiles only after approval.</p>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {(['pending', 'approved', 'denied'] as const).map(status => <button key={status} onClick={() => setFilter(status)} style={{ padding: '8px 12px', borderRadius: '8px', background: filter === status ? 'rgba(200,155,60,0.2)' : '#21262d', color: filter === status ? 'var(--color-gold)' : '#adb5c0', border: '1px solid #3c4149', textTransform: 'capitalize', cursor: 'pointer' }}>{status} ({requests.filter(r => r.status === status).length})</button>)}
      <button onClick={load} disabled={loading} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#a4acb8', cursor: 'pointer' }}>Refresh</button>
    </div>
    {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
    {loading ? <p>Loading role requests…</p> : !error && visible.length === 0 ? <p style={{ color: '#a4acb8', fontSize: '13px' }}>No {filter} fivefold role requests.</p> : visible.map(request => {
      const key = `${request.userId}:${request.role}`
      return <div key={key} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #30363d' }}>
        <div style={{ flex: '1 1 200px' }}>
          <strong>{request.name || request.email}</strong><span style={{ color: 'var(--color-gold)', marginLeft: '10px' }}>{request.role}</span>
          <div style={{ color: '#a4acb8', fontSize: '12px', marginTop: '5px' }}>{[request.email, request.church].filter(Boolean).join(' · ')}</div>
          <div style={{ color: '#818996', fontSize: '11px', marginTop: '4px' }}>Requested {new Date(request.requestedAt).toLocaleDateString()}</div>
        </div>
        {request.status === 'pending' && <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={busy === key} onClick={() => review(request, 'approve')} style={{ padding: '8px 14px', borderRadius: '7px', background: '#163526', color: '#6ee7a3', border: '1px solid #2c6548', cursor: 'pointer' }}>{busy === key ? 'Saving…' : 'Approve'}</button>
          <button disabled={busy === key} onClick={() => review(request, 'deny')} style={{ padding: '8px 14px', borderRadius: '7px', background: '#351c20', color: '#fca5a5', border: '1px solid #64343a', cursor: 'pointer' }}>Deny</button>
        </div>}
      </div>
    })}
  </section>
}
