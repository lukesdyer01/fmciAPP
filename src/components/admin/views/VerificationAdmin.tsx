import { useState, useEffect } from 'react'
import { api } from '../../../api-client/server'

interface VerificationRequest {
  id: string
  userId: string
  name: string
  avatarUrl: string
  email: string
  title: string
  church: string
  location: string
  reason: string
  submittedAt: string
  status: 'pending' | 'approved' | 'denied'
}

export default function VerificationAdmin() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api<VerificationRequest[]>('/verification-requests').then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)
  const detail = requests.find(r => r.id === selected)

  async function approve(id: string) {
    setBusyId(id)
    try {
      await api(`/verification-requests/${id}/approve`, { method: 'POST' })
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status: 'approved' } : r))
      setSelected(null)
    } finally {
      setBusyId(null)
    }
  }

  async function deny(id: string) {
    setBusyId(id)
    try {
      await api(`/verification-requests/${id}/deny`, { method: 'POST' })
      setRequests(rs => rs.map(r => r.id === id ? { ...r, status: 'denied' } : r))
      setSelected(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={detail ? 'grid-aside-400' : 'grid-1'}>
      {/* List */}
      <div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', alignItems: 'center' }}>
          {(['all', 'pending', 'approved', 'denied'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 16px', borderRadius: '8px',
              border: `1px solid ${filter === f ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
              backgroundColor: filter === f ? 'rgba(200,155,60,0.1)' : 'transparent',
              color: filter === f ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
            }}>
              {f} {f !== 'all' && `(${requests.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Loading requests…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
                {filter === 'pending' ? 'No pending verification requests' : `No ${filter} requests`}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Verification requests submitted by members will appear here.
              </div>
            </div>
          )}
          {!loading && filtered.map(req => {
            const isSelected = selected === req.id
            return (
              <div key={req.id} onClick={() => setSelected(isSelected ? null : req.id)} style={{
                backgroundColor: '#161b22', borderRadius: '12px',
                border: `1px solid ${isSelected ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.06)'}`,
                padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
                opacity: req.status !== 'pending' ? 0.65 : 1,
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {req.avatarUrl
                    ? <img src={req.avatarUrl} alt={req.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', fontWeight: 800, fontSize: '15px' }}>{(req.name || '?').slice(0, 2).toUpperCase()}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{req.name || req.email}</span>
                      {req.status !== 'pending' && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: req.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: req.status === 'approved' ? '#22c55e' : '#f87171', textTransform: 'capitalize' }}>{req.status}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                      {[req.title, req.church, req.location].filter(Boolean).join(' · ')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px', lineHeight: 1.5 }}>{req.reason}</div>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Submitted {new Date(req.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button disabled={busyId === req.id} onClick={() => approve(req.id)} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '12px', fontWeight: 700, cursor: busyId === req.id ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: busyId === req.id ? 0.6 : 1 }}>Approve</button>
                      <button disabled={busyId === req.id} onClick={() => deny(req.id)} style={{ padding: '6px 14px', borderRadius: '7px', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: busyId === req.id ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: busyId === req.id ? 0.6 : 1 }}>Deny</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(200,155,60,0.2)', padding: '22px', height: 'fit-content', position: 'sticky', top: '80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>Verification Detail</div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
            {detail.avatarUrl
              ? <img src={detail.avatarUrl} alt={detail.name} style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover' }} />
              : <div style={{ width: '52px', height: '52px', borderRadius: '12px', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', fontWeight: 800, fontSize: '18px' }}>{(detail.name || '?').slice(0, 2).toUpperCase()}</div>
            }
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#e6edf3', marginBottom: '3px' }}>{detail.name || detail.email}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{detail.email}</div>
            </div>
          </div>
          <Section label="Title / Role">
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{detail.title || '—'}</p>
          </Section>
          <Section label="Church / Ministry">
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{detail.church || '—'}{detail.location ? ` · ${detail.location}` : ''}</p>
          </Section>
          <Section label="Reason for Request">
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{detail.reason}</p>
          </Section>
          {detail.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <button disabled={busyId === detail.id} onClick={() => approve(detail.id)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>✓ Approve</button>
              <button disabled={busyId === detail.id} onClick={() => deny(detail.id)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Deny</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}
