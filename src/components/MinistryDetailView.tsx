import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import CreateEventModal from './CreateEventModal'
import { EventCard, UpcomingEvents, type EventItem } from './EventCard'
import { useFeedPosts } from '../api-client/posts'

interface OrgMember {
  userId: string
  email: string
  name: string
  avatarUrl: string
  role: 'owner' | 'admin' | 'moderator'
  addedAt: string
}

export interface MinistrySummary {
  id: string
  name: string
  type: string
  description: string
  location: string
  website: string
  verified: boolean
  status: string
  img: string
  members: OrgMember[]
  following: boolean
  followerCount: number
}

function MinistryLogo({ ministry, size }: { ministry: Pick<MinistrySummary, 'name' | 'img'>; size: number }) {
  return ministry.img
    ? <img src={ministry.img} alt={ministry.name} style={{ width: size, height: size, borderRadius: size / 4, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: size / 4, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4,
      }}>🏛</div>
    )
}

export default function MinistryDetailView({ ministry, currentUserId, onBack, onFollowToggle, followBusy }: {
  ministry: MinistrySummary
  currentUserId: string
  onBack: () => void
  onFollowToggle: () => void
  followBusy: boolean
}) {
  const [tab, setTab] = useState<'feed' | 'events' | 'about'>('feed')
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [showCreateEvent, setShowCreateEvent] = useState(false)

  const isMember = ministry.members.some(m => m.userId === currentUserId)
  const myRole = ministry.members.find(m => m.userId === currentUserId)?.role
  const canPostEvents = myRole === 'owner' || myRole === 'admin'

  const { data: allPosts, isLoading: postsLoading } = useFeedPosts('network')
  const ministryPosts = (allPosts ?? []).filter(p => p.orgId === ministry.id && p.author && p.author.trim() !== '')

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const data = await api<EventItem[]>('/events')
      setEvents(data.filter(e => e.orgId === ministry.id))
    } catch {
      setEvents([])
    } finally {
      setEventsLoading(false)
    }
  }

  useEffect(() => { loadEvents() }, [])

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px',
        fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)',
        fontFamily: 'var(--font-sans)',
      }}>← Back to Ministries</button>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
            <MinistryLogo ministry={ministry} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-1)' }}>{ministry.name}</h1>
                {ministry.verified && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', backgroundColor: '#ECFDF5', color: '#047857' }}>✓ Verified</span>}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>
                <strong style={{ color: 'var(--color-text-1)' }}>{ministry.members.length}</strong> members ·{' '}
                <strong style={{ color: 'var(--color-text-1)' }}>{ministry.followerCount}</strong> followers
                {ministry.location ? ` · ${ministry.location}` : ''}
              </div>
            </div>
            {!isMember && (
              <button
                onClick={onFollowToggle}
                disabled={followBusy}
                style={{
                  padding: '9px 20px', borderRadius: '8px', cursor: followBusy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
                  border: ministry.following ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: ministry.following ? 'var(--color-surface)' : 'var(--color-navy)',
                  color: ministry.following ? 'var(--color-text-1)' : '#fff',
                  opacity: followBusy ? 0.6 : 1,
                }}
              >{followBusy ? '…' : ministry.following ? '✓ Following' : '+ Follow'}</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)', padding: '0 20px' }}>
          {(['feed', 'events', 'about'] as const).map(t => (
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

      {/* Feed tab */}
      {tab === 'feed' && (
        <div>
          <PostComposer fixedOrgId={ministry.id} fixedOrgName={ministry.name} placeholder={`Share something with ${ministry.name}…`} />
          <UpcomingEvents events={events} onChanged={loadEvents} showOrg={false} />
          {postsLoading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading posts…</div>
          )}
          {!postsLoading && ministryPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
              No posts yet. Be the first to post here.
            </div>
          )}
          {ministryPosts.map(post => (
            <PostCard key={post.id} post={post as unknown as Post} />
          ))}
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div>
          {canPostEvents && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button onClick={() => setShowCreateEvent(true)} style={{
                padding: '9px 18px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>+ Create Event</button>
            </div>
          )}
          {showCreateEvent && (
            <CreateEventModal
              orgId={ministry.id}
              orgName={ministry.name}
              onClose={() => setShowCreateEvent(false)}
              onCreated={() => { setShowCreateEvent(false); loadEvents() }}
            />
          )}
          {eventsLoading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading events…</div>
          )}
          {!eventsLoading && events.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
              No events yet. {canPostEvents ? 'Create one above.' : 'Check back later.'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {events.map(event => (
              <EventCard key={event.id} event={event} onChanged={loadEvents} showOrg={false} />
            ))}
          </div>
        </div>
      )}

      {/* About tab */}
      {tab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>About</div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.7 }}>{ministry.description || 'No description yet.'}</p>
          </div>
          <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Details</div>
            {[
              { label: 'Location', value: ministry.location || '—' },
              { label: 'Website', value: ministry.website || '—' },
              { label: 'Members', value: `${ministry.members.length}` },
              { label: 'Followers', value: `${ministry.followerCount}` },
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
