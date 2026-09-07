import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useUIStore } from '../store/ui'
import { type EventItem, formatEventWhen, TYPE_COLOR } from './EventCard'
import CreateEventModal from './CreateEventModal'
import { openExternal } from '../lib/openExternal'

interface MeetingSeries {
  id: string
  title: string
  description: string
  orgId: string
  orgName: string
  cadence: string
  location: string
  zoomLink?: string
  zoomPassword?: string
  visibility: 'public' | 'private'
  createdBy: string
  occurrenceCount: number
  occurrences: EventItem[]
}

// The bookmarkable hub for a recurring meeting — every occurrence in one
// place, newest first, each linking to its own dated discussion thread.
// This is the answer to "the thread gets lost over time": the series has
// one stable URL you can always come back to, unlike a comment thread
// buried in a single event card.
export default function MeetingSeriesView({ seriesId, onBack }: { seriesId: string; onBack: () => void }) {
  const [series, setSeries] = useState<MeetingSeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddOccurrence, setShowAddOccurrence] = useState(false)
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()

  async function load() {
    setLoading(true)
    try {
      const data = await api<MeetingSeries>(`/meeting-series/${seriesId}`)
      setSeries(data)
    } catch {
      setSeries(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [seriesId])

  const viewEvent = useUIStore(s => s.viewEvent)
  const isAdmin = role === 'admin' || role === 'superadmin'
  const canManage = !!currentUser && (isAdmin || series?.createdBy === currentUser.id)

  const backBtn = (
    <button onClick={onBack} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 0 14px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
    }}>← Back to Events</button>
  )

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading…</div>
  }

  if (!series) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {backBtn}
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔁</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)' }}>Recurring meeting not found</div>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = series.occurrences.filter(e => e.startDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))
  const past = series.occurrences.filter(e => e.startDate < today)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {backBtn}

      {showAddOccurrence && (
        <CreateEventModal
          orgId={series.orgId}
          orgName={series.orgName}
          seriesId={series.id}
          onClose={() => setShowAddOccurrence(false)}
          onCreated={() => { setShowAddOccurrence(false); load() }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>🔁 {series.title}</h1>
        {series.visibility === 'private' && (
          <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)', flexShrink: 0 }}>🔒 Members Only</span>
        )}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '16px' }}>Hosted by {series.orgName}</div>

      {series.description && (
        <p style={{ margin: '0 0 16px', fontSize: '15px', lineHeight: 1.6, color: 'var(--color-text-1)' }}>{series.description}</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '12px' }}>
        {series.cadence && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-text-1)' }}><span>🗓</span><span>{series.cadence}</span></div>
        )}
        {series.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-text-1)' }}><span>📍</span><span>{series.location}</span></div>
        )}
        {series.zoomLink && (
          <a href={series.zoomLink} onClick={e => { e.preventDefault(); openExternal(series.zoomLink!) }} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: 'var(--color-navy)', textDecoration: 'none' }}>💻 Join Zoom Meeting</a>
        )}
        {series.zoomPassword && (
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>Passcode: <strong style={{ color: 'var(--color-text-1)' }}>{series.zoomPassword}</strong></div>
        )}
      </div>

      {canManage && (
        <button onClick={() => setShowAddOccurrence(true)} style={{
          marginBottom: '28px', padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Add Occurrence</button>
      )}

      {series.occurrences.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)' }}>No occurrences yet</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginTop: '6px' }}>
            {canManage ? 'Add the first date above.' : 'Check back once the next meeting is scheduled.'}
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <OccurrenceGroup label="Upcoming" occurrences={upcoming} onOpen={viewEvent} />
          )}
          {past.length > 0 && (
            <OccurrenceGroup label="Past" occurrences={past.slice().reverse()} onOpen={viewEvent} />
          )}
        </>
      )}
    </div>
  )
}

function OccurrenceGroup({ label, occurrences, onOpen }: { label: string; occurrences: EventItem[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {occurrences.map(e => {
          const ts = TYPE_COLOR[e.type] ?? { color: '#374151', bg: '#F9FAFB' }
          const commentCount = (e.commentsList ?? []).length
          return (
            <div key={e.id} onClick={() => onOpen(e.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '14px 16px', backgroundColor: 'var(--color-card)', borderRadius: '10px',
              border: '1px solid var(--color-border)', cursor: 'pointer',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{formatEventWhen(e)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', backgroundColor: ts.bg, color: ts.color }}>{e.type}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{e.attending} going</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)', fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                💬 {commentCount > 0 ? commentCount : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

