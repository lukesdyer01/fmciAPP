import { useEffect, useState } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useUIStore } from '../store/ui'
import { useOpenProfile } from './ProfileView'
import BlogBlockRenderer from './BlogBlockRenderer'
import CreateBlogPostModal, { BLOG_TAGS } from './CreateBlogPostModal'
import type { BlogBlock } from './BlockEditor'

export interface BlogPost {
  id: string
  title: string
  date: string
  blocks: BlogBlock[]
  thumbnailUrl: string
  tags: string[]
  authorId: string
  authorName: string
  authorAvatarUrl: string
  createdAt: string
  updatedAt?: string
}

function formatDate(d: string) {
  if (!d) return ''
  const dt = new Date(`${d}T00:00:00`)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function snippetFor(post: BlogPost): string {
  const textBlock = post.blocks.find(b => (b.type === 'paragraph' || b.type === 'heading') && b.text.trim())
  return textBlock && 'text' in textBlock ? textBlock.text.slice(0, 160) : ''
}

function TagPill({ tag, active, onClick }: { tag: string; active: boolean; onClick?: () => void }) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '20px',
      fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-sans)',
      border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
      backgroundColor: active ? 'var(--color-gold-bg)' : 'var(--color-surface)',
      color: active ? 'var(--color-gold)' : 'var(--color-text-2)',
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
    }}>{tag}</span>
  )
}

// Compact card used to surface a new blog post inline in the main network
// feed (Feed.tsx) — full reading happens on the dedicated /blog/:id page,
// this is just a teaser that links there.
export function BlogPostFeedCard({ post }: { post: BlogPost }) {
  const viewBlogPost = useUIStore(s => s.viewBlogPost)
  const snippet = snippetFor(post)

  return (
    <div onClick={() => viewBlogPost(post.id)} style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px', marginBottom: '12px',
      border: '1px solid var(--color-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden', cursor: 'pointer', display: 'flex', gap: '14px', padding: '14px',
    }}>
      <div style={{
        width: '92px', height: '92px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
        background: post.thumbnailUrl ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
      }}>
        {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📝'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '5px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)' }}>
          <span style={{ fontSize: '11px' }}>📝</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)' }}>Blog Post</span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1.3, marginBottom: '4px' }}>{post.title}</div>
        {snippet && (
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{snippet}…</div>
        )}
        <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>
          By {post.authorName} · {formatDate(post.date)}
        </div>
      </div>
    </div>
  )
}

function BlogPostDetailView({ post, onBack, onChanged }: { post: BlogPost; onBack: () => void; onChanged: () => void }) {
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const openProfile = useOpenProfile()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canModify = currentUser?.id === post.authorId || role === 'admin' || role === 'superadmin'

  async function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api(`/blog-posts/${post.id}`, { method: 'DELETE' })
      onBack()
      onChanged()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 14px',
        fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
      }}>← Back to Blog</button>

      {post.thumbnailUrl && (
        <img src={post.thumbnailUrl} alt="" style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', borderRadius: '14px', marginBottom: '20px', display: 'block' }} />
      )}

      {post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {post.tags.map(t => <TagPill key={t} tag={t} active />)}
        </div>
      )}

      <h1 style={{ margin: '0 0 12px', fontSize: '26px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>{post.title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div onClick={() => openProfile(post.authorId)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          {post.authorAvatarUrl
            ? <img src={post.authorAvatarUrl} alt={post.authorName} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
            : <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(post.authorName || '?').slice(0, 2).toUpperCase()}</div>
          }
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-1)' }}>{post.authorName}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>{formatDate(post.date)}</div>
          </div>
        </div>
        {canModify && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditing(true)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-1)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>✏ Edit</button>
            <button onClick={handleDelete} disabled={deleting} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-red)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{deleting ? 'Deleting…' : '🗑 Delete'}</button>
          </div>
        )}
      </div>

      <BlogBlockRenderer blocks={post.blocks} />

      {editing && (
        <CreateBlogPostModal post={post} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged() }} />
      )}
    </div>
  )
}

export default function BlogView() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [authorFilter, setAuthorFilter] = useState('all')
  const viewingBlogPostId = useUIStore(s => s.viewingBlogPostId)
  const viewBlogPost = useUIStore(s => s.viewBlogPost)
  const closeBlogPostView = useUIStore(s => s.closeBlogPostView)

  async function load() {
    try {
      const data = await api<BlogPost[]>('/blog-posts')
      setPosts(data)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleTagFilter(tag: string) {
    setTagFilter(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const viewingPost = viewingBlogPostId ? posts.find(p => p.id === viewingBlogPostId) ?? null : null
  if (viewingBlogPostId) {
    if (loading) {
      return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading…</div>
    }
    if (!viewingPost) {
      return (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button onClick={closeBlogPostView} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 14px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
          }}>← Back</button>
          <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📝</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)' }}>Post not found</div>
          </div>
        </div>
      )
    }
    return <BlogPostDetailView post={viewingPost} onBack={closeBlogPostView} onChanged={load} />
  }

  const authors = Array.from(new Map(posts.map(p => [p.authorId, p.authorName])).entries())
  const filtered = posts.filter(p =>
    (tagFilter.length === 0 || p.tags.some(t => tagFilter.includes(t))) &&
    (authorFilter === 'all' || p.authorId === authorFilter)
  )

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-serif)' }}>Blog</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Articles, teaching, and reflections from across the network</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          backgroundColor: 'var(--color-navy)', color: '#fff',
          fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
        }}>+ Write a Post</button>
      </div>

      {showCreate && (
        <CreateBlogPostModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {BLOG_TAGS.map(tag => (
            <TagPill key={tag} tag={tag} active={tagFilter.includes(tag)} onClick={() => toggleTagFilter(tag)} />
          ))}
        </div>
        <select value={authorFilter} onChange={e => setAuthorFilter(e.target.value)} style={{
          padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-card)', color: 'var(--color-text-1)', fontSize: '13px',
          fontFamily: 'var(--font-sans)', cursor: 'pointer', marginLeft: 'auto',
        }}>
          <option value="all">All Authors</option>
          {authors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading posts…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '40px', marginBottom: '14px' }}>📝</div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>
            {posts.length === 0 ? 'No posts yet' : 'No posts match these filters'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
            {posts.length === 0 ? 'Be the first to publish an article.' : 'Try a different tag or author.'}
          </div>
        </div>
      )}

      <div className="grid-2-lg">
        {filtered.map(post => (
          <div key={post.id} onClick={() => viewBlogPost(post.id)} style={{
            backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)',
            overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              height: '160px', flexShrink: 0,
              background: post.thumbnailUrl ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
            }}>
              {post.thumbnailUrl ? <img src={post.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📝'}
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {post.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {post.tags.slice(0, 3).map(t => <TagPill key={t} tag={t} active={false} />)}
                </div>
              )}
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1.35 }}>{post.title}</div>
              {snippetFor(post) && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.5, flex: 1 }}>{snippetFor(post)}…</div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto', paddingTop: '6px' }}>
                {post.authorAvatarUrl
                  ? <img src={post.authorAvatarUrl} alt="" style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover' }} />
                  : <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '9px' }}>{(post.authorName || '?').slice(0, 2).toUpperCase()}</div>
                }
                <span style={{ fontSize: '12px', color: 'var(--color-text-2)', fontWeight: 600 }}>{post.authorName}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-3)', marginLeft: 'auto' }}>{formatDate(post.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
