import { useState, useEffect } from 'react'
import { useOpenProfile } from './ProfileView'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import EditProfileModal from './EditProfileModal'
import { api } from '../api-client/server'
import { useFeedPosts } from '../api-client/posts'
import type { EventItem } from './EventCard'

interface MyOrgSummary {
  id: string
  following: boolean
  members: { userId: string }[]
}

function ProfileChecklist() {
  const { currentUser } = useAuth()
  const setActiveView = useUIStore(s => s.setActiveView)
  const closeProfile = useUIStore(s => s.closeProfile)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const { data: posts } = useFeedPosts('network')
  const [orgs, setOrgs] = useState<MyOrgSummary[] | null>(null)

  useEffect(() => {
    api<MyOrgSummary[]>('/orgs/my').then(setOrgs).catch(() => setOrgs([]))
  }, [])

  // Wait for the ministry check to resolve before deciding whether the
  // checklist is fully done — otherwise it flashes complete then reappears.
  if (!currentUser || orgs === null) return null

  const hasPosted = (posts ?? []).some(p => p.authorId === currentUser.id)
  const hasMinistry = orgs.some(o => o.following || o.members.some(m => m.userId === currentUser.id))

  const items = [
    { done: !!currentUser.avatarUrl, label: 'Add a profile photo', action: () => setEditProfileOpen(true) },
    { done: !!currentUser.bio?.trim(), label: 'Write a short bio', action: () => setEditProfileOpen(true) },
    { done: !!(currentUser.title && currentUser.church && currentUser.location), label: 'Add your title, church & location', action: () => setEditProfileOpen(true) },
    { done: hasPosted, label: 'Make your first post', action: () => { closeProfile(); setActiveView('feed') } },
    { done: hasMinistry, label: 'Follow or join a ministry', action: () => { closeProfile(); setActiveView('orgs') } },
  ]

  const doneCount = items.filter(i => i.done).length
  if (doneCount === items.length) return null

  const pct = Math.round((doneCount / items.length) * 100)

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '16px', marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>🚀 Complete Your Profile</div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-navy)' }}>{doneCount}/{items.length}</div>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--color-surface)', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--color-gold)', transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.done ? undefined : item.action}
            disabled={item.done}
            style={{
              display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
              padding: 0, border: 'none', background: 'none', textAlign: 'left',
              cursor: item.done ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{
              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
              backgroundColor: item.done ? '#22c55e' : 'transparent',
              border: item.done ? 'none' : '1.5px solid var(--color-border)',
              color: '#fff',
            }}>{item.done ? '✓' : ''}</span>
            <span style={{
              fontSize: '13px', fontWeight: item.done ? 500 : 600,
              color: item.done ? 'var(--color-text-3)' : 'var(--color-text-1)',
              textDecoration: item.done ? 'line-through' : 'none',
            }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SidebarEvents() {
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    api<EventItem[]>('/events').then(setEvents).catch(() => setEvents([]))
  }, [])

  const todayStr = new Date().toISOString().slice(0, 10)
  const upcoming = events
    .filter(e => !e.date || e.date >= todayStr)
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))

  if (upcoming.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '14px 16px', marginBottom: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>📅 Upcoming Events</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {upcoming.map(e => (
          <div key={e.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden',
              background: e.img ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
            }}>
              {e.img ? <img src={e.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📅'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', lineHeight: 1.35 }}>{e.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }}>
                {e.date || 'Date TBA'}{e.location ? ` · ${e.location}` : ''}
              </div>
              {(e.orgName ?? e.host) && (
                <div style={{ fontSize: '11px', color: 'var(--color-gold)', marginTop: '1px', fontWeight: 600 }}>{e.orgName ?? e.host}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileCard({ openProfile, userId }: { openProfile: (id: string) => void; userId?: string }) {
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
              ? <img src={userProfile.avatarUrl} alt={userProfile.name} onClick={() => userId && openProfile(userId)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: userId ? 'pointer' : 'default' }} />
              : <div onClick={() => userId && openProfile(userId)} style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '18px', cursor: userId ? 'pointer' : 'default' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
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
  const activeView = useUIStore(s => s.activeView)
  const profileId = useUIStore(s => s.profileId)
  const onHomeFeed = activeView === 'feed' && profileId === null

  return (
    <aside className="right-sidebar" style={{
      position: 'sticky', top: '64px',
      height: 'calc(100vh - 64px)', overflowY: 'auto',
      padding: '16px 12px 32px',
      scrollbarWidth: 'thin',
    }}>
      <ProfileCard openProfile={openProfile} userId={currentUser?.id} />

      <ProfileChecklist />

      {onHomeFeed && <SidebarEvents />}

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
