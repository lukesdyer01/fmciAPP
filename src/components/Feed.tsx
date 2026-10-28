const BetaFeedback = lazy(() => import('./BetaFeedback'))
const SavedItemsView = lazy(() => import('./SavedItemsView'))
import { lazy, Suspense } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import Stories from './Stories'
import PeopleYouMayKnow from './PeopleYouMayKnow'
import RecommendedResources from './RecommendedResources'
import { feedCarouselPosition } from '../lib/resourceSuggestions'
const SafetySupportView = lazy(() => import('./SafetySupportView'))
import { useState, useEffect, Fragment } from 'react'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
const DirectoryView = lazy(() => import('./DirectoryView'))
const GroupsView = lazy(() => import('./GroupsView'))
const PrayerRequestsView = lazy(() => import('./PrayerRequestsView'))
const TestimoniesView = lazy(() => import('./TestimoniesView'))
import EventsView from './EventsView'
const ResourcesView = lazy(() => import('./ResourcesView'))
import BlogView, { BlogPostFeedCard, type BlogPost } from './BlogView'
const GlobalMapView = lazy(() => import('./GlobalMapView'))
const AboutView = lazy(() => import('./AboutView'))
const InviteMembersView = lazy(() => import('./InviteMembersView'))
const PrivacyPolicyView = lazy(() => import('./PrivacyPolicyView'))
import OrgView from './OrgView'
import ProfileChecklist from './ProfileChecklist'
import { EventCard, type EventItem } from './EventCard'
import CreateEventModal from './CreateEventModal'
import type { ActiveView } from '../App'
import { adaptPost, type FeedPost } from '../api-client/posts'
import { api } from '../api-client/server'
import { useUIStore } from '../store/ui'
import { usePullToRefresh, RefreshIndicator } from '../hooks/usePullToRefresh'

type FeedEntry =
  | { kind: 'post'; ts: number; post: FeedPost }
  | { kind: 'event'; ts: number; event: EventItem }
  | { kind: 'blogPost'; ts: number; blogPost: BlogPost }

