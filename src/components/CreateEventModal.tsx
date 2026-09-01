import { useState } from 'react'
import { api } from '../api-client/server'

const EVENT_TYPES = ['Conference', 'Prayer Call', 'Teaching', 'Leadership Meeting']

export default function CreateEventModal({ orgId, orgName, onClose, onCreated }: {
  orgId?: string
  orgName?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState(EVENT_TYPES[0])
  const [access, setAccess] = useState('Open to all')
  const [price, setPrice] = useState('Free')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleCreate() {
    if (!title.trim()) { setErr('Event title is required.'); return }
    setSaving(true); setErr('')
    try {
      await api('/events', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), date, time, location, type, access, price,
          host: orgName ?? '', orgId, orgName, official: !!orgId,
        }),
      })
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create event.')
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
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>
            {orgName ? `New Event — ${orgName}` : 'Create Event'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Event Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Annual Leadership Summit" style={inputStyle} autoFocus />
          </div>
          <div className="grid-2">
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, venue, or 'Online'" style={inputStyle} />
          </div>
          <div className="grid-2">
            <div>
              <label style={labelStyle}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Price</label>
              <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Free" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Access</label>
            <input value={access} onChange={e => setAccess(e.target.value)} placeholder="Open to all" style={inputStyle} />
          </div>
          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
