import { useState, useRef } from 'react'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'
import type { EventItem } from './EventCard'

const EVENT_TYPES = ['Conference', 'Prayer Call', 'Teaching', 'Leadership Meeting']

export default function CreateEventModal({ orgId, orgName, event, onClose, onCreated }: {
  orgId?: string
  orgName?: string
  // When set, the modal edits this existing event instead of creating a new one.
  event?: EventItem
  onClose: () => void
  onCreated: () => void
}) {
  const { currentUser } = useAuth()
  const [title, setTitle] = useState(event?.title ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [time, setTime] = useState(event?.time ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [isRemote, setIsRemote] = useState(event?.isRemote ?? false)
  const [zoomLink, setZoomLink] = useState(event?.zoomLink ?? '')
  const [zoomPassword, setZoomPassword] = useState(event?.zoomPassword ?? '')
  const [type, setType] = useState(event?.type ?? EVENT_TYPES[0])
  const [access, setAccess] = useState(event?.access ?? 'Open to all')
  const [price, setPrice] = useState(event?.price ?? 'Free')
  const [img, setImg] = useState(event?.img ?? '')
  const [infoUrl, setInfoUrl] = useState(event?.infoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/event-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setImg(data.publicUrl)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    if (!title.trim()) { setErr('Event title is required.'); return }
    setSaving(true); setErr('')
    try {
      if (event) {
        await api(`/events/${event.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(), date, time, location, type, access, price, img, infoUrl: infoUrl.trim(),
            isRemote, zoomLink: isRemote ? zoomLink.trim() : '', zoomPassword: isRemote ? zoomPassword.trim() : '',
          }),
        })
      } else {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(), date, time, location, type, access, price, img, infoUrl: infoUrl.trim(),
            isRemote, zoomLink: isRemote ? zoomLink.trim() : '', zoomPassword: isRemote ? zoomPassword.trim() : '',
            host: orgName ?? '', orgId, orgName, official: !!orgId,
          }),
        })
      }
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? `Failed to ${event ? 'update' : 'create'} event.`)
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
            {event ? 'Edit Event' : orgName ? `New Event — ${orgName}` : 'Create Event'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                background: img ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
              }}>
                {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📅'}
              </div>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.15s', fontSize: '16px',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
              >📷</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{uploading ? 'Uploading…' : 'Event Image'}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Click to {img ? 'change' : 'upload'} (optional)</div>
            </div>
          </div>
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
          <div
            role="switch"
            aria-checked={isRemote}
            tabIndex={0}
            onClick={() => setIsRemote(v => !v)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsRemote(v => !v) } }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{
              width: '36px', height: '20px', borderRadius: '10px', position: 'relative', flexShrink: 0,
              backgroundColor: isRemote ? 'var(--color-navy)' : 'var(--color-border)', transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.15s', left: isRemote ? '18px' : '2px',
              }} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)' }}>
              💻 This is a remote meeting
            </span>
          </div>
          {isRemote && (
            <>
              <div>
                <label style={labelStyle}>Zoom Link</label>
                <input value={zoomLink} onChange={e => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Zoom Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input value={zoomPassword} onChange={e => setZoomPassword(e.target.value)} placeholder="Passcode" style={inputStyle} />
              </div>
            </>
          )}
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
          <div>
            <label style={labelStyle}>More Info URL</label>
            <input value={infoUrl} onChange={e => setInfoUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
          </div>
          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving || uploading} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>
            {saving ? (event ? 'Saving…' : 'Creating…') : event ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
