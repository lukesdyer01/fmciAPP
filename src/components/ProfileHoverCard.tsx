import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useOpenProfile } from './ProfileView'
import { useColorScheme } from '../providers/ThemeProvider'
import { supabase } from '../lib/supabase'
import VerifiedBadge from './VerifiedBadge'

export default function ProfileHoverCard() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const userProfile = useUIStore(s => s.userProfile)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const openProfile = useOpenProfile()
  const { colorScheme, toggleColorScheme } = useColorScheme()
  const isAdmin = role === 'superadmin' || role === 'admin'

  // Closes the menu on an outside click — covers touch devices (no hover)
  // and clicking elsewhere on the page while it's pinned open.
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function closeAnd(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative' }}
    >
      {/* Always sets open (rather than toggling) — on a mouse, hovering has
          usually already opened this before the click even registers, so a
          toggle would immediately close what hover just opened. */}
      <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', display: 'block' }} title={userProfile.name || 'Profile'}>
        {userProfile.avatarUrl
          ? <img src={userProfile.avatarUrl} alt={userProfile.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(255,255,255,0.3)' }} />
          : <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px', border: '2px solid rgba(255,255,255,0.3)' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
        }
      </button>

      {open && (
        // Positioned flush against the avatar (top: 100%, no gap) with the
        // visual offset done via paddingTop instead — a real positional gap
        // here would be a dead zone with no rendered element in it, so the
        // cursor exits this whole container (and onMouseLeave fires) the
        // instant it crosses that gap on the way down to the menu.
        <div style={{ position: 'absolute', top: '100%', right: 0, paddingTop: '10px', zIndex: 260 }}>
          <div style={{
            width: '260px',
            backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
          }}>
            <div style={{ padding: '16px' }}>
              <div
                onClick={() => currentUser && closeAnd(() => openProfile(currentUser.id))}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', cursor: currentUser ? 'pointer' : 'default' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  {userProfile.avatarUrl
                    ? <img src={userProfile.avatarUrl} alt={userProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '2px' }}>
                    {userProfile.name}
                    {currentUser?.verified && <VerifiedBadge size={15} />}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>
                    {[userProfile.title, userProfile.church, userProfile.location].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <MenuButton icon="✏" label="Edit Profile" onClick={() => closeAnd(() => setEditProfileOpen(true))} />
                <ToggleRow
                  icon={colorScheme === 'dark' ? '☀' : '🌙'}
                  label={colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  checked={colorScheme === 'dark'}
                  onToggle={toggleColorScheme}
                />
                {isAdmin && <MenuButton icon="⚙" label="Admin Panel" onClick={() => closeAnd(() => setAdminMode(true))} />}
                <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
                <MenuButton icon="↪" label="Sign Out" onClick={() => closeAnd(() => supabase.auth.signOut())} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({ icon, label, checked, onToggle }: { icon: string; label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
        border: 'none', backgroundColor: 'transparent',
        color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 600,
        fontFamily: 'var(--font-sans)', textAlign: 'left', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
    >
      <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{
        width: '32px', height: '18px', borderRadius: '9px', flexShrink: 0, position: 'relative',
        backgroundColor: checked ? 'var(--color-navy)' : 'var(--color-border)', transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%',
          backgroundColor: '#fff', transition: 'left 0.15s', left: checked ? '16px' : '2px',
        }} />
      </span>
    </button>
  )
}

function MenuButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
        border: 'none', backgroundColor: 'transparent',
        color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 600,
        fontFamily: 'var(--font-sans)', textAlign: 'left', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
    >
      <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}
