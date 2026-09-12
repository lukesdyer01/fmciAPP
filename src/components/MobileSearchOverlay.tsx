// Full-screen search for phones — the desktop search box is hidden below
// 768px, so this is the only way to search on a phone. Same results, same
// navigation, presented as a focused overlay with the keyboard up.

import { useEffect, useRef, useState } from 'react'
import { useSearchResults } from '../lib/search'
import { useUIStore } from '../store/ui'
import { useOpenProfile } from './ProfileView'
import type { ActiveView } from '../App'

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase',
  letterSpacing: '0.6px', padding: '14px 18px 6px',
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 18px',
  border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
  fontFamily: 'var(--font-sans)', minHeight: '48px',
}

export default function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const setActiveView = useUIStore(s => s.setActiveView)
  const openProfile = useOpenProfile()
  const results = useSearchResults(query)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function navigate(view: ActiveView) {
    setActiveView(view)
    onClose()
  }
  function goToProfile(id: string) {
    openProfile(id)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 350,
      backgroundColor: 'var(--color-card)',
      display: 'flex', flexDirection: 'column',
      paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)',
    }}>
      {/* Header: back + input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={onClose} aria-label="Close search" style={{
          width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer',
          backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          fontFamily: 'var(--font-sans)', fontSize: '18px',
        }}>←</button>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, ministries, groups…"
          style={{
            flex: 1, padding: '11px 16px', borderRadius: '22px',
            border: '1px solid var(--color-border)', fontSize: '15px',
            fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
            backgroundColor: 'var(--color-surface)', outline: 'none',
          }}
        />
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {query.trim() === '' && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px', lineHeight: 1.6 }}>
            🔍<br /><br />Search for people, ministries, groups, events, and resources across the network.
          </div>
        )}
        {query.trim() !== '' && results.total === 0 && (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>
            No results for "{query}"
          </div>
        )}
        {results.members.length > 0 && (
          <div>
            <div style={sectionLabel}>People</div>
            {results.members.map(m => (
              <button key={m.id} onClick={() => goToProfile(m.id)} style={row}>
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{m.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{[m.title, m.church].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {results.orgs.length > 0 && (
          <div>
            <div style={sectionLabel}>Ministries</div>
            {results.orgs.map(o => (
              <button key={o.id} onClick={() => navigate('orgs')} style={row}>
                {o.img
                  ? <img src={o.img} alt="" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>🏛</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{o.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{[o.type, o.location].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {results.groups.length > 0 && (
          <div>
            <div style={sectionLabel}>Groups</div>
            {results.groups.map(g => (
              <button key={g.id} onClick={() => navigate('groups')} style={row}>
                {g.img
                  ? <img src={g.img} alt="" style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>👥</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{g.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{g.type}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {results.events.length > 0 && (
          <div>
            <div style={sectionLabel}>Events</div>
            {results.events.map(ev => (
              <button key={ev.id} onClick={() => navigate('events')} style={row}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>📅</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{[ev.startDate, ev.location].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {results.resources.length > 0 && (
          <div>
            <div style={sectionLabel}>Resources</div>
            {results.resources.map(r => (
              <button key={r.id} onClick={() => navigate('resources')} style={row}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>📚</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{[r.type, r.author].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}