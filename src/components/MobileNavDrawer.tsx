// The "More" drawer — secondary destinations only. The primary sections
// (Home, Ministries, Events, Groups) live in the bottom tab bar; this holds
// everything else, plus the member's profile header, theme toggle, and admin
// entry. Opened by the More tab (and previously the hamburger).

import { useEffect, useState } from 'react'
import { NAV } from './LeftSidebar'
import { useUIStore } from '../store/ui'
import { useColorScheme } from '../providers/ThemeProvider'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useOpenProfile } from './ProfileView'
import { supabase } from '../lib/supabase'
import VerifiedBadge from './VerifiedBadge'
import fmciLogo from '../imports/fmci-copy1280x400_orig.png'

// The four primary destinations now live in the bottom tab bar.
const TAB_VIEWS = new Set(['feed', 'orgs', 'events', 'groups'])

export default function MobileNavDrawer() {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen)
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const userProfile = useUIStore(s => s.userProfile)
  const { colorScheme, toggleColorScheme } = useColorScheme()
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const openProfile = useOpenProfile()
  const [visible, setVisible] = useState(false)
  const isAdmin = role === 'superadmin' || role === 'admin'

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(() => setMobileNavOpen(false), 200)
  }

  function selectView(id: typeof activeView) {
    setVisible(false)
    setTimeout(() => setActiveView(id), 200)
  }

  const secondaryNav = NAV.filter(item => !TAB_VIEWS.has(item.id))

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '78vw', maxWidth: '300px',
        backgroundColor: 'var(--color-card)', boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)',
        transform: visible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <img src={fmciLogo} alt="FMCI" style={{ height: '28px', width: '28px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-1)', letterSpacing: '0.5px' }}>FMCI NETWORK</div>
          <button onClick={close} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px',
          }}>✕</button>
        </div>

        {/* Profile header — the member's own identity, one tap from their page */}
        {currentUser && (
          <button
            onClick={() => { close(); openProfile(currentUser.id) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
              padding: '14px 16px', border: 'none', borderBottom: '1px solid var(--color-border-light)',
              background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, overflow: 'hidden' }}>
              {userProfile.avatarUrl
                ? <img src={userProfile.avatarUrl} alt={userProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)' }}>
                {userProfile.name || 'My Profile'}
                {currentUser.verified && <VerifiedBadge size={15} />}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[userProfile.title, userProfile.church, userProfile.location].filter(Boolean).join(' · ') || 'View my profile'}
              </div>
            </div>
            <span style={{ color: 'var(--color-text-3)', fontSize: '16px' }}>›</span>
          </button>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {secondaryNav.map(item => {
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => selectView(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                backgroundColor: active ? 'var(--color-navy)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text-1)',
                fontSize: '15px', fontWeight: active ? 700 : 500,
                marginBottom: '2px',
              }}>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}

          <button onClick={() => selectView('map')} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            backgroundColor: activeView === 'map' ? 'var(--color-navy)' : 'transparent',
            color: activeView === 'map' ? '#fff' : 'var(--color-text-1)',
            fontSize: '15px', fontWeight: activeView === 'map' ? 700 : 500,
            marginBottom: '2px',
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: activeView === 'map' ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>🗺</span>
            Global Map
          </button>

          <button onClick={() => selectView('about')} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            backgroundColor: activeView === 'about' ? 'var(--color-navy)' : 'transparent',
            color: activeView === 'about' ? '#fff' : 'var(--color-text-1)',
            fontSize: '15px', fontWeight: activeView === 'about' ? 700 : 500,
            marginBottom: '2px',
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: activeView === 'about' ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>ℹ️</span>
            About FMCI
          </button>

          <button onClick={() => selectView('privacy')} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            backgroundColor: activeView === 'privacy' ? 'var(--color-navy)' : 'transparent',
            color: activeView === 'privacy' ? '#fff' : 'var(--color-text-1)',
            fontSize: '15px', fontWeight: activeView === 'privacy' ? 700 : 500,
            marginBottom: '2px',
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: activeView === 'privacy' ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>🔒</span>
            Privacy Policy
          </button>

          {isAdmin && (
            <button onClick={() => { close(); setAdminMode(true) }} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
              backgroundColor: 'transparent', color: 'var(--color-text-1)',
              fontSize: '15px', fontWeight: 500, marginBottom: '2px',
            }}>
              <span style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                backgroundColor: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              }}>⚙</span>
              Admin Panel
            </button>
          )}
        </nav>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px' }}>
          <button onClick={toggleColorScheme} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            backgroundColor: 'transparent', color: 'var(--color-text-1)',
            fontSize: '15px', fontWeight: 500,
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>{colorScheme === 'dark' ? '☀' : '🌙'}</span>
            <span style={{ flex: 1 }}>{colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            <span style={{
              width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0, position: 'relative',
              backgroundColor: colorScheme === 'dark' ? 'var(--color-navy)' : 'var(--color-border)', transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.15s', left: colorScheme === 'dark' ? '18px' : '2px',
              }} />
            </span>
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
            backgroundColor: 'transparent', color: 'var(--color-red)',
            fontSize: '15px', fontWeight: 600,
          }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              backgroundColor: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>↪</span>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}