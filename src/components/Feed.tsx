import { useState, useEffect } from 'react'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import DirectoryView from './DirectoryView'
import GroupsView from './GroupsView'
import PrayerRequestsView from './PrayerRequestsView'
import TestimoniesView from './TestimoniesView'
import EventsView from './EventsView'
import ResourcesView from './ResourcesView'
import BlogView, { BlogPostFeedCard, type BlogPost } from './BlogView'
import GlobalMapView from './GlobalMapView'
import AboutView from './AboutView'
import OrgView from './OrgView'
import { EventCard, type EventItem } from './EventCard'
import CreateEventModal from './CreateEventModal'
import type { ActiveView } from '../App'
import { useFeedPosts, type FeedPost } from '../api-client/posts'
import { api } from '../api-client/server'
import { useUIStore } from '../store/ui'

type FeedEntry =
  | { kind: 'post'; ts: number; post: FeedPost }
  | { kind: 'event'; ts: number; event: EventItem }
  | { kind: 'blogPost'; ts: number; blogPost: BlogPost }

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

// "All Network" is always the active feed mode now (there's only one) — the
// second pill is a quick-link to the member's chosen primary ministry page,
// not a filter, so it only appears once one is resolved.
function FeedToggle({ primaryMinistry }: { primaryMinistry: { id: string; name: string } | null }) {
  const viewOrg = useUIStore(s => s.viewOrg)
  return (
    <div style={{
      display: 'inline-flex', backgroundColor: 'var(--color-surface)',
      borderRadius: '10px', padding: '3px', gap: '2px',
      border: '1px solid var(--color-border)',
      marginBottom: '12px',
    }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 16px', borderRadius: '8px', border: 'none',
          cursor: 'default', fontFamily: 'var(--font-sans)',
          fontSize: '13px', fontWeight: 700,
          backgroundColor: 'var(--color-card)', color: 'var(--color-text-1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        }}
      >
        <span style={{ fontSize: '14px' }}>🌐</span>
        All Network
      </button>
      {primaryMinistry && (
        <button
          onClick={() => viewOrg(primaryMinistry.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 16px', borderRadius: '8px', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            fontSize: '13px', fontWeight: 500,
            backgroundColor: 'transparent', color: 'var(--color-text-2)',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: '14px' }}>🏛</span>
          {primaryMinistry.name}
        </button>
      )}
    </div>
  )
}

function MainFeed() {
  const { data: allPosts, isLoading, isError } = useFeedPosts('network')
  const [events, setEvents] = useState<EventItem[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [primaryMinistry, setPrimaryMinistry] = useState<{ id: string; name: string } | null>(null)
  const activeHashtag = useUIStore(s => s.activeHashtag)
  const clearHashtag = useUIStore(s => s.clearHashtag)
  const primaryMinistryId = useUIStore(s => s.userProfile.primaryMinistryId)

  // Filter out truly orphaned posts (completely missing author). Members-only
  // ministry posts/events are NOT filtered out here — the backend already
  // only ever sends a caller private items from ministries they actually
  // belong to (GET /posts, GET /events), so if one shows up here it's
  // legitimately visible to this member. PostCard/EventCard render a
  // "🔒 Members Only" badge so it's still clear which items are private.
  const posts = allPosts?.filter(p => p.author && p.author.trim() !== '')

  function loadEvents() {
    api<EventItem[]>('/events').then(setEvents).catch(() => setEvents([]))
  }
  useEffect(() => { loadEvents() }, [])

  useEffect(() => {
    api<BlogPost[]>('/blog-posts').then(setBlogPosts).catch(() => setBlogPosts([]))
  }, [])

  // Resolved live from /orgs/my rather than cached in user_metadata, so a
  // ministry rename (or the member losing membership) shows up immediately
  // instead of showing a stale name — same reasoning as postedOnOrgName.
  useEffect(() => {
    if (!primaryMinistryId) { setPrimaryMinistry(null); return }
    api<{ id: string; name: string }[]>('/orgs/my')
      .then(orgs => setPrimaryMinistry(orgs.find(o => o.id === primaryMinistryId) ?? null))
      .catch(() => setPrimaryMinistry(null))
  }, [primaryMinistryId])

  // Posts, events, and blog posts interleaved by when they were posted/created
  // — a plain chronological feed rather than separate sections per type.
  const now = Date.now()
  let merged: FeedEntry[] = [
    ...(posts ?? []).map((post): FeedEntry => ({ kind: 'post', ts: now - post.recencyHours * 3_600_000, post })),
    ...events.map((event): FeedEntry => ({ kind: 'event', ts: event.createdAt ? new Date(event.createdAt).getTime() : 0, event })),
    ...blogPosts.map((blogPost): FeedEntry => ({ kind: 'blogPost', ts: blogPost.createdAt ? new Date(blogPost.createdAt).getTime() : 0, blogPost })),
  ].sort((a, b) => b.ts - a.ts)

  if (activeHashtag) {
    const needle = new RegExp(`#${activeHashtag}\\b`, 'i')
    merged = merged.filter(entry => entry.kind === 'post' && needle.test(entry.post.content ?? ''))
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <FeedToggle primaryMinistry={primaryMinistry} />
      {activeHashtag && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
          padding: '8px 14px', borderRadius: '10px',
          backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', flex: 1 }}>
            Filtering by #{activeHashtag}
          </span>
          <button onClick={clearHashtag} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
            color: 'var(--color-gold)', fontFamily: 'var(--font-sans)', padding: '2px 4px',
          }}>✕</button>
        </div>
      )}
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
      {merged.map(entry => {
        if (entry.kind === 'post') return <PostCard key={`p-${entry.post.id}`} post={entry.post as unknown as Post} />
        if (entry.kind === 'blogPost') return <BlogPostFeedCard key={`b-${entry.blogPost.id}`} post={entry.blogPost} />
        return (
          <div key={`e-${entry.event.id}`} style={{ marginBottom: '12px' }}>
            <EventCard event={entry.event} onChanged={loadEvents} onEdit={setEditingEvent} />
          </div>
        )
      })}
    </div>
  )
}

export default function Feed({ activeView }: { activeView: ActiveView }) {
  if (activeView === 'directory') return <DirectoryView />
  if (activeView === 'orgs')      return <OrgView />
  if (activeView === 'groups')    return <GroupsView />
  if (activeView === 'blog')      return <BlogView />
  if (activeView === 'prayer')    return <PrayerRequestsView />
  if (activeView === 'testimonies') return <TestimoniesView />
  if (activeView === 'events')    return <EventsView />
  if (activeView === 'resources') return <ResourcesView />
  if (activeView === 'map')       return <GlobalMapView />
  if (activeView === 'about')     return <AboutView />

  return <MainFeed />
}
