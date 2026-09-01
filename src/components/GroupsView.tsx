import { useState, useEffect } from 'react'
import Badge, { type BadgeVariant } from './Badge'
import { useUIStore } from '../store/ui'
import { api } from '../api-client/server'

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

function GroupThumb({ group, height }: { group: Group; height: string }) {
  return group.img
    ? <img src={group.img} alt={group.name} style={{ width: '100%', height, objectFit: 'cover', display: 'block' }} />
    : (
      <div style={{
        width: '100%', height, background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
      }}>👥</div>
    )
}

const TYPE_STYLE: Record<Group['type'], { color: string; bg: string }> = {
  'Leadership-Only': { color: '#92700A', bg: '#FBF5E6' },
  'Private':         { color: '#1D4ED8', bg: '#EFF6FF' },
  'Public':          { color: '#047857', bg: '#ECFDF5' },
  'Invite-Only':     { color: '#6D28D9', bg: '#F5F3FF' },
}

function GroupDetail({ group, onBack, onLeft }: { group: Group; onBack: () => void; onLeft: () => void }) {
  const [tab, setTab] = useState<'posts' | 'members' | 'about'>('posts')
  const [postText, setPostText] = useState('')
  const [localPosts, setLocalPosts] = useState<{ author: string; avatar: string; time: string; content: string }[]>([])
  const [leaving, setLeaving] = useState(false)
  const userProfile = useUIStore(s => s.userProfile)
  const ts = TYPE_STYLE[group.type]

  async function handleLeave() {
    if (!window.confirm(`Leave ${group.name}?`)) return
    setLeaving(true)
    try {
      await api(`/groups/${group.id}/leave`, { method: 'POST' })
      onLeft()
    } catch {
      setLeaving(false)
    }
  }

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
        <GroupThumb group={group} height="160px" />
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
            <button onClick={handleLeave} disabled={leaving} style={{
              padding: '9px 20px', borderRadius: '8px', cursor: leaving ? 'default' : 'pointer',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-2)', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
              opacity: leaving ? 0.6 : 1,
            }}>{leaving ? 'Leaving…' : 'Leave Group'}</button>
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
                  ? <img src={post.avatar} alt={post.author} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '14px' }}>{(post.author || '?').slice(0, 2).toUpperCase()}</div>
                }
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-1)' }}>{post.author}</div>
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
              { label: 'Founded', value: group.founded ? new Date(group.founded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
              { label: 'Members', value: `${group.members} members` },
              { label: 'Admins', value: `${group.admins?.length ?? 0} admin${(group.admins?.length ?? 0) === 1 ? '' : 's'}` },
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

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [about, setAbout] = useState('')
  const [type, setType] = useState<Group['type']>('Public')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleCreate() {
    if (!name.trim()) { setErr('Group name is required.'); return }
    setSaving(true); setErr('')
    try {
      await api('/groups', { method: 'POST', body: JSON.stringify({ name: name.trim(), description: description.trim(), about: about.trim(), type }) })
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create group.')
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '14px',
    fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Create Group</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Group Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Young Adults Ministry" style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Short Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="One line describing this group" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>About</label>
            <textarea value={about} onChange={e => setAbout(e.target.value)} placeholder="What's this group for?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Access</label>
            <select value={type} onChange={e => setType(e.target.value as Group['type'])} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="Public">Public — anyone can join</option>
              <option value="Private">Private</option>
              <option value="Invite-Only">Invite-Only</option>
              <option value="Leadership-Only">Leadership-Only</option>
            </select>
          </div>
          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GroupsView() {
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  async function load() {
    try {
      const data = await api<Group[]>('/groups')
      setGroups(data)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleJoin(group: Group) {
    setJoiningId(group.id)
    try {
      await api(`/groups/${group.id}/join`, { method: 'POST' })
      await load()
    } finally {
      setJoiningId(null)
    }
  }

  const myGroups = groups.filter(g => g.joined)
  const discoverGroups = groups.filter(g => !g.joined)

  if (selectedGroup) {
    return <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} onLeft={() => { setSelectedGroup(null); load() }} />
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-sans)' }}>Groups</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Ministry circles, leadership channels, and prayer networks</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Create Group</button>
      </div>

      {showCreate && (
        <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />
      )}

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

      {loading && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading groups…</div>
      )}

      {!loading && (tab === 'my' ? myGroups : discoverGroups).length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>
            {tab === 'my' ? "You haven't joined any groups yet" : 'No groups available to discover'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {tab === 'my' ? 'Browse Discover Groups to find ministry circles and prayer networks to join.' : 'Create the first group for the network.'}
          </div>
        </div>
      )}
      {!loading && (tab === 'my' ? myGroups : discoverGroups).length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {(tab === 'my' ? myGroups : discoverGroups).map(group => {
          const ts = TYPE_STYLE[group.type]
          return (
            <div key={group.id} style={{
              backgroundColor: 'var(--color-card)', borderRadius: '12px',
              border: '1px solid var(--color-border)', overflow: 'hidden',
              cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
              display: 'flex', flexDirection: 'column',
            }}
              onClick={() => { if (group.joined) setSelectedGroup(group) }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              <div style={{ position: 'relative' }}>
                <GroupThumb group={group} height="130px" />
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
                  onClick={e => { e.stopPropagation(); if (group.joined) setSelectedGroup(group); else handleJoin(group) }}
                  disabled={joiningId === group.id}
                  style={{
                    width: '100%', padding: '9px', borderRadius: '8px',
                    border: group.joined ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: group.joined ? 'var(--color-surface)' : 'var(--color-navy)',
                    color: group.joined ? 'var(--color-text-1)' : '#fff',
                    fontSize: '13px', fontWeight: 700, cursor: joiningId === group.id ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s', opacity: joiningId === group.id ? 0.6 : 1,
                  }}
                >
                  {group.joined ? 'View Group →' : joiningId === group.id ? 'Joining…' : 'Join Group'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
