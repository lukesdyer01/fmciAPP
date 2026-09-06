import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'

interface MyMinistry { id: string; name: string; members: { userId: string; role: string }[] }

export default function CreateMeetingSeriesModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (seriesId: string) => void
}) {
  const { currentUser } = useAuth()
  const [ministries, setMinistries] = useState<MyMinistry[]>([])
  const [orgId, setOrgId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState('')
  const [location, setLocation] = useState('')
  const [zoomLink, setZoomLink] = useState('')
  const [zoomPassword, setZoomPassword] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!currentUser) return
    api<MyMinistry[]>('/orgs/my').then(orgs => {
      const managed = orgs.filter(o => {
        const role = o.members?.find(m => m.userId === currentUser.id)?.role
        return role === 'owner' || role === 'admin'
      })
      setMinistries(managed)
      if (managed.length > 0) setOrgId(managed[0].id)
    }).catch(() => setMinistries([]))
  }, [currentUser?.id])

  async function handleCreate() {
    if (!title.trim()) { setErr('Series title is required.'); return }
    if (!orgId) { setErr('Select a ministry to host this recurring meeting.'); return }
    setSaving(true); setErr('')
    try {
      const created = await api<{ id: string }>('/meeting-series', {
        method: 'POST',
        body: JSON.stringify({ orgId, title: title.trim(), description: description.trim(), cadence: cadence.trim(), location: location.trim(), zoomLink: zoomLink.trim(), zoomPassword: zoomPassword.trim(), visibility }),
      })
      onCreated(created.id)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create meeting series.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '14px',
    fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>New Recurring Meeting</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Creates a bookmarkable hub for a meeting that happens repeatedly (a weekly prayer call, a monthly strategy meeting). Add each individual occurrence to it afterward from the hub page.
          </div>
          {ministries.length === 0 ? (
            <div style={{ padding: '14px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
              You need to be an owner or admin of a ministry to create a recurring meeting for it.
            </div>
          ) : (
            <div>
              <label style={labelStyle}>Ministry</label>
              <select value={orgId} onChange={e => setOrgId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Tuesday Prayer Call" style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this meeting for?" rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
          </div>
          <div>
            <label style={labelStyle}>Cadence</label>
            <input value={cadence} onChange={e => setCadence(e.target.value)} placeholder="e.g. Weekly, Tuesdays 7pm CT" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, venue, or 'Online'" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Zoom Link <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional, reused for every occurrence)</span></label>
            <input value={zoomLink} onChange={e => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/…" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Zoom Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input value={zoomPassword} onChange={e => setZoomPassword(e.target.value)} placeholder="Passcode" style={inputStyle} />
          </div>
          <div
            role="switch"
            aria-checked={visibility === 'private'}
            tabIndex={0}
            onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVisibility(v => v === 'public' ? 'private' : 'public') } }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{
              width: '36px', height: '20px', borderRadius: '10px', position: 'relative', flexShrink: 0,
              backgroundColor: visibility === 'private' ? 'var(--color-navy)' : 'var(--color-border)', transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.15s', left: visibility === 'private' ? '18px' : '2px',
              }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)' }}>
              🔒 Members only — hide from non-members
            </span>
          </div>
          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || ministries.length === 0} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving || ministries.length === 0 ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
