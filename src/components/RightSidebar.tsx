import { useState, useEffect } from 'react'
import { useOpenProfile } from './ProfileView'
import { useUIStore } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../api-client/server'
import { useFeedPosts } from '../api-client/posts'
import { useActiveMembers } from '../api-client/presence'
import type { EventItem } from './EventCard'

interface VerificationRequest {
  id: string
  title: string
  church: string
  reason: string
  submittedAt: string
  status: 'pending' | 'approved' | 'denied'
}

function GetVerifiedBox() {
  const { currentUser } = useAuth()
  const [request, setRequest] = useState<VerificationRequest | null | undefined>(undefined)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [church, setChurch] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    api<VerificationRequest | null>('/verification-requests/mine').then(setRequest).catch(() => setRequest(null))
  }

  useEffect(() => { if (!currentUser?.verified) load() }, [currentUser?.verified])

  if (currentUser?.verified || request === undefined) return null

  async function submit() {
    if (!reason.trim()) { setErr('Please share why you\'re requesting verification.'); return }
    setSubmitting(true); setErr('')
    try {
      await api('/verification-requests', { method: 'POST', body: JSON.stringify({ title: title.trim(), church: church.trim(), reason: reason.trim() }) })
      setShowForm(false); setTitle(''); setChurch(''); setReason('')
      load()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
      borderRadius: '12px', padding: '18px',
      border: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '6px' }}>✦ Get Verified</div>

      {request?.status === 'pending' ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          ⏳ Your verification request is pending review. We'll notify you once an admin responds.
        </p>
      ) : showForm ? (
        <div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title / Role (e.g. Senior Pastor)" style={inputStyle} />
          <input value={church} onChange={e => setChurch(e.target.value)} placeholder="Church / Ministry" style={inputStyle} />
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you requesting verification?" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
          {err && <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '8px' }}>{err}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
            <button onClick={submit} disabled={submitting} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'var(--font-sans)' }}>{submitting ? 'Submitting…' : 'Submit'}</button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            {request?.status === 'denied'
              ? 'Your last request wasn\'t approved. You can submit a new request below.'
              : 'Verified members gain access to leadership groups, exclusive events, and the full FMCI network directory.'}
          </p>
          <button onClick={() => setShowForm(true)} style={{
            width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
            color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}>Apply for Verification →</button>
        </>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', marginBottom: '8px',
  borderRadius: '7px', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)',
  color: '#fff', fontSize: '12px', fontFamily: 'var(--font-sans)', outline: 'none',
}

interface MyOrgSummary {
  id: string
  following: boolean
  members: { userId: string }[]
}

function ProfileChecklist() {
  const { currentUser } = useAuth()
  const setActiveView = useUIStore(s => s.setActiveView)
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
    { done: hasPosted, label: 'Make your first post', action: () => setActiveView('feed') },
    { done: hasMinistry, label: 'Follow or join a ministry', action: () => setActiveView('orgs') },
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
  const focusEvent = useUIStore(s => s.focusEvent)

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
          <div key={e.id} onClick={() => focusEvent(e.id)} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}>
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

function ActiveUsersWidget() {
  const openProfile = useOpenProfile()
  const { data: active } = useActiveMembers()
  const shown = (active ?? []).slice(0, 8)

  if (shown.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '14px 16px', marginBottom: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
        🟢 Active Now {active && active.length > 0 && <span style={{ color: 'var(--color-text-3)' }}>· {active.length}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {shown.map(m => (
          <div key={m.id} onClick={() => openProfile(m.id)} style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {m.avatarUrl
                ? <img src={m.avatarUrl} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>
              }
              <span style={{
                position: 'absolute', bottom: '-2px', right: '-2px', width: '11px', height: '11px', borderRadius: '50%',
                backgroundColor: '#22c55e', border: '2px solid var(--color-card)',
              }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
              {(m.title || m.church) && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[m.title, m.church].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AboutFmciBox() {
  const setActiveView = useUIStore(s => s.setActiveView)

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '16px', marginBottom: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>ℹ️ About FMCI</div>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
        Learn about our mission, vision, and the leadership behind the Federation of Ministers and Churches International.
      </p>
      <button
        onClick={() => setActiveView('about')}
        style={{
          width: '100%', padding: '8px', borderRadius: '8px', cursor: 'pointer',
          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 700,
          fontFamily: 'var(--font-sans)',
        }}
      >Learn More →</button>
    </div>
  )
}

interface NewMemberProfile {
  id: string
  name: string
  title: string
  church: string
  avatarUrl: string
  createdAt: string
}

function NewMembersWidget() {
  const openProfile = useOpenProfile()
  const [members, setMembers] = useState<NewMemberProfile[] | null>(null)

  useEffect(() => {
    api<NewMemberProfile[]>('/members').then(setMembers).catch(() => setMembers([]))
  }, [])

  const newest = [...(members ?? [])]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5)

  if (newest.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '14px 16px', marginBottom: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>🆕 New Members</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {newest.map(m => (
          <div key={m.id} onClick={() => openProfile(m.id)} style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
            {m.avatarUrl
              ? <img src={m.avatarUrl} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
              : <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(m.name || '?').slice(0, 2).toUpperCase()}</div>
            }
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(m.title || m.church) ? [m.title, m.church].filter(Boolean).join(' · ') : (m.createdAt ? `Joined ${new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RightSidebar() {
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
      <ProfileChecklist />

      {onHomeFeed && <SidebarEvents />}

      {onHomeFeed && <ActiveUsersWidget />}

      <AboutFmciBox />

      {onHomeFeed && <NewMembersWidget />}

      <GetVerifiedBox />
    </aside>
  )
}
