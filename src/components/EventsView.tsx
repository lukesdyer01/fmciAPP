import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { EventCard, type EventItem } from './EventCard'
import CreateEventModal from './CreateEventModal'

const FILTERS = ['All', 'Conference', 'Prayer Call', 'Teaching', 'Leadership Meeting']

export default function EventsView() {
  const [filter, setFilter] = useState('All')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    try {
      const data = await api<EventItem[]>('/events')
      setEvents(data)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = events.filter(e => filter === 'All' || e.type === filter)

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-serif)' }}>Events</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Conferences, prayer calls, leadership meetings, and training sessions — including events from ministries across the network</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Create Event</button>
      </div>

      {showCreate && (
        <CreateEventModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
            backgroundColor: filter === f ? 'var(--color-navy)' : 'var(--color-card)',
            color: filter === f ? '#fff' : 'var(--color-text-2)',
            border: filter === f ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}>{f}</button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading events…</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>
              {events.length === 0 ? 'No events yet' : 'No events match this filter'}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              {events.length === 0 ? 'Upcoming conferences, prayer calls, and leadership meetings will appear here.' : 'Try a different type filter.'}
            </div>
          </div>
        )}
        {!loading && filtered.map(event => (
          <EventCard key={event.id} event={event} onChanged={load} />
        ))}
      </div>
    </div>
  )
}
