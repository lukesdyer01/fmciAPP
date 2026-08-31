import { useOpenProfile } from './ProfileModal'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import EditProfileModal from './EditProfileModal'

function ProfileCard({ openProfile }: { openProfile: (name: string) => void }) {
  const userProfile = useUIStore(s => s.userProfile)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const editProfileOpen = useUIStore(s => s.editProfileOpen)

  return (
    <>
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        marginBottom: '12px',
      }}>
        <div style={{
          height: '60px',
          background: userProfile.coverUrl
            ? `url(${userProfile.coverUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: '-24px', left: '16px',
            width: '48px', height: '48px', borderRadius: '12px',
            border: '3px solid #fff', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {userProfile.avatarUrl
              ? <img src={userProfile.avatarUrl} alt={userProfile.name} onClick={() => openProfile(userProfile.name)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
              : <div onClick={() => openProfile(userProfile.name)} style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', cursor: 'pointer' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
            }
          </div>
        </div>
        <div style={{ padding: '32px 16px 16px' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '2px' }}>{userProfile.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-2)', marginBottom: '10px' }}>
            {userProfile.title} · {userProfile.church} · {userProfile.location}
          </div>
          <button
            onClick={() => setEditProfileOpen(true)}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 700,
              fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.backgroundColor = 'var(--color-navy)'
              b.style.color = '#fff'
              b.style.borderColor = 'var(--color-navy)'
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.backgroundColor = 'var(--color-surface)'
              b.style.color = 'var(--color-text-1)'
              b.style.borderColor = 'var(--color-border)'
            }}
          >✏ Edit Profile</button>
        </div>
      </div>
      {editProfileOpen && <EditProfileModal />}
    </>
  )
}

export default function RightSidebar() {
  const openProfile = useOpenProfile()
  const { currentUser } = useAuth()

  return (
    <aside className="right-sidebar" style={{
      position: 'sticky', top: '64px',
      height: 'calc(100vh - 64px)', overflowY: 'auto',
      padding: '16px 12px 32px',
      scrollbarWidth: 'thin',
    }}>
      <ProfileCard openProfile={openProfile} />

      {!currentUser?.verified && (
        <div style={{
          background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
          borderRadius: '12px', padding: '18px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '6px' }}>✦ Get Verified</div>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Verified members gain access to leadership groups, exclusive events, and the full FMCI network directory.
          </p>
          <button style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
            color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>Apply for Verification →</button>
        </div>
      )}
    </aside>
  )
}
