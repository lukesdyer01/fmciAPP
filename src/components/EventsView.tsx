import { useState } from 'react'

type EventItem = {
  title: string; host: string; date: string; time: string; location: string;
  img: string; attending: number; interested: number; type: string;
  access: string; price: string; speakers: string[]; going: boolean; official: boolean;
}

const EVENTS: EventItem[] = []

const TYPE_COLOR: Record<string, { color: string; bg: string }> = {
  'Conference':        { color: '#1D4ED8', bg: '#EFF6FF' },
  'Prayer Call':       { color: '#6D28D9', bg: '#F5F3FF' },
  'Teaching':          { color: '#92700A', bg: '#FBF5E6' },
  'Leadership Meeting':{ color: '#C2410C', bg: '#FFF7ED' },
}

export default function EventsView() {
  const [filter, setFilter] = useState('All')

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-serif)' }}>Events</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Conferences, prayer calls, leadership meetings, and training sessions</p>
        </div>
        <button style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Create Event</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All', 'Conference', 'Prayer Call', 'Teaching', 'Leadership Meeting'].map(f => (
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {EVENTS.filter(e => filter === 'All' || e.type === filter).length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>No events yet</div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>Upcoming conferences, prayer calls, and leadership meetings will appear here.</div>
          </div>
        )}
        {EVENTS.filter(e => filter === 'All' || e.type === filter).map((event, i) => {
          const ts = TYPE_COLOR[event.type] ?? { color: '#374151', bg: '#F9FAFB' }
          return (
            <div key={i} className="grid-cover-280" style={{
              backgroundColor: 'var(--color-card)', borderRadius: '12px',
              border: `1px solid ${event.official ? 'var(--color-gold-border)' : 'var(--color-border)'}`,
              boxShadow: event.official ? '0 2px 12px rgba(184,145,42,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'relative', overflow: 'hidden', minHeight: '200px' }}>
                <img src={event.img} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1.3 }}>{event.title}</h2>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '14px' }}>Hosted by {event.host}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
                  {[
                    { icon: '📅', text: `${event.date} · ${event.time}` },
                    { icon: '📍', text: event.location },
                    { icon: '🎫', text: event.price },
                    { icon: '🔒', text: `Access: ${event.access}` },
                  ].map((row, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-2)' }}>
                      <span>{row.icon}</span><span>{row.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speakers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {event.speakers.map((s, j) => (
                      <span key={j} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '10px', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)', fontWeight: 600 }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>
                    <strong style={{ color: 'var(--color-text-1)' }}>{event.attending}</strong> going · <strong>{event.interested}</strong> interested
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      padding: '9px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: event.going ? 'var(--color-gold)' : 'var(--color-navy)',
                      color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                    }}>{event.going ? '✓ Going' : 'RSVP'}</button>
                    <button style={{
                      padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                      background: 'none', color: 'var(--color-text-2)', fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>Share</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
