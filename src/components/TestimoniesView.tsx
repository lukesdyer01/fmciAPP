import { useState } from 'react'
import PostComposer from './PostComposer'
import PostCard, { TESTIMONY_CATEGORY_STYLE, type Post } from './PostCard'
import { useFeedPosts } from '../api-client/posts'

type CategoryFilter = 'all' | keyof typeof TESTIMONY_CATEGORY_STYLE

const CATEGORY_ORDER: CategoryFilter[] = ['all', 'healing', 'provision', 'salvation', 'deliverance', 'other']

export default function TestimoniesView() {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const { data: allPosts, isLoading, isError } = useFeedPosts('network')

  const testimonies = (allPosts ?? [])
    .filter(p => p.type === 'testimony' && p.author && p.author.trim() !== '')
    .filter(p => filter === 'all' || p.testimonyCategory === filter)

  const counts: Record<CategoryFilter, number> = {
    all: (allPosts ?? []).filter(p => p.type === 'testimony').length,
    healing: (allPosts ?? []).filter(p => p.type === 'testimony' && p.testimonyCategory === 'healing').length,
    provision: (allPosts ?? []).filter(p => p.type === 'testimony' && p.testimonyCategory === 'provision').length,
    salvation: (allPosts ?? []).filter(p => p.type === 'testimony' && p.testimonyCategory === 'salvation').length,
    deliverance: (allPosts ?? []).filter(p => p.type === 'testimony' && p.testimonyCategory === 'deliverance').length,
    other: (allPosts ?? []).filter(p => p.type === 'testimony' && p.testimonyCategory === 'other').length,
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-sans)' }}>Testimony Wall</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Celebrate what God has done</p>
      </div>

      <PostComposer type="testimony" placeholder="Share what God has done…" hidePostAs />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {CATEGORY_ORDER.map(id => {
          const label = id === 'all' ? 'All' : TESTIMONY_CATEGORY_STYLE[id].label
          const icon = id === 'all' ? '' : TESTIMONY_CATEGORY_STYLE[id].icon + ' '
          return (
            <button key={id} onClick={() => setFilter(id)} style={{
              padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
              backgroundColor: filter === id ? 'var(--color-navy)' : 'var(--color-card)',
              color: filter === id ? '#fff' : 'var(--color-text-2)',
              border: filter === id ? 'none' : '1px solid var(--color-border)',
              transition: 'all 0.15s',
            }}>{icon}{label} ({counts[id]})</button>
          )
        })}
      </div>

      {isLoading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading testimonies…</div>
      )}

      {isError && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '14px' }}>Unable to load testimonies. Please try again.</div>
      )}

      {!isLoading && !isError && testimonies.length === 0 && (
        <div style={{
          backgroundColor: 'var(--color-card)', borderRadius: '12px',
          border: '1px solid var(--color-border)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-1)', marginBottom: '6px' }}>
            {filter === 'all' ? 'No testimonies yet' : `No ${TESTIMONY_CATEGORY_STYLE[filter as keyof typeof TESTIMONY_CATEGORY_STYLE]?.label.toLowerCase()} testimonies yet`}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {filter === 'all' ? 'Be the first to share what God has done.' : 'Check back later or try a different category.'}
          </div>
        </div>
      )}

      {!isLoading && !isError && testimonies.map(post => (
        <PostCard key={post.id} post={post as unknown as Post} />
      ))}
    </div>
  )
}
