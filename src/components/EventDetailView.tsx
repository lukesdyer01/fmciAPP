import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { type EventItem, formatEventWhen, TYPE_COLOR } from './EventCard'
import CommentThread from './CommentThread'

// A single event's permalink page — full info, RSVP, and its discussion
// thread. Replaces the old scroll-to-card-in-the-list behavior so a
// specific meeting (especially a recurring one) always has a stable,
// bookmarkable/shareable URL instead of getting lost in a flat feed.
export default function EventDetailView({ eventId, onBack }: { eventId: string; onBack: () => void }) {
  const [event, setEvent] = useState<EventItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const viewMeetingSeries = useUIStore(s => s.viewMeetingSeries)
  const isAdmin = role === 'admin' || role === 'superadmin'

  async function load() {
    setLoading(true)
    try {
      const events = await api<EventItem[]>('/events')
      setEvent(events.find(e => e.id === eventId) ?? null)
    } catch {
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId])

  async function rsvp(status: 'going' | 'interested' | null) {
    setBusy(true)
    try {
      const updated = await api<EventItem>(`/events/${eventId}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) })
      setEvent(updated)
    } finally {
      setBusy(false)
    }
  }

  async function submitComment(text: string) {
    setCommenting(true)
    try {
      const updated = await api<EventItem>(`/events/${eventId}/comments`, { method: 'POST', body: JSON.stringify({ text }) })
      setEvent(updated)
    } finally {
      setCommenting(false)
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm('Delete this comment?')) return
    const updated = await api<EventItem>(`/events/${eventId}/comments/${commentId}`, { method: 'DELETE' })
    setEvent(updated)
  }

  const backBtn = (
    <button onClick={onBack} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 0 14px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
    }}>← Back to Events</button>
  )

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading…</div>
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {backBtn}
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)' }}>Event not found</div>
        </div>
      </div>
    )
  }

  const ts = TYPE_COLOR[event.type] ?? { color: '#374151', bg: '#F9FAFB' }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {backBtn}

      {event.img && (
        <img src={event.img} alt="" style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '14px', marginBottom: '20px', display: 'block' }} />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: ts.bg, color: ts.color }}>{event.type}</span>
        {event.visibility === 'private' && (
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)' }}>🔒 Members Only</span>
        )}
        {event.official && (
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: 'var(--color-gold)', color: '#fff' }}>★ {event.orgId === 'org_fmci' ? 'FMCI Official' : 'Official'}</span>
        )}
      </div>

      <h1 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>{event.title}</h1>

      {event.seriesId && (
        <button onClick={() => viewMeetingSeries(event.seriesId!)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold)',
          fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)', padding: 0,
        }}>🔁 Part of a recurring meeting — view all occurrences →</button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '12px' }}>
        {[
          { icon: '📅', text: formatEventWhen(event) },
          event.isRemote ? { icon: '💻', text: 'Remote — join via Zoom' } : { icon: '📍', text: event.location || 'Location TBA' },
          { icon: '🎫', text: event.price || 'Free' },
          { icon: '🔒', text: `Access: ${event.access || 'Open to all'}` },
          ...(event.orgName ? [{ icon: '🏛', text: `Hosted by ${event.orgName}` }] : event.host ? [{ icon: '🏛', text: `Hosted by ${event.host}` }] : []),
        ].map((row, j) => (
          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-text-1)' }}>
            <span>{row.icon}</span><span>{row.text}</span>
          </div>
        ))}
        {event.isRemote && (event.zoomLink || event.zoomPassword) && (
          <div style={{ marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            {event.zoomLink && (
              <a href={event.zoomLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)', textDecoration: 'none' }}>💻 Join Zoom Meeting</a>
            )}
            {event.zoomPassword && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginTop: '6px' }}>Passcode: <strong style={{ color: 'var(--color-text-1)' }}>{event.zoomPassword}</strong></div>
            )}
          </div>
        )}
        {event.infoUrl && (
          <div style={{ marginTop: event.isRemote ? 0 : '6px', paddingTop: event.isRemote ? 0 : '12px', borderTop: event.isRemote ? 'none' : '1px solid var(--color-border)' }}>
            <a href={event.infoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)', textDecoration: 'none' }}>🔗 More Info</a>
          </div>
        )}
      </div>

      {event.speakers.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speakers</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {event.speakers.map((s, j) => (
              <span key={j} style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '10px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)', fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '10px' }}>
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

      <div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-1)', marginBottom: '14px' }}>
          💬 Discussion{(event.commentsList ?? []).length > 0 ? ` (${event.commentsList!.length})` : ''}
        </div>
        <CommentThread
          comments={event.commentsList ?? []}
          onSubmit={submitComment}
          onDelete={deleteComment}
          submitting={commenting}
          currentUserId={currentUser?.id}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
