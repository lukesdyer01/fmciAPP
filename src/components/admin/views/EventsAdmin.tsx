import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api-client/server'
import { formatEventWhen } from '../../EventCard'

interface AdminEvent {
  id: string
  title: string
  host: string
  orgId?: string | null
  orgName?: string | null
  startDate: string
  startTime: string
  endDate?: string
  endTime?: string
  location: string
  isRemote?: boolean
  zoomLink?: string
  zoomPassword?: string
  img: string
  infoUrl?: string
  type: string
  access: string
  price: string
  speakers: string[]
  official: boolean
  createdBy: string
  attending: number
  interestedCount: number
}

const EVENT_TYPES = ['Conference', 'Prayer Call', 'Teaching', 'Leadership Meeting', 'Gathering', 'Book Study']

function adminActionBtn(color: string): React.CSSProperties {
  return { flex: 1, padding: '7px 10px', borderRadius: '7px', border: `1px solid ${color}30`, backgroundColor: color + '12', color, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
}
function inputStyle(): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }
}
function labelStyle(): React.CSSProperties {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function EditPanel({ event, onSave, onClose }: { event: AdminEvent; onSave: (updated: AdminEvent) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<AdminEvent>({ ...event })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  function set<K extends keyof AdminEvent>(key: K, value: AdminEvent[K]) { setDraft(d => ({ ...d, [key]: value })) }

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      const updated = await api<AdminEvent>(`/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: draft.title, startDate: draft.startDate, startTime: draft.startTime, endDate: draft.endDate ?? '', endTime: draft.endTime ?? '', location: draft.location,
          isRemote: draft.isRemote, zoomLink: draft.isRemote ? (draft.zoomLink ?? '') : '', zoomPassword: draft.isRemote ? (draft.zoomPassword ?? '') : '',
          type: draft.type, access: draft.access, price: draft.price, img: draft.img,
          infoUrl: draft.infoUrl ?? '', speakers: draft.speakers, official: draft.official,
        }),
      })
      onSave(updated)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-manage-panel" style={{ backgroundColor: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#0d1117', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#e6edf3' }}>Edit Event</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{event.title}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
      </div>

      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {(event.orgName || event.host) && (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
            Hosted by <strong style={{ color: '#e6edf3' }}>{event.orgName ?? event.host}</strong>
          </div>
        )}
        <div>
          <label style={labelStyle()}>Event Title</label>
          <input value={draft.title} onChange={e => set('title', e.target.value)} style={inputStyle()} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle()}>Start Date</label>
            <input type="date" value={draft.startDate} onChange={e => set('startDate', e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <label style={labelStyle()}>Start Time</label>
            <input type="time" value={draft.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle()}>End Date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input type="date" value={draft.endDate ?? ''} onChange={e => set('endDate', e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <label style={labelStyle()}>End Time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input type="time" value={draft.endTime ?? ''} onChange={e => set('endTime', e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div>
          <label style={labelStyle()}>Location</label>
          <input value={draft.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="City, venue, or 'Online'" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>Remote Meeting</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Show a Zoom link and passcode on this event</div>
          </div>
          <button onClick={() => set('isRemote', !draft.isRemote)} style={{ width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', backgroundColor: draft.isRemote ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
            <span style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', left: draft.isRemote ? '21px' : '3px' }} />
          </button>
        </div>
        {draft.isRemote && (
          <>
            <div>
              <label style={labelStyle()}>Zoom Link</label>
              <input value={draft.zoomLink ?? ''} onChange={e => set('zoomLink', e.target.value)} style={inputStyle()} placeholder="https://zoom.us/j/…" />
            </div>
            <div>
              <label style={labelStyle()}>Zoom Password <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input value={draft.zoomPassword ?? ''} onChange={e => set('zoomPassword', e.target.value)} style={inputStyle()} placeholder="Passcode" />
            </div>
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle()}>Type</label>
            <select value={draft.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
              {EVENT_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#161b22' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle()}>Price</label>
            <input value={draft.price} onChange={e => set('price', e.target.value)} style={inputStyle()} placeholder="Free" />
          </div>
        </div>
        <div>
          <label style={labelStyle()}>Access</label>
          <input value={draft.access} onChange={e => set('access', e.target.value)} style={inputStyle()} placeholder="Open to all" />
        </div>
        <div>
          <label style={labelStyle()}>Image URL</label>
          <input value={draft.img} onChange={e => set('img', e.target.value)} style={inputStyle()} placeholder="https://…" />
        </div>
        <div>
          <label style={labelStyle()}>More Info URL</label>
          <input value={draft.infoUrl ?? ''} onChange={e => set('infoUrl', e.target.value)} style={inputStyle()} placeholder="https://…" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>FMCI Official</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Show the official badge on this event</div>
          </div>
          <button onClick={() => set('official', !draft.official)} style={{ width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', backgroundColor: draft.official ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
            <span style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', left: draft.official ? '21px' : '3px' }} />
          </button>
        </div>
        {err && <div style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, backgroundColor: '#0d1117' }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Discard</button>
        <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', cursor: saving ? 'default' : 'pointer', border: 'none', background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-sans)', transition: 'background 0.3s', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ── Main EventsAdmin ────────────────────────────────────────────────────────────
export default function EventsAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const editingEvent = events.find(e => e.id === editingId) ?? null

  const load = useCallback(() => {
    setLoading(true)
    api<AdminEvent[]>('/events').then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = events.filter(e => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.location ?? '').toLowerCase().includes(search.toLowerCase()) || (e.orgName ?? e.host ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || e.type === typeFilter
    return matchSearch && matchType
  })

  const saveEvent = (updated: AdminEvent) =>
    setEvents(es => es.map(e => e.id === updated.id ? updated : e))

  async function deleteEvent(id: string) {
    try {
      await api(`/events/${id}`, { method: 'DELETE' })
      setEvents(es => es.filter(e => e.id !== id))
    } catch {
      // leave list as-is; the delete failed server-side
    }
    setConfirmDeleteId(null)
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className="admin-view-container" style={{ paddingRight: editingId ? '456px' : '0', transition: 'padding-right 0.25s' }}>
      {/* Summary row */}
      <div className="grid-stats-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Events',    value: events.length,                                            color: 'var(--color-gold)' },
          { label: 'FMCI Official',   value: events.filter(e => e.official).length,                     color: '#60a5fa' },
          { label: 'Ministry Events', value: events.filter(e => !!e.orgId).length,                       color: '#a78bfa' },
          { label: 'Total RSVPs',     value: events.reduce((sum, e) => sum + (e.attending ?? 0), 0),     color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(['all', ...EVENT_TYPES] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${typeFilter === t ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: typeFilter === t ? 'rgba(200,155,60,0.1)' : 'transparent', color: typeFilter === t ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Loading events…</div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>📅</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
            {search ? 'No events match your search' : 'No events yet'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {search ? 'Try a different name or location.' : 'Events created by members and ministries will appear here.'}
          </div>
        </div>
      )}

      {/* Event cards grid */}
      {!loading && filtered.length > 0 && (
        <div className={editingId ? 'grid-1' : 'grid-2-auto'} style={{ gap: '14px' }}>
          {filtered.map(event => {
            const isEditing = editingId === event.id
            return (
              <div key={event.id} style={{ backgroundColor: isEditing ? 'rgba(200,155,60,0.06)' : '#161b22', borderRadius: '12px', border: `1px solid ${isEditing ? 'rgba(200,155,60,0.3)' : 'rgba(255,255,255,0.06)'}`, padding: '18px 20px', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, overflow: 'hidden' }}>
                    {event.img ? <img src={event.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📅'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{event.title}</span>
                      {event.official && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'rgba(200,155,60,0.15)', color: 'var(--color-gold)' }}>★ Official</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {formatEventWhen(event)} · {event.location || 'Location TBA'}
                    </div>
                    {(event.orgName ?? event.host) && <div style={{ fontSize: '11px', color: 'var(--color-gold)', marginTop: '2px' }}>Hosted by {event.orgName ?? event.host}</div>}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{event.type}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{event.attending ?? 0}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Going</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{event.interestedCount ?? 0}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Interested</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {confirmDeleteId === event.id ? (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, flex: 1 }}>Delete "{event.title}"? This cannot be undone.</span>
                      <button onClick={() => deleteEvent(event.id)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditingId(isEditing ? null : event.id)} style={adminActionBtn(isEditing ? 'var(--color-gold)' : '#60a5fa')}>{isEditing ? '← Close' : '✏ Edit'}</button>
                      <button onClick={() => { setConfirmDeleteId(event.id); setEditingId(null) }} style={adminActionBtn('#f87171')}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingEvent && <EditPanel event={editingEvent} onSave={saveEvent} onClose={() => setEditingId(null)} />}
    </div>
  )
}
