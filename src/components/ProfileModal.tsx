import { useState, useEffect } from 'react'
import { useUIStore } from '../store/ui'
import { getProfile, getProfileIdFromName, type ProfileData } from '../data/profiles'
import Badge, { type BadgeVariant } from './Badge'

const TYPE_COLOR: Record<string, string> = {
  announcement: '#c89b3c', testimony: '#059669', prayer: '#7c3aed',
  resource: '#1d4ed8', post: '#5a6478',
}

export default function ProfileModal() {
  const profileId = useUIStore(s => s.profileId)
  const closeProfile = useUIStore(s => s.closeProfile)
  const [tab, setTab] = useState<'posts' | 'about' | 'groups'>('posts')
  const [connected, setConnected] = useState(false)
  const [following, setFollowing] = useState(false)
  const [visible, setVisible] = useState(false)

  const profile: ProfileData | null = profileId ? getProfile(profileId) : null

  useEffect(() => {
    if (profileId) {
      setTab('posts')
      if (profile) { setConnected(profile.connected); setFollowing(profile.following) }
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [profileId])

  if (!profileId) return null

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeProfile()
  }

  const handleClose = () => {
    setVisible(false)
    setTimeout(closeProfile, 220)
  }

  // Fallback profile when the clicked user isn't in the registry
  const fallback: ProfileData = {
    id: profileId,
    name: profileId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    title: 'Network Member',
    church: 'FMCI Network',
    location: 'United States',
    avatar: '',
    coverUrl: '',
    coverColor: '#1a2a4a',
    badges: ['verified'] as BadgeVariant[],
    bio: 'Member of the FMCI Network.',
    callings: [],
    stats: { connections: 0, followers: 0, posts: 0, yearsInMinistry: 0 },
    connected: false, following: false,
    recentPosts: [], groups: [], education: [],
  }

  const p = profile ?? fallback

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '680px', maxHeight: '90vh',
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s',
      }}>
        {/* Cover */}
        <div style={{
          height: '160px', flexShrink: 0, position: 'relative',
          background: p.coverUrl
            ? `url(${p.coverUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${p.coverColor} 0%, var(--color-navy-mid) 100%)`,
        }}>
          {/* Close button */}
          <button onClick={handleClose} style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '32px', height: '32px', borderRadius: '50%', border: 'none',
            backgroundColor: 'rgba(0,0,0,0.45)', color: '#fff',
            cursor: 'pointer', fontSize: '16px', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}>✕</button>

          {/* Avatar — straddles the cover/content boundary */}
          <div style={{
            position: 'absolute', bottom: '-36px', left: '24px',
            width: '88px', height: '88px', borderRadius: '16px',
            border: '4px solid var(--color-card)',
            overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          }}>
            {p.avatar
              ? <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '28px' }}>{(p.name || '?').slice(0, 2).toUpperCase()}</div>
            }
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Identity row */}
          <div style={{ padding: '48px 24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-text-1)', marginBottom: '4px', lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginBottom: '8px', lineHeight: 1.5 }}>
                {p.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '10px' }}>
                {p.church} · {p.location}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {p.badges.map((b, i) => <Badge key={i} variant={b} />)}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConnected(c => !c)}
                style={{
                  padding: '9px 20px', borderRadius: '10px', cursor: 'pointer',
                  backgroundColor: connected ? 'var(--color-surface)' : 'var(--color-navy)',
                  color: connected ? 'var(--color-text-1)' : '#fff',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                  border: connected ? '1px solid var(--color-border)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >{connected ? '✓ Connected' : '+ Connect'}</button>
              <button
                onClick={() => setFollowing(f => !f)}
                style={{
                  padding: '9px 20px', borderRadius: '10px', cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-1)',
                  fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                  border: '1px solid var(--color-border)',
                  transition: 'all 0.15s',
                }}
              >{following ? 'Following' : 'Follow'}</button>
              <button style={{
                padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
                backgroundColor: 'transparent', color: 'var(--color-text-1)',
                fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                border: '1px solid var(--color-border)',
              }}>Message</button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid-stats-4" style={{
            gap: 0,
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
          }}>
            {[
              { value: (p.stats?.connections ?? 0).toLocaleString(), label: 'Connections' },
              { value: (p.stats?.followers ?? 0).toLocaleString(), label: 'Followers' },
              { value: (p.stats?.posts ?? 0).toLocaleString(), label: 'Posts' },
              { value: (p.stats?.yearsInMinistry ?? 0) + ' yrs', label: 'In Ministry' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '14px 8px', textAlign: 'center',
                borderRight: i < 3 ? '1px solid var(--color-border)' : 'none',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-navy)', lineHeight: 1, marginBottom: '3px' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 24px' }}>
            {(['posts', 'about', 'groups'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '12px 18px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                background: 'none', fontSize: '13px', fontWeight: tab === t ? 700 : 500,
                color: tab === t ? 'var(--color-navy)' : 'var(--color-text-3)',
                borderBottom: tab === t ? '2px solid var(--color-gold)' : '2px solid transparent',
                marginBottom: '-1px', textTransform: 'capitalize', transition: 'color 0.15s',
              }}>{t}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: '20px 24px 28px' }}>
            {tab === 'posts' && <PostsTab p={p} />}
            {tab === 'about' && <AboutTab p={p} />}
            {tab === 'groups' && <GroupsTab p={p} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostsTab({ p }: { p: ProfileData }) {
  if (p.recentPosts.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-3)', fontSize: '14px' }}>No posts yet.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {p.recentPosts.map(post => (
        <div key={post.id} style={{
          backgroundColor: 'var(--color-surface)', borderRadius: '12px',
          padding: '16px', border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {p.avatar
              ? <img src={p.avatar} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
              : <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px', flexShrink: 0 }}>{(p.name || '?').slice(0, 2).toUpperCase()}</div>
            }
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{post.time}</div>
            </div>
            <span style={{
              marginLeft: 'auto', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
              backgroundColor: (TYPE_COLOR[post.type] ?? '#5a6478') + '18',
              color: TYPE_COLOR[post.type] ?? '#5a6478',
              textTransform: 'capitalize',
            }}>{post.type}</span>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.65 }}>{post.content}</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-3)' }}>
            <span>🙏 {(post.reactions ?? 0).toLocaleString()} reactions</span>
            <span>💬 {post.comments} comments</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function AboutTab({ p }: { p: ProfileData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Bio */}
      <div>
        <SectionLabel>Bio</SectionLabel>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.75 }}>{p.bio}</p>
      </div>

      {/* Callings */}
      {p.callings.length > 0 && (
        <div>
          <SectionLabel>Callings & Gifts</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {p.callings.map((c, i) => (
              <span key={i} style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)',
                border: '1px solid var(--color-gold-border)',
              }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div>
        <SectionLabel>Details</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <DetailRow icon="🏛" label="Church" value={p.church} />
          <DetailRow icon="📍" label="Location" value={p.location} />
          {p.website && <DetailRow icon="🌐" label="Website" value={p.website} />}
          {p.email && <DetailRow icon="✉️" label="Email" value={p.email} />}
        </div>
      </div>

      {/* Education */}
      {p.education.length > 0 && (
        <div>
          <SectionLabel>Education & Training</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {p.education.map((e, i) => (
              <div key={i} style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{e.degree}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>{e.institution} · {e.year}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GroupsTab({ p }: { p: ProfileData }) {
  if (p.groups.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-3)', fontSize: '14px' }}>Not a member of any groups.</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {p.groups.map((g, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '14px 16px', backgroundColor: 'var(--color-surface)', borderRadius: '10px', border: '1px solid var(--color-border)',
        }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>👥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '2px' }}>{g.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Role: {g.role}</div>
          </div>
          <button style={{
            padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--color-border)',
            backgroundColor: 'transparent', color: 'var(--color-text-2)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>View</button>
        </div>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '10px' }}>{children}</div>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '15px', width: '20px', textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: '12px', color: 'var(--color-text-3)', width: '70px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--color-text-1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

// Helper: open profile from any avatar click
export function useOpenProfile() {
  const openProfile = useUIStore(s => s.openProfile)
  return (name: string) => openProfile(getProfileIdFromName(name))
}
