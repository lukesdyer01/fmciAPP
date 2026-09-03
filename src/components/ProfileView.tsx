import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useUIStore } from '../store/ui'
import { useFeedPosts } from '../api-client/posts'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import EditProfileModal from './EditProfileModal'
import VerifiedBadge from './VerifiedBadge'

export interface MemberProfile {
  id: string
  name: string
  title: string
  church: string
  location: string
  avatarUrl: string
  bio: string
  website: string
  email: string
  phone: string
  ministryRoles: string[]
  additionalRoles: string[]
  communicationPrefs: string[]
  fmciLeadershipRole?: string
  memberSince?: string
  verified: boolean
  joinedAt: string
}

// Helper: open a user's profile page from anywhere (avatar/name click).
export function useOpenProfile() {
  const openProfile = useUIStore(s => s.openProfile)
  return (userId: string) => openProfile(userId)
}

export default function ProfileView({ userId, onBack }: { userId: string; onBack: () => void }) {
  const { currentUser } = useAuth()
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const editProfileOpen = useUIStore(s => s.editProfileOpen)
  const openMessagesWith = useUIStore(s => s.openMessagesWith)
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    setLoading(true); setNotFound(false); setMember(null)
    api<MemberProfile>(`/members/${userId}`)
      .then(setMember)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [userId])

  const { data: allPosts, isLoading: postsLoading } = useFeedPosts('network')
  const wallPosts = (allPosts ?? []).filter(p =>
    p.author && p.author.trim() !== '' &&
    ((p.wallUserId ?? p.authorId) === userId || (p.taggedUsers ?? []).some(t => t.id === userId))
  )

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading profile…</div>
  }

  if (notFound || !member) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <button onClick={onBack} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px',
          fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
        }}>← Back</button>
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>👤</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)' }}>Member not found</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px',
        fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
      }}>← Back</button>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{
              width: '84px', height: '84px', borderRadius: '16px', flexShrink: 0,
              overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            }}>
              {member.avatarUrl
                ? <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '28px' }}>{(member.name || '?').slice(0, 2).toUpperCase()}</div>
              }
            </div>
            {isOwnProfile ? (
              <button onClick={() => setEditProfileOpen(true)} style={{
                marginLeft: 'auto', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}>✏ Edit Profile</button>
            ) : (
              <button onClick={() => openMessagesWith(member.id)} style={{
                marginLeft: 'auto', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
                border: 'none', backgroundColor: 'var(--color-navy)',
                color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}>💬 Message</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-1)' }}>{member.name}</h1>
            {member.verified && <VerifiedBadge size={18} />}
          </div>
          {member.fmciLeadershipRole && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '6px',
              padding: '3px 12px', borderRadius: '20px',
              backgroundColor: 'var(--color-navy)', color: '#fff',
              fontSize: '11px', fontWeight: 700,
            }}>👑 {member.fmciLeadershipRole}</div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', marginBottom: member.bio || member.memberSince ? '10px' : 0 }}>
            {[member.title, member.church, member.location].filter(Boolean).join(' · ')}
          </div>
          {member.memberSince && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: member.bio ? '10px' : 0,
              padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
            }}>
              <span style={{ fontSize: '11px' }}>⭐</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)' }}>Member since {member.memberSince}</span>
            </div>
          )}
          {(member.ministryRoles.length > 0 || member.additionalRoles.length > 0) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: member.bio ? '10px' : 0 }}>
              {member.ministryRoles.map(role => (
                <span key={role} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-border)' }}>{role}</span>
              ))}
              {member.additionalRoles.map(role => (
                <span key={role} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: 'var(--color-blue-bg)', color: 'var(--color-blue)', border: '1px solid var(--color-blue)33' }}>{role}</span>
              ))}
            </div>
          )}
          {member.bio && (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.6 }}>{member.bio}</p>
          )}
          {(member.website || member.email || member.phone) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '13px' }}>
              {member.website && (
                <a href={member.website.startsWith('http') ? member.website : `https://${member.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>🌐 {member.website}</a>
              )}
              {member.email && (
                <a href={`mailto:${member.email}`} style={{ color: 'var(--color-text-2)', fontWeight: 600, textDecoration: 'none' }}>✉️ {member.email}</a>
              )}
              {member.phone && (
                <a href={`tel:${member.phone}`} style={{ color: 'var(--color-text-2)', fontWeight: 600, textDecoration: 'none' }}>📞 {member.phone}</a>
              )}
            </div>
          )}
          {member.communicationPrefs.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Prefers to be contacted by</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {member.communicationPrefs.map(pref => (
                  <span key={pref} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: 'var(--color-blue-bg)', color: 'var(--color-blue)' }}>{pref}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wall */}
      <PostComposer
        wallUserId={member.id}
        wallUserName={member.name}
        placeholder={isOwnProfile ? 'Share something on your page…' : `Write something on ${member.name}'s page…`}
      />
      {postsLoading && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading posts…</div>
      )}
      {!postsLoading && wallPosts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
          {isOwnProfile ? "You haven't posted anything yet." : `No posts on ${member.name}'s page yet. Be the first to write something.`}
        </div>
      )}
      {wallPosts.map(post => (
        <PostCard key={post.id} post={post as unknown as Post} />
      ))}

      {editProfileOpen && <EditProfileModal />}
    </div>
  )
}
