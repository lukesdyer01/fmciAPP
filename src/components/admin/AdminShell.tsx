import { useState } from 'react'
import { useUIStore } from '../../store/ui'
import { useAuth } from '../../providers/AuthProvider'
import EditProfileModal from '../EditProfileModal'
import Dashboard from './views/Dashboard'
import MembersAdmin from './views/MembersAdmin'
import OrgsAdmin from './views/OrgsAdmin'
import ContentAdmin from './views/ContentAdmin'
import VerificationAdmin from './views/VerificationAdmin'
import FeatureFlagsAdmin from './views/FeatureFlagsAdmin'
import SettingsAdmin from './views/SettingsAdmin'

export type AdminView = 'dashboard' | 'members' | 'organizations' | 'content' | 'verification' | 'feature-flags' | 'settings'

const NAV: { id: AdminView; icon: string; label: string }[] = [
  { id: 'dashboard',     icon: '◈',  label: 'Dashboard' },
  { id: 'members',       icon: '👥', label: 'Members' },
  { id: 'organizations', icon: '🏛', label: 'Organizations' },
  { id: 'content',       icon: '🗂', label: 'Content' },
  { id: 'verification',  icon: '✓',  label: 'Verification' },
  { id: 'feature-flags', icon: '⚑',  label: 'Feature Flags' },
  { id: 'settings',      icon: '⚙', label: 'Settings' },
]

export default function AdminShell() {
  const [activeView, setActiveView] = useState<AdminView>('dashboard')
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const editProfileOpen = useUIStore(s => s.editProfileOpen)
  const { currentUser } = useAuth()

  const view = (() => {
    switch (activeView) {
      case 'dashboard':     return <Dashboard />
      case 'members':       return <MembersAdmin />
      case 'organizations': return <OrgsAdmin />
      case 'content':       return <ContentAdmin />
      case 'verification':  return <VerificationAdmin />
      case 'feature-flags': return <FeatureFlagsAdmin />
      case 'settings':      return <SettingsAdmin />
    }
  })()

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', backgroundColor: '#0a0e1a',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0,
        backgroundColor: 'var(--color-navy-dark)',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 900, color: '#fff',
            }}>F</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.3px' }}>FMCI Network</div>
              <div style={{ fontSize: '9px', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.2px', padding: '8px 10px 4px' }}>Management</div>
          {NAV.map(item => {
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => setActiveView(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '9px 10px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                backgroundColor: active ? 'rgba(200,155,60,0.14)' : 'transparent',
                color: active ? 'var(--color-gold)' : 'rgba(255,255,255,0.6)',
                fontSize: '13px', fontWeight: active ? 700 : 500,
                transition: 'all 0.12s', marginBottom: '2px',
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <span style={{ fontSize: '15px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User + exit */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setEditProfileOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '8px 10px', marginBottom: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: '8px', textAlign: 'left', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            title="Edit your profile"
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {currentUser?.avatarUrl
                ? <img src={currentUser.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '12px' }}>{(currentUser?.displayName || '?').slice(0, 2).toUpperCase()}</div>
              }
              <div style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '12px', height: '12px', borderRadius: '4px',
                backgroundColor: 'var(--color-gold)', border: '2px solid var(--color-navy-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '7px', lineHeight: 1,
              }}>✎</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.displayName ?? ''}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-gold)', fontWeight: 600 }}>Super Admin · Edit Profile</div>
            </div>
          </button>
          <button onClick={() => setAdminMode(false)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            width: '100%', padding: '9px 10px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
            fontSize: '12px', fontWeight: 600, transition: 'all 0.12s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)' }}
          >
            <span>←</span> Back to Network
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: '240px', flex: 1, minHeight: '100vh', backgroundColor: '#0d1117' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          backgroundColor: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>
              {NAV.find(n => n.id === activeView)?.label}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
              FMCI Network Platform Administration
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 12px',
              borderRadius: '20px', backgroundColor: 'rgba(200,155,60,0.15)',
              border: '1px solid rgba(200,155,60,0.3)', color: 'var(--color-gold)',
            }}>⚡ Live</span>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* View content */}
        <div style={{ padding: '28px 32px' }}>
          {view}
        </div>
      </div>

      {editProfileOpen && <EditProfileModal />}
    </div>
  )
}
