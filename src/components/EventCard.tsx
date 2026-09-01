import { useState } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'

export interface EventItem {
  id: string
  title: string
  host: string
  orgId?: string | null
  orgName?: string | null
  date: string
  time: string
  location: string
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
  isGoing: boolean
  isInterested: boolean
}

export const TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  'Conference':         { color: '#1D4ED8', bg: '#EFF6FF' },
  'Prayer Call':        { color: '#6D28D9', bg: '#F5F3FF' },
  'Teaching':           { color: '#92700A', bg: '#FBF5E6' },
  'Leadership Meeting': { color: '#C2410C', bg: '#FFF7ED' },
}

export function UpcomingEvents({ events, onChanged, onEdit, showOrg = true }: { events: EventItem[]; onChanged: () => void; onEdit?: (event: EventItem) => void; showOrg?: boolean }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = events
    .filter(e => !e.date || e.date >= todayStr)
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
    .slice(0, 2)

  if (upcoming.length === 0) return null

  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>📅 Upcoming Events</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {upcoming.map(event => (
          <EventCard key={event.id} event={event} onChanged={onChanged} onEdit={onEdit} showOrg={showOrg} />
        ))}
      </div>
    </div>
  )
}

export function EventCard({ event, onChanged, onEdit, showOrg = true }: { event: EventItem; onChanged: () => void; onEdit?: (event: EventItem) => void; showOrg?: boolean }) {
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const [busy, setBusy] = useState(false)
  const ts = TYPE_COLOR[event.type] ?? { color: '#374151', bg: '#F9FAFB' }
  const canModify = currentUser?.id === event.createdBy || role === 'admin' || role === 'superadmin'

  async function rsvp(status: 'going' | 'interested' | null) {
    setBusy(true)
    try {
      await api(`/events/${event.id}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api(`/events/${event.id}`, { method: 'DELETE' })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid-cover-280" style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: `1px solid ${event.official ? 'var(--color-gold-border)' : 'var(--color-border)'}`,
      boxShadow: event.official ? '0 2px 12px rgba(184,145,42,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: '200px', backgroundColor: 'var(--color-surface)' }}>
        {event.img
          ? <img src={event.img} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)' }}>📅</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(255,255,255,0.1))' }} />
        {event.official && (
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            fontSize: '11px', fontWeight: 800, padding: '4px 10px',
            borderRadius: '20px', backgroundColor: 'var(--color-gold)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: '4px',
          }}>★ FMCI Official</div>
        )}
        <div style={{
          position: 'absolute', bottom: '12px', left: '12px',
          fontSize: '11px', fontWeight: 700, padding: '3px 10px',
          borderRadius: '20px', backgroundColor: ts.bg, color: ts.color,
          border: `1px solid ${ts.color}20`,
        }}>{event.type}</div>
      </div>
      <div style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1.3 }}>{event.title}</h2>
          {canModify && (
            <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
              {onEdit && (
                <button onClick={() => onEdit(event)} disabled={busy} title="Edit event" style={{
                  background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', color: 'var(--color-text-3)',
                  fontSize: '15px', padding: '2px 6px',
                }}>✏</button>
              )}
              <button onClick={handleDelete} disabled={busy} title="Delete event" style={{
                background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', color: 'var(--color-text-3)',
                fontSize: '16px', padding: '2px 6px',
              }}>🗑</button>
            </div>
          )}
        </div>
        {showOrg && event.orgName && (
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '14px' }}>Hosted by {event.orgName}</div>
        )}
        {!event.orgName && event.host && (
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '14px' }}>Hosted by {event.host}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
          {[
            { icon: '📅', text: [event.date, event.time].filter(Boolean).join(' · ') || 'Date TBA' },
            { icon: '📍', text: event.location || 'Location TBA' },
            { icon: '🎫', text: event.price || 'Free' },
            { icon: '🔒', text: `Access: ${event.access || 'Open to all'}` },
          ].map((row, j) => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
              <span>{row.icon}</span><span>{row.text}</span>
            </div>
          ))}
        </div>
        {event.infoUrl && (
          <div style={{ marginBottom: '16px' }}>
            <a href={event.infoUrl} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 700, color: 'var(--color-navy)', textDecoration: 'none',
            }}>🔗 More Info</a>
          </div>
        )}
        {event.speakers.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speakers</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {event.speakers.map((s, j) => (
                <span key={j} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '10px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>
            <strong style={{ color: 'var(--color-text-1)' }}>{event.attending}</strong> going · <strong style={{ color: 'var(--color-text-1)' }}>{event.interestedCount}</strong> interested
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => rsvp(event.isGoing ? null : 'going')}
              disabled={busy}
              style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: busy ? 'default' : 'pointer',
                backgroundColor: event.isGoing ? 'var(--color-gold)' : 'var(--color-navy)',
                color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)', opacity: busy ? 0.7 : 1,
              }}>{event.isGoing ? '✓ Going' : 'RSVP'}</button>
            <button
              onClick={() => rsvp(event.isInterested ? null : 'interested')}
              disabled={busy}
              style={{
                padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: event.isInterested ? 'var(--color-surface)' : 'none',
                color: event.isInterested ? 'var(--color-navy)' : 'var(--color-text-2)', fontSize: '13px',
                fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: busy ? 0.7 : 1,
              }}>{event.isInterested ? '★ Interested' : 'Interested'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
