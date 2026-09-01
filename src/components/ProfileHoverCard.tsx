import { useState } from 'react'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useOpenProfile } from './ProfileView'
import { supabase } from '../lib/supabase'
import VerifiedBadge from './VerifiedBadge'

export default function ProfileHoverCard() {
  const [hovered, setHovered] = useState(false)
  const userProfile = useUIStore(s => s.userProfile)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const setAdminMode = useUIStore(s => s.setAdminMode)
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const openProfile = useOpenProfile()
  const isAdmin = role === 'superadmin' || role === 'admin'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative' }}
    >
      <button onClick={() => setEditProfileOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: '4px', display: 'block' }} title={userProfile.name || 'Profile'}>
        {userProfile.avatarUrl
          ? <img src={userProfile.avatarUrl} alt={userProfile.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid rgba(255,255,255,0.3)' }} />
          : <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px', border: '2px solid rgba(255,255,255,0.3)' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
        }
      </button>

      {hovered && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 260,
          width: '260px',
          backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          <div style={{ padding: '16px' }}>
            <div
              onClick={() => currentUser && openProfile(currentUser.id)}
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
              <MenuButton icon="✏" label="Edit Profile" onClick={() => setEditProfileOpen(true)} />
              {isAdmin && <MenuButton icon="⚙" label="Admin Panel" onClick={() => setAdminMode(true)} />}
              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '4px 0' }} />
              <MenuButton icon="↪" label="Sign Out" onClick={() => supabase.auth.signOut()} />
            </div>
          </div>
        </div>
      )}
    </div>
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
