import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import CreateEventModal from './CreateEventModal'
import { EventCard, UpcomingEvents, type EventItem } from './EventCard'
import { useFeedPosts } from '../api-client/posts'
import { typeLabel, typeStyle, ROLE_STYLE } from './OrgView'
import { useOpenProfile } from './ProfileView'

interface OrgMember {
  userId: string
  email: string
  name: string
  avatarUrl: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
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
  hasPendingRequest: boolean
  pendingRequestCount: number
}

function MembersOnlyGate({ ministryName, onRequestJoin, requestJoinBusy, hasPendingRequest }: {
  ministryName: string
  onRequestJoin: () => void
  requestJoinBusy: boolean
  hasPendingRequest: boolean
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>Members Only</div>
      <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: '18px' }}>
        This is shared privately with {ministryName}'s members. Request to join to see and take part.
      </div>
      <button
        onClick={onRequestJoin}
        disabled={requestJoinBusy || hasPendingRequest}
        style={{
          padding: '9px 22px', borderRadius: '8px', cursor: (requestJoinBusy || hasPendingRequest) ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
          border: '1px solid var(--color-gold-border)',
          backgroundColor: hasPendingRequest ? 'var(--color-surface)' : 'var(--color-gold-bg)',
          color: 'var(--color-gold)',
          opacity: requestJoinBusy ? 0.6 : 1,
        }}
      >{requestJoinBusy ? '…' : hasPendingRequest ? 'Request Pending' : 'Request to Join'}</button>
    </div>
  )
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

export default function MinistryDetailView({ ministry, currentUserId, onBack, onRequestJoin, requestJoinBusy }: {
  ministry: MinistrySummary
  currentUserId: string
  onBack: () => void
  onRequestJoin: () => void
  requestJoinBusy: boolean
}) {
  const [tab, setTab] = useState<'feed' | 'prayer' | 'testimonies' | 'events' | 'members' | 'about'>('feed')
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const openProfile = useOpenProfile()

  const isMember = ministry.members.some(m => m.userId === currentUserId)
  const myRole = ministry.members.find(m => m.userId === currentUserId)?.role
  const canPostEvents = myRole === 'owner' || myRole === 'admin'

  const { data: allPosts, isLoading: postsLoading } = useFeedPosts()
  const ministryPosts = (allPosts ?? []).filter(p => p.orgId === ministry.id && p.author && p.author.trim() !== '')
  // Prayer requests and testimonies get their own tabs, so the general feed
  // tab excludes them to avoid showing the same posts twice within one page.
  const feedPosts = ministryPosts.filter(p => p.type !== 'prayer' && p.type !== 'testimony')
  const prayerPosts = ministryPosts.filter(p => p.type === 'prayer')
  const testimonyPosts = ministryPosts.filter(p => p.type === 'testimony')
  const sortedMembers = [...ministry.members].sort((a, b) => {
    const order: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 }
    return (order[a.role] ?? 4) - (order[b.role] ?? 4)
  })

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
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', backgroundColor: typeStyle(ministry.type).bg, color: typeStyle(ministry.type).color }}>{typeLabel(ministry.type)}</span>
                {ministry.verified && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', backgroundColor: '#ECFDF5', color: '#047857' }}>✓ Verified</span>}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>
                <strong style={{ color: 'var(--color-text-1)' }}>{ministry.members.length}</strong> members
                {ministry.location ? ` · ${ministry.location}` : ''}
              </div>
            </div>
            {!isMember && (
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={onRequestJoin}
                  disabled={requestJoinBusy || ministry.hasPendingRequest}
                  style={{
                    padding: '9px 20px', borderRadius: '8px', cursor: (requestJoinBusy || ministry.hasPendingRequest) ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
                    border: '1px solid var(--color-gold-border)',
                    backgroundColor: ministry.hasPendingRequest ? 'var(--color-surface)' : 'var(--color-gold-bg)',
                    color: 'var(--color-gold)',
                    opacity: requestJoinBusy ? 0.6 : 1,
                  }}
                >{requestJoinBusy ? '…' : ministry.hasPendingRequest ? 'Request Pending' : 'Request to Join'}</button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)', padding: '0 20px', overflowX: 'auto' }}>
          {(['feed', 'prayer', 'testimonies', 'events', 'members', 'about'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0,
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
          <PostComposer fixedOrgId={ministry.id} placeholder={`Share something with ${ministry.name}…`} />
          <UpcomingEvents events={events} onChanged={loadEvents} onEdit={setEditingEvent} showOrg={false} />
          {postsLoading && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading posts…</div>
          )}
          {!postsLoading && feedPosts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
              No posts yet. Be the first to post here.
            </div>
          )}
          {feedPosts.map(post => (
            <PostCard key={post.id} post={post as unknown as Post} />
          ))}
        </div>
      )}

      {/* Prayer tab — members only */}
      {tab === 'prayer' && (
        <div>
          {!isMember ? (
            <MembersOnlyGate ministryName={ministry.name} onRequestJoin={onRequestJoin} requestJoinBusy={requestJoinBusy} hasPendingRequest={ministry.hasPendingRequest} />
          ) : (
            <div>
              <PostComposer type="prayer" fixedOrgId={ministry.id} forcedVisibility="private" placeholder={`Share a prayer request with ${ministry.name} members…`} />
              {postsLoading && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading…</div>
              )}
              {!postsLoading && prayerPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
                  No prayer requests yet. Be the first to share one with the members.
                </div>
              )}
              {prayerPosts.map(post => (
                <PostCard key={post.id} post={post as unknown as Post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Testimonies tab — members only */}
      {tab === 'testimonies' && (
        <div>
          {!isMember ? (
            <MembersOnlyGate ministryName={ministry.name} onRequestJoin={onRequestJoin} requestJoinBusy={requestJoinBusy} hasPendingRequest={ministry.hasPendingRequest} />
          ) : (
            <div>
              <PostComposer type="testimony" fixedOrgId={ministry.id} forcedVisibility="private" placeholder={`Share what God has done, with ${ministry.name} members…`} />
              {postsLoading && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading…</div>
              )}
              {!postsLoading && testimonyPosts.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text-2)', fontSize: '14px' }}>
                  No testimonies yet. Be the first to share one with the members.
                </div>
              )}
              {testimonyPosts.map(post => (
                <PostCard key={post.id} post={post as unknown as Post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>
            {ministry.members.length} Members
          </div>
          {sortedMembers.map(m => {
            const rs = ROLE_STYLE[m.role] ?? ROLE_STYLE.member
            return (
              <div key={m.userId} onClick={() => openProfile(m.userId)} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px',
                borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--color-hover)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
              >
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt={m.name} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '15px' }}>{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{m.name || m.email}</div>
                  {m.email && <div style={{ fontSize: '12px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email}</div>}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: rs.bg, color: rs.color, textTransform: 'capitalize', flexShrink: 0 }}>{m.role}</span>
              </div>
            )
          })}
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
          {editingEvent && (
            <CreateEventModal
              event={editingEvent}
              orgId={ministry.id}
              orgName={ministry.name}
              onClose={() => setEditingEvent(null)}
              onCreated={() => { setEditingEvent(null); loadEvents() }}
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
              <EventCard key={event.id} event={event} onChanged={loadEvents} onEdit={setEditingEvent} showOrg={false} />
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
