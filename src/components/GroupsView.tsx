import { useState } from 'react'
import Badge, { type BadgeVariant } from './Badge'
import { useOpenProfile } from './ProfileModal'
import { useUIStore } from '../store/ui'

interface Group {
  id: string
  name: string
  description: string
  about: string
  members: number
  type: 'Leadership-Only' | 'Private' | 'Public' | 'Invite-Only'
  badge?: BadgeVariant
  img: string
  lastActivity: string
  joined?: boolean
  admins: string[]
  founded: string
}

const GROUPS: Group[] = []


const TYPE_STYLE: Record<Group['type'], { color: string; bg: string }> = {
  'Leadership-Only': { color: '#92700A', bg: '#FBF5E6' },
  'Private':         { color: '#1D4ED8', bg: '#EFF6FF' },
  'Public':          { color: '#047857', bg: '#ECFDF5' },
  'Invite-Only':     { color: '#6D28D9', bg: '#F5F3FF' },
}

function GroupDetail({ group, onBack }: { group: Group; onBack: () => void }) {
  const [tab, setTab] = useState<'posts' | 'members' | 'about'>('posts')
  const [postText, setPostText] = useState('')
  const [localPosts, setLocalPosts] = useState<{ author: string; avatar: string; time: string; content: string }[]>([])
  const openProfile = useOpenProfile()
  const userProfile = useUIStore(s => s.userProfile)
  const ts = TYPE_STYLE[group.type]

  function submitPost() {
    if (!postText.trim()) return
    setLocalPosts(prev => [{
      author: userProfile.name,
      avatar: userProfile.avatarUrl,
      time: 'Just now',
      content: postText.trim(),
    }, ...prev])
    setPostText('')
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Back */}
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px',
        fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)',
        fontFamily: 'var(--font-sans)',
      }}>← Back to Groups</button>

      {/* Cover + header */}
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: '14px' }}>
        <img src={group.img} alt={group.name} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-1)' }}>{group.name}</h1>
                {group.badge && <Badge variant={group.badge} size="sm" />}
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', backgroundColor: ts.bg, color: ts.color }}>{group.type}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>
                <strong style={{ color: 'var(--color-text-1)' }}>{group.members}</strong> members · Active {group.lastActivity}
              </div>
            </div>
            <button style={{
              padding: '9px 20px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-2)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
            }}>Leave Group</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)', padding: '0 20px' }}>
          {(['posts', 'members', 'about'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-sans)',
              color: tab === t ? 'var(--color-navy)' : 'var(--color-text-2)',
              borderBottom: tab === t ? '2px solid var(--color-navy)' : '2px solid transparent',
              transition: 'all 0.15s', textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Posts tab */}
      {tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Composer */}
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              {userProfile.avatarUrl
                ? <img src={userProfile.avatarUrl} alt="You" style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(userProfile.name || '?').slice(0, 2).toUpperCase()}</div>
              }
              <div style={{ flex: 1 }}>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder={`Post to ${group.name}…`}
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'none',
                    border: '1px solid var(--color-border)', borderRadius: '8px',
                    fontSize: '14px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
                    backgroundColor: 'var(--color-surface)', outline: 'none', lineHeight: 1.5,
                  }}
                  onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-navy)' }}
                  onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-border)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button onClick={submitPost} disabled={!postText.trim()} style={{
                    padding: '7px 18px', borderRadius: '8px', border: 'none',
                    backgroundColor: postText.trim() ? 'var(--color-navy)' : 'var(--color-border)',
                    color: postText.trim() ? '#fff' : 'var(--color-text-3)',
                    fontSize: '13px', fontWeight: 700, cursor: postText.trim() ? 'pointer' : 'default',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}>Post</button>
                </div>
              </div>
            </div>
          </div>

          {localPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
              No posts yet. Be the first to post in this group.
            </div>
          )}

          {localPosts.map((post, i) => (
            <div key={i} style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                {post.avatar
                  ? <img src={post.avatar} alt={post.author} onClick={() => openProfile(post.author)} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} />
                  : <div onClick={() => openProfile(post.author)} style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, cursor: 'pointer', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '14px' }}>{(post.author || '?').slice(0, 2).toUpperCase()}</div>
                }
                <div>
                  <div
                    onClick={() => openProfile(post.author)}
                    style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-1)', cursor: 'pointer' }}
                  >{post.author}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{post.time}</div>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{post.content}</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
                {['🙏 Amen', '❤️ Heart', '💬 Comment'].map((label, j) => (
                  <button key={j} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                  >{label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {group.members} Members
          </div>
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>
            {group.members} members in this group
          </div>
        </div>
      )}

      {/* About tab */}
      {tab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>About</div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.7 }}>{group.about}</p>
          </div>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Details</div>
            {[
              { label: 'Access', value: group.type },
              { label: 'Founded', value: group.founded },
              { label: 'Members', value: `${group.members} members` },
              { label: 'Admins', value: group.admins.join(', ') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ width: '90px', flexShrink: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-2)' }}>{label}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-1)', fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupsView() {
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  const myGroups = GROUPS.filter(g => g.joined)
  const discoverGroups = GROUPS.filter(g => !g.joined)

  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} />
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-sans)' }}>Groups</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Ministry circles, leadership channels, and prayer networks</p>
        </div>
        <button style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Create Group</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['my', 'discover'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '9px 22px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700,
            backgroundColor: tab === t ? 'var(--color-navy)' : 'var(--color-card)',
            color: tab === t ? '#fff' : 'var(--color-text-2)',
            border: tab === t ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}>
            {t === 'my' ? `My Groups (${myGroups.length})` : 'Discover Groups'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {(Object.entries(TYPE_STYLE) as [Group['type'], { color: string; bg: string }][]).map(([type, style]) => (
          <span key={type} style={{
            fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
            backgroundColor: style.bg, color: style.color, border: `1px solid ${style.color}20`,
          }}>{type}</span>
        ))}
      </div>

      {(tab === 'my' ? myGroups : discoverGroups).length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>
            {tab === 'my' ? "You haven't joined any groups yet" : 'No groups available to discover'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {tab === 'my' ? 'Browse Discover Groups to find ministry circles and prayer networks to join.' : 'Groups created by FMCI admins will appear here.'}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {(tab === 'my' ? myGroups : discoverGroups).map((group, i) => {
          const ts = TYPE_STYLE[group.type]
          return (
            <div key={i} style={{
              backgroundColor: 'var(--color-card)', borderRadius: '12px',
              border: '1px solid var(--color-border)', overflow: 'hidden',
              cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              <div style={{ position: 'relative' }}>
                <img src={group.img} alt={group.name} style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  backgroundColor: ts.bg, color: ts.color, border: `1px solid ${ts.color}20`,
                }}>{group.type}</div>
              </div>
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)', lineHeight: 1.3 }}>{group.name}</div>
                  {group.badge && <Badge variant={group.badge} size="sm" showLabel={false} />}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: '10px', flex: 1 }}>{group.description}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--color-text-1)' }}>{group.members}</strong> members · Active {group.lastActivity}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); if (group.joined) setSelectedGroup(group) }}
                  style={{
                    width: '100%', padding: '9px', borderRadius: '8px',
                    border: group.joined ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: group.joined ? 'var(--color-surface)' : 'var(--color-navy)',
                    color: group.joined ? 'var(--color-text-1)' : '#fff',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s',
                  }}
                >
                  {group.joined ? 'View Group →' : 'Request to Join'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
