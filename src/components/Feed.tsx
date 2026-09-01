import { useState, useEffect } from 'react'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import DirectoryView from './DirectoryView'
import GroupsView from './GroupsView'
import PrayerRequestsView from './PrayerRequestsView'
import EventsView from './EventsView'
import ResourcesView from './ResourcesView'
import OrgView from './OrgView'
import { EventCard, type EventItem } from './EventCard'
import CreateEventModal from './CreateEventModal'
import type { ActiveView } from '../App'
import { useFeedPosts, type FeedPost } from '../api-client/posts'
import { api } from '../api-client/server'

type FeedEntry =
  | { kind: 'post'; ts: number; post: FeedPost }
  | { kind: 'event'; ts: number; event: EventItem }

type FeedFilter = 'network' | 'following'

function PostSkeleton() {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px', marginBottom: '12px',
      border: '1px solid var(--color-border)', padding: '16px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-border)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '14px', width: '40%', backgroundColor: 'var(--color-border)', borderRadius: '6px', marginBottom: '8px' }} />
          <div style={{ height: '11px', width: '60%', backgroundColor: 'var(--color-border-light)', borderRadius: '6px' }} />
        </div>
      </div>
      <div style={{ marginTop: '14px' }}>
        <div style={{ height: '13px', backgroundColor: 'var(--color-border-light)', borderRadius: '6px', marginBottom: '6px' }} />
        <div style={{ height: '13px', backgroundColor: 'var(--color-border-light)', borderRadius: '6px', marginBottom: '6px', width: '85%' }} />
        <div style={{ height: '13px', backgroundColor: 'var(--color-border-light)', borderRadius: '6px', width: '70%' }} />
      </div>
    </div>
  )
}

function FeedToggle({ filter, setFilter }: { filter: FeedFilter; setFilter: (f: FeedFilter) => void }) {
  const options: { id: FeedFilter; label: string; icon: string }[] = [
    { id: 'network',   label: 'All Network', icon: '🌐' },
    { id: 'following', label: 'Following',   icon: '👥' },
  ]
  return (
    <div style={{
      display: 'inline-flex', backgroundColor: 'var(--color-surface)',
      borderRadius: '10px', padding: '3px', gap: '2px',
      border: '1px solid var(--color-border)',
      marginBottom: '12px',
    }}>
      {options.map(opt => {
        const active = filter === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              fontSize: '13px', fontWeight: active ? 700 : 500,
              backgroundColor: active ? 'var(--color-card)' : 'transparent',
              color: active ? 'var(--color-text-1)' : 'var(--color-text-2)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '14px' }}>{opt.icon}</span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function MainFeed() {
  const [filter, setFilter] = useState<FeedFilter>('network')
  const { data: allPosts, isLoading, isError } = useFeedPosts(filter)
  const [events, setEvents] = useState<EventItem[]>([])
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)

  // Filter out truly orphaned posts (completely missing author)
  const posts = allPosts?.filter(p => p.author && p.author.trim() !== '')

  function loadEvents() {
    api<EventItem[]>('/events').then(setEvents).catch(() => setEvents([]))
  }
  useEffect(() => { loadEvents() }, [])

  // Posts and events interleaved by when they were posted/created — a plain
  // chronological feed rather than a separate pinned events section.
  const now = Date.now()
  const merged: FeedEntry[] = [
    ...(posts ?? []).map((post): FeedEntry => ({ kind: 'post', ts: now - post.recencyHours * 3_600_000, post })),
    ...events.map((event): FeedEntry => ({ kind: 'event', ts: event.createdAt ? new Date(event.createdAt).getTime() : 0, event })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <FeedToggle filter={filter} setFilter={setFilter} />
      <PostComposer hidePostAs />
      {editingEvent && (
        <CreateEventModal
          event={editingEvent}
          orgId={editingEvent.orgId ?? undefined}
          orgName={editingEvent.orgName ?? undefined}
          onClose={() => setEditingEvent(null)}
          onCreated={() => { setEditingEvent(null); loadEvents() }}
        />
      )}
      {isLoading && [1, 2, 3].map(i => <PostSkeleton key={i} />)}
      {isError && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>
          Unable to load feed. Please try again.
        </div>
      )}
      {!isLoading && posts?.length === 0 && filter === 'following' && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: '12px',
          border: '1px solid var(--color-border)', padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            No posts from people you follow yet
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Connect with and follow members to see their posts here.
          </div>
        </div>
      )}
      {merged.map(entry => entry.kind === 'post'
        ? <PostCard key={`p-${entry.post.id}`} post={entry.post as unknown as Post} />
        : (
          <div key={`e-${entry.event.id}`} style={{ marginBottom: '12px' }}>
            <EventCard event={entry.event} onChanged={loadEvents} onEdit={setEditingEvent} />
          </div>
        )
      )}
    </div>
  )
}

export default function Feed({ activeView }: { activeView: ActiveView }) {
  if (activeView === 'directory') return <DirectoryView />
  if (activeView === 'orgs')      return <OrgView />
  if (activeView === 'groups')    return <GroupsView />
  if (activeView === 'prayer')    return <PrayerRequestsView />
  if (activeView === 'events')    return <EventsView />
  if (activeView === 'resources') return <ResourcesView />

  return <MainFeed />
}
