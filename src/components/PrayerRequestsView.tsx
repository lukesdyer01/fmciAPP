import { useState } from 'react'
import PostComposer from './PostComposer'
import PostCard, { type Post } from './PostCard'
import { useFeedPosts } from '../api-client/posts'

type StatusFilter = 'all' | 'unanswered' | 'answered'

export default function PrayerRequestsView() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const { data: allPosts, isLoading, isError } = useFeedPosts('network')

  const prayers = (allPosts ?? [])
    .filter(p => p.type === 'prayer' && p.author && p.author.trim() !== '')
    .filter(p => filter === 'all' || (p.prayerStatus ?? 'unanswered') === filter)

  const counts = {
    all: (allPosts ?? []).filter(p => p.type === 'prayer').length,
    unanswered: (allPosts ?? []).filter(p => p.type === 'prayer' && (p.prayerStatus ?? 'unanswered') === 'unanswered').length,
    answered: (allPosts ?? []).filter(p => p.type === 'prayer' && p.prayerStatus === 'answered').length,
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-sans)' }}>Prayer Requests</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Share a need, and stand with others in prayer</p>
      </div>

      <PostComposer type="prayer" placeholder="Share a prayer request with the network…" />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'unanswered' as const, label: 'Unanswered' },
          { id: 'answered' as const, label: 'Answered' },
        ]).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
            backgroundColor: filter === f.id ? 'var(--color-navy)' : 'var(--color-card)',
            color: filter === f.id ? '#fff' : 'var(--color-text-2)',
            border: filter === f.id ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}>{f.label} ({counts[f.id]})</button>
        ))}
      </div>

      {isLoading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading prayer requests…</div>
      )}

      {isError && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>Unable to load prayer requests. Please try again.</div>
      )}

      {!isLoading && !isError && prayers.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: '12px',
          border: '1px solid var(--color-border)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🙏</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            {filter === 'all' ? 'No prayer requests yet' : `No ${filter} prayer requests`}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {filter === 'all' ? 'Be the first to share a need with the network.' : 'Check back later or try a different filter.'}
          </div>
        </div>
      )}

      {!isLoading && !isError && prayers.map(post => (
        <PostCard key={post.id} post={post as unknown as Post} />
      ))}
    </div>
  )
}
