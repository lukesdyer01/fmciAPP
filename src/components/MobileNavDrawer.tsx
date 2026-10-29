import { useNetworkSettings } from '../api-client/features'
// Facebook-inspired mobile menu panel with searchable destinations and account actions.

import { useEffect, useMemo, useState } from 'react'
import { NAV } from './LeftSidebar'
import { useUIStore } from '../store/ui'
import { useColorScheme } from '../providers/ThemeProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { supabase } from '../lib/supabase'

const DESCRIPTIONS: Record<string, string> = {
  feed: 'See updates from people and ministries in your network.',
  directory: 'Find and connect with members of FMCI.',
  orgs: 'Explore churches, ministries, and organizations.',
  groups: 'Connect with people around shared interests.',
  blog: 'Read articles and ministry updates.',
  prayer: 'Share prayer needs and support one another.',
  testimonies: 'Read and share stories of faith.',
  events: 'Discover upcoming gatherings and ministry events.',
  resources: 'Browse ministry resources and learning materials.',
  invite: 'Invite someone to join the network.',
  feedback: 'Report a problem or suggest an improvement.',
  saved: 'Return to your saved posts and resources.',
  safety: 'Send beta feedback, set notification preferences, or get help.',
  map: 'Explore ministries and members around the world.',
  about: 'Learn about FMCI Network.',
  privacy: 'Review how your information is handled.',
}

export default function MobileNavDrawer() {
  const { data: settings } = useNetworkSettings()
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen)
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const { colorScheme, toggleColorScheme } = useColorScheme()
  const { role } = useSupabaseRole()
  const [visible, setVisible] = useState(false)
  const [query, setQuery] = useState('')
  const isAdmin = role === 'superadmin' || role === 'admin'

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(() => setMobileNavOpen(false), 180)
  }

  function selectView(id: typeof activeView) {
    setVisible(false)
    setTimeout(() => setActiveView(id), 180)
  }

  const destinations = useMemo(() => [
    ...NAV.filter(item => item.id !== 'saved' || settings?.savedPostsEnabled === 1).map(item => ({ ...item, description: DESCRIPTIONS[item.id] ?? '' })),
    { id: 'map' as const, icon: '🗺', label: 'Global Map', description: DESCRIPTIONS.map },
    { id: 'about' as const, icon: 'ℹ️', label: 'About FMCI', description: DESCRIPTIONS.about },
    { id: 'privacy' as const, icon: '🔒', label: 'Privacy Policy', description: DESCRIPTIONS.privacy },
  ].filter(item => `${item.label} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase())), [query, settings?.savedPostsEnabled])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed', inset: 'calc(56px + var(--safe-top) + var(--active-users-bar-height, 0px)) 0 0', zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.28)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.18s',
      }}
    >
      <section id="mobile-navigation" aria-label="Main menu" style={{
        position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px',
        maxWidth: '980px', margin: '0 auto',
        backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: '20px', boxShadow: '0 12px 38px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'transform 0.18s ease, opacity 0.18s ease',
      }}>
        <div style={{ padding: '16px 18px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, flex: 1, color: 'var(--color-text-1)', fontSize: '26px', lineHeight: 1.2, fontWeight: 800 }}>Menu</h2>
            <button aria-label="Close menu" onClick={close} style={{
              width: '38px', height: '38px', border: 0, borderRadius: '50%',
              backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)',
              fontSize: '21px', lineHeight: 1, cursor: 'pointer',
            }}>✕</button>
          </div>
          <label style={{
            height: '44px', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '0 14px', borderRadius: '24px', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-3)',
          }}>
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" />
            </svg>
            <input
              aria-label="Search menu"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search menu"
              style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--color-text-1)', font: 'inherit', fontSize: '15px' }}
            />
          </label>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 18px' }}>
          <h3 style={{ margin: '8px 0 10px', color: 'var(--color-text-1)', fontSize: '18px', fontWeight: 800 }}>Social</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
            {destinations.map(item => {
              const active = activeView === item.id
              return (
                <button key={item.id} onClick={() => selectView(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                  padding: '10px 8px', border: 0, borderRadius: '12px', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'var(--font-sans)',
                  backgroundColor: active ? 'var(--color-hover)' : 'transparent',
                  color: 'var(--color-text-1)',
                }}>
                  <span style={{
                    width: '46px', height: '46px', flex: '0 0 46px', borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--color-surface)', fontSize: '23px',
                  }}>{item.icon}</span>
                  <span style={{ minWidth: 0, display: 'block' }}>
                    <span style={{ display: 'block', fontSize: '16px', lineHeight: 1.3, fontWeight: 750 }}>{item.label}</span>
                    <span style={{ display: 'block', marginTop: '2px', color: 'var(--color-text-2)', fontSize: '13px', lineHeight: 1.35 }}>{item.description}</span>
                  </span>
                </button>
              )
            })}
            {destinations.length === 0 && <div style={{ padding: '18px 8px', color: 'var(--color-text-2)', fontSize: '14px' }}>No menu items match “{query}”.</div>}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 18px calc(10px + var(--safe-bottom))', flexShrink: 0, backgroundColor: 'var(--color-card)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={toggleColorScheme} style={accountActionStyle}>
              {colorScheme === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}
            </button>
            {isAdmin && <button onClick={() => { close(); setAdminMode(true) }} style={accountActionStyle}>⚙ Admin Panel</button>}
            <button onClick={() => supabase.auth.signOut()} style={{ ...accountActionStyle, color: 'var(--color-red-text)' }}>↪ Sign Out</button>
          </div>
        </div>
      </section>
    </div>
  )
}

const accountActionStyle: React.CSSProperties = {
  flex: '1 1 110px', minHeight: '40px', padding: '8px 10px',
  border: '1px solid var(--color-border)', borderRadius: '10px',
  backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)',
  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
  cursor: 'pointer', whiteSpace: 'nowrap',
}