function PostSkeleton() {
  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: 'var(--feed-item-radius)',
      marginBottom: 'var(--feed-item-gap)', border: 'var(--feed-item-border)',
      borderBottom: 'var(--feed-item-divider)', boxShadow: 'var(--feed-item-shadow)',
      padding: '16px', overflow: 'hidden',
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

type FeedFilter = 'network' | 'ministry'

// A real two-state toggle again (like the old Network/Following pair) — the
// second pill only exists once a primary ministry is resolved, shows its
// name, and switches the feed to ministry-only items rather than navigating
// away.
function FeedToggle({ filter, setFilter, primaryMinistry }: {
  filter: FeedFilter
  setFilter: (f: FeedFilter) => void
  primaryMinistry: { id: string; name: string } | null
}) {
  const options = [
    { id: 'network' as const, label: 'All Network', icon: '🌐' },
    ...(primaryMinistry ? [{ id: 'ministry' as const, label: primaryMinistry.name, icon: '🏛' }] : []),
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
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FeedFilter>('network')
  const [suggestionsVersion, setSuggestionsVersion] = useState(0)

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [primaryMinistry, setPrimaryMinistry] = useState<{ id: string; name: string } | null>(null)
  const activeHashtag = useUIStore(s => s.activeHashtag)
  const clearHashtag = useUIStore(s => s.clearHashtag)
  const primaryMinistryId = useUIStore(s => s.userProfile.primaryMinistryId)

  type Page = { items: { kind: 'post' | 'event' | 'blogPost'; id: string; createdAt: string; value: unknown }[]; nextCursor: string | null }
  const timeline = useInfiniteQuery({
    queryKey: ['timeline', filter === 'ministry' ? primaryMinistry?.id : null, activeHashtag],
    initialPageParam: '',
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' })
      if (pageParam) params.set('cursor', pageParam)
      if (filter === 'ministry' && primaryMinistry) params.set('orgId', primaryMinistry.id)
      if (activeHashtag) params.set('hashtag', activeHashtag)
      return api<Page>(`/feed?${params}`)
    },
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
  const isLoading = timeline.isPending, isError = timeline.isError
  const refreshAll = async () => {
    setSuggestionsVersion(version => version + 1)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['people-suggestions'] }),
      queryClient.invalidateQueries({ queryKey: ['resource-suggestions'] }),
      queryClient.invalidateQueries({ queryKey: ['stories'] }),
      queryClient.resetQueries({ queryKey: ['timeline'] }),
    ])
  }
  const { refreshing, pulling, distance } = usePullToRefresh(refreshAll)
  function loadEvents() { void queryClient.invalidateQueries({ queryKey: ['timeline'] }) }

  // Resolved live from /orgs/my rather than cached in user_metadata, so a
  // ministry rename (or the member losing membership) shows up immediately
  // instead of showing a stale name — same reasoning as postedOnOrgName.
  useEffect(() => {
    if (!primaryMinistryId) { setPrimaryMinistry(null); setFilter('network'); return }
    api<{ id: string; name: string }[]>('/orgs/my')
      .then(orgs => setPrimaryMinistry(orgs.find(o => o.id === primaryMinistryId) ?? null))
      .catch(() => setPrimaryMinistry(null))
  }, [primaryMinistryId])

  const seen = new Set<string>()
  const merged: FeedEntry[] = (timeline.data?.pages.flatMap(page => page.items) ?? []).filter(item => {
    const key = `${item.kind}:${item.id}`
    if (seen.has(key)) return false
    seen.add(key); return true
  }).map(item => {
    const ts = Date.parse(item.createdAt) || 0
    if (item.kind === 'post') return { kind: 'post', ts, post: adaptPost(item.value, 0) }
    if (item.kind === 'event') return { kind: 'event', ts, event: item.value as EventItem }
    return { kind: 'blogPost', ts, blogPost: item.value as BlogPost }
  })

  return (
    <div className="main-feed">
      <ProfileChecklist mobileWelcome />
      <RefreshIndicator refreshing={refreshing} pulling={pulling} distance={distance} />
      {primaryMinistry && <FeedToggle filter={filter} setFilter={setFilter} primaryMinistry={primaryMinistry} />}
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
      <Stories />
      {filter === 'ministry' && primaryMinistry ? (
        // Same composer the ministry's own Feed tab uses — lets an owner/admin
        // choose to post as themselves or as the ministry, and any member
        // post as themselves on this ministry's page — instead of the
        // personal-only composer shown in All Network mode. Keyed by mode so
        // switching the toggle remounts with a clean draft rather than
        // carrying over half-typed text/state from the other composer.
        <PostComposer key="ministry" fixedOrgId={primaryMinistry.id} placeholder={`Share something with ${primaryMinistry.name}…`} />
      ) : (
        <PostComposer key="network" hidePostAs />
      )}
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
          Unable to load feed. <button onClick={() => timeline.refetch()}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && filter === 'ministry' && primaryMinistry && merged.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: 'var(--feed-item-radius)',
          border: 'var(--feed-item-border)', borderBottom: 'var(--feed-item-divider)',
          boxShadow: 'var(--feed-item-shadow)', padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏛</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            No posts or events from {primaryMinistry.name} yet
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Check back later, or switch back to All Network.
          </div>
        </div>
      )}
      {!isLoading && !isError && filter === 'network' && merged.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: 'var(--feed-item-radius)',
          border: 'var(--feed-item-border)', borderBottom: 'var(--feed-item-divider)',
          boxShadow: 'var(--feed-item-shadow)', padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🌐</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            Nothing in the network feed yet
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            Be the first to share something with the FMCI family — pull down to refresh anytime.
          </div>
        </div>
      )}
      {Array.from({ length: merged.length + 1 }, (_, index) => {
        const entry = merged[index]
        const showDiscovery = !isLoading && !isError && filter === 'network' && !activeHashtag
        return (
          <Fragment key={entry ? `${entry.kind}-${entry.kind === 'post' ? entry.post.id : entry.kind === 'blogPost' ? entry.blogPost.id : entry.event.id}` : 'feed-end'}>
            {showDiscovery && index === feedCarouselPosition(merged.length, 3) && <RecommendedResources key={`resources-${suggestionsVersion}`} />}
            {showDiscovery && index === feedCarouselPosition(merged.length, 6) && <PeopleYouMayKnow key={`people-${suggestionsVersion}`} />}
            {entry?.kind === 'post' && <PostCard post={entry.post as unknown as Post} />}
            {entry?.kind === 'blogPost' && <BlogPostFeedCard post={entry.blogPost} />}
            {entry?.kind === 'event' && (
              <div style={{ marginBottom: 'var(--feed-item-gap)', borderBottom: 'var(--feed-item-divider)' }}>
                <EventCard event={entry.event} onChanged={loadEvents} onEdit={setEditingEvent} />
              </div>
            )}
          </Fragment>
        )
      })}
      {timeline.hasNextPage && <button disabled={timeline.isFetchingNextPage} onClick={() => timeline.fetchNextPage()} style={{ padding: 14, margin: '16px 0', width: '100%', borderRadius: 8, border: '1px solid var(--color-border)', color: 'var(--color-text-1)', background: 'var(--color-card)' }}>{timeline.isFetchingNextPage ? 'Loading…' : 'Load more'}</button>}

    </div>
  )
}

export default function Feed({ activeView }: { activeView: ActiveView }) {
  if (activeView === 'feedback') return <BetaFeedback />
  if (activeView === 'saved') return <SavedItemsView />
  if (activeView === 'safety') return <SafetySupportView />
  if (activeView === 'invite') return <InviteMembersView />
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
  if (activeView === 'privacy')   return <PrivacyPolicyView />

  return <MainFeed />
}
