import { useState, useEffect, useRef } from 'react'
import fmciLogo from '../imports/fmci-copy1280x400_orig.png'
import { useUIStore } from '../store/ui'
import { useOpenProfile } from './ProfileView'
import EditProfileModal from './EditProfileModal'
import ProfileHoverCard from './ProfileHoverCard'
import { api } from '../api-client/server'
import { useConversations } from '../api-client/messages'
import { playNotificationSound } from '../lib/notificationSound'
import type { ActiveView } from '../App'

interface SearchMember { id: string; name: string; title: string; church: string; avatarUrl: string }
interface SearchEvent { id: string; title: string; date: string; location: string }
interface SearchOrg { id: string; name: string; type: string; location: string; img: string }
interface SearchGroup { id: string; name: string; type: string; img: string }
interface SearchResource { id: string; title: string; author: string; type: string }

function SearchDropdown({ query, onNavigate, onOpenProfile, onClose }: {
  query: string
  onNavigate: (view: ActiveView) => void
  onOpenProfile: (id: string) => void
  onClose: () => void
}) {
  const [members, setMembers] = useState<SearchMember[]>([])
  const [events, setEvents] = useState<SearchEvent[]>([])
  const [orgs, setOrgs] = useState<SearchOrg[]>([])
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [resources, setResources] = useState<SearchResource[]>([])

  useEffect(() => {
    api<SearchMember[]>('/members').then(setMembers).catch(() => {})
    api<SearchEvent[]>('/events').then(setEvents).catch(() => {})
    api<SearchOrg[]>('/orgs').then(setOrgs).catch(() => {})
    api<SearchGroup[]>('/groups').then(setGroups).catch(() => {})
    api<SearchResource[]>('/resources').then(setResources).catch(() => {})
  }, [])

  const q = query.trim().toLowerCase()
  const matchMembers = members.filter(m => m.name?.toLowerCase().includes(q) || m.church?.toLowerCase().includes(q)).slice(0, 5)
  const matchEvents = events.filter(e => e.title?.toLowerCase().includes(q)).slice(0, 5)
  const matchOrgs = orgs.filter(o => o.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchGroups = groups.filter(g => g.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchResources = resources.filter(r => r.title?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q)).slice(0, 5)
  const totalMatches = matchMembers.length + matchEvents.length + matchOrgs.length + matchGroups.length + matchResources.length

  const sectionLabel: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase',
    letterSpacing: '0.6px', padding: '10px 14px 6px',
  }
  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 14px',
    border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250 }} />
      <div style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 260,
        backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)', maxHeight: '70vh', overflowY: 'auto',
      }}>
        {totalMatches === 0 && (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '13px' }}>No results for "{query}"</div>
        )}
        {matchMembers.length > 0 && (
          <div>
            <div style={sectionLabel}>People</div>
            {matchMembers.map(m => (
              <button key={m.id} onClick={() => { onOpenProfile(m.id); onClose() }} style={row}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{[m.title, m.church].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {matchOrgs.length > 0 && (
          <div>
            <div style={sectionLabel}>Ministries</div>
            {matchOrgs.map(o => (
              <button key={o.id} onClick={() => { onNavigate('orgs'); onClose() }} style={row}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {o.img ? <img src={o.img} alt="" style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🏛</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{o.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{[o.type, o.location].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {matchGroups.length > 0 && (
          <div>
            <div style={sectionLabel}>Groups</div>
            {matchGroups.map(g => (
              <button key={g.id} onClick={() => { onNavigate('groups'); onClose() }} style={row}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                {g.img ? <img src={g.img} alt="" style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>👥</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{g.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{g.type}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {matchEvents.length > 0 && (
          <div>
            <div style={sectionLabel}>Events</div>
            {matchEvents.map(ev => (
              <button key={ev.id} onClick={() => { onNavigate('events'); onClose() }} style={row}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>📅</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{ev.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{[ev.date, ev.location].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {matchResources.length > 0 && (
          <div>
            <div style={sectionLabel}>Resources</div>
            {matchResources.map(r => (
              <button key={r.id} onClick={() => { onNavigate('resources'); onClose() }} style={row}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>📚</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{[r.type, r.author].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function Topbar() {
  const notifOpen = useUIStore(s => s.notifOpen)
  const setNotifOpen = useUIStore(s => s.setNotifOpen)
  const editProfileOpen = useUIStore(s => s.editProfileOpen)
  const setActiveView = useUIStore(s => s.setActiveView)
  const closeProfile = useUIStore(s => s.closeProfile)
  const openProfile = useOpenProfile()
  const setMessagesOpen = useUIStore(s => s.setMessagesOpen)
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen)
  const { data: conversations } = useConversations()
  const unreadTotal = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const prevUnreadTotal = useRef<number | null>(null)
  useEffect(() => {
    // Skip the first observation (page load) — only chime when unread count
    // actually rises from a known baseline, i.e. a genuinely new message.
    if (prevUnreadTotal.current !== null && unreadTotal > prevUnreadTotal.current) {
      playNotificationSound()
    }
    prevUnreadTotal.current = unreadTotal
  }, [unreadTotal])
  const [search, setSearch] = useState('')

  function navigateTo(view: ActiveView) {
    closeProfile()
    setActiveView(view)
  }
  function goToProfile(id: string) {
    openProfile(id)
  }

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: '56px',
      backgroundColor: 'var(--color-navy)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }}>
      {/* Hamburger — mobile only, opens the slide-out nav drawer. `display` is
          intentionally omitted from the inline style and owned entirely by the
          .mobile-nav-toggle CSS class, since an inline display would always
          beat the class's responsive show/hide (inline styles win the cascade). */}
      <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(true)} title="Menu" style={{
        width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
        backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Brand */}
      <div className="topbar-brand">
        <img
          src={fmciLogo}
          alt="FMCI"
          style={{ height: '32px', width: '32px', objectFit: 'contain', display: 'block', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '0.5px' }}>FMCI</div>
          <div className="topbar-brand-subtitle" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.2 }}>
            THE FEDERATION OF<br />MINISTERS &amp; CHURCHES INTERNATIONAL
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="topbar-search" style={{ flex: 1, maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for people, ministries, groups and #hashtags"
          style={{
            width: '100%', padding: '9px 14px 9px 36px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '20px', fontSize: '13px',
            fontFamily: 'var(--font-sans)', color: '#fff', outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={e => { (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.16)' }}
          onBlur={e => { (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.1)' }}
        />
        {search.trim() !== '' && (
          <SearchDropdown
            query={search}
            onNavigate={navigateTo}
            onOpenProfile={goToProfile}
            onClose={() => setSearch('')}
          />
        )}
      </div>

      {/* Right icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
        {/* Messages */}
        <button onClick={() => setMessagesOpen(true)} title="Messages" style={{ ...iconBtn, position: 'relative' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {unreadTotal > 0 && <span style={badgeDot}>{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
        </button>
        {/* Notifications */}
        <button onClick={() => setNotifOpen(!notifOpen)} style={{ ...iconBtn, position: 'relative', backgroundColor: notifOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        {/* Avatar — hover to see profile preview, Edit Profile, Admin Panel, Sign Out */}
        <ProfileHoverCard />
      </div>
      {editProfileOpen && <EditProfileModal />}

      {/* Notification dropdown */}
      {notifOpen && (
        <div className="notif-panel" style={{
          backgroundColor: 'var(--color-card)', borderRadius: '12px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 300, overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 10px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Notifications</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-blue)', fontSize: '13px', fontWeight: 600 }}>Mark all read</button>
          </div>
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>
            No notifications yet
          </div>
        </div>
      )}
    </header>
  )
}

const iconBtn: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
  backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
}

const badgeDot: React.CSSProperties = {
  position: 'absolute', top: '-1px', right: '-1px',
  width: '16px', height: '16px', borderRadius: '50%',
  backgroundColor: 'var(--color-red)', color: '#fff',
  fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '2px solid var(--color-navy)',
}
