import { useState } from 'react'
import Badge, { type BadgeVariant } from './Badge'
import VerifiedBadge from './VerifiedBadge'
import { useOpenProfile } from './ProfileView'
import { useEditPost, useDeletePost, useSetPrayerStatus } from '../api-client/posts'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import { useUIStore } from '../store/ui'

export interface Post {
  id: string
  authorId?: string
  author: string
  title: string
  church: string
  location: string
  avatar: string
  badges: BadgeVariant[]
  time: string
  type: 'post' | 'testimony' | 'prayer' | 'announcement' | 'resource'
  content: string
  image: string | null
  imageAlt: string | null
  videoId?: string
  reactions: { amen: number; pray: number; heart: number }
  comments: number
  shares: number
  scripture?: string
  pinned?: boolean
  orgId?: string
  orgName?: string
  orgImg?: string
  wallUserId?: string
  wallUserName?: string
  editedAt?: string
  prayerStatus?: 'unanswered' | 'answered'
  isAnonymous?: boolean
  testimonyCategory?: 'healing' | 'provision' | 'salvation' | 'deliverance' | 'other'
  taggedUsers?: { id: string; name: string }[]
}


const TYPE_STYLE: Record<Post['type'], { label: string; color: string; bg: string }> = {
  post:         { label: 'Post',         color: 'var(--color-text-2)', bg: 'var(--color-surface)' },
  testimony:    { label: 'Testimony',    color: '#047857',             bg: '#ECFDF5' },
  prayer:       { label: 'Prayer',       color: '#6D28D9',             bg: '#F5F3FF' },
  announcement: { label: 'Announcement', color: '#92700A',             bg: '#FBF5E6' },
  resource:     { label: 'Resource',     color: '#1D4ED8',             bg: '#EFF6FF' },
}

export const TESTIMONY_CATEGORY_STYLE: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  healing:     { label: 'Healing',     icon: '🩹', color: '#B91C1C', bg: '#FEF2F2' },
  provision:   { label: 'Provision',   icon: '🍞', color: '#92700A', bg: '#FBF5E6' },
  salvation:   { label: 'Salvation',   icon: '✝️', color: '#047857', bg: '#ECFDF5' },
  deliverance: { label: 'Deliverance', icon: '🕊️', color: '#6D28D9', bg: '#F5F3FF' },
  other:       { label: 'Other',       icon: '✨', color: '#1D4ED8', bg: '#EFF6FF' },
}

export default function PostCard({ post }: { post: Post }) {
  const [reactions, setReactions] = useState(post.reactions ?? { amen: 0, pray: 0, heart: 0 })
  const [active, setActive] = useState<'amen' | 'pray' | 'heart' | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.content ?? '')
  const openProfile = useOpenProfile()
  const viewHashtag = useUIStore(s => s.viewHashtag)
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const editPost = useEditPost()
  const deletePost = useDeletePost()
  const setPrayerStatus = useSetPrayerStatus()

  const isOwner = !!currentUser && (
    post.authorId ? post.authorId === currentUser.id : post.author === currentUser.displayName
  )
  const isAdmin = role === 'admin' || role === 'superadmin'
  const isWallOwner = !!currentUser && post.wallUserId === currentUser.id
  const canEdit = isOwner || isAdmin
  const canDelete = isOwner || isAdmin || isWallOwner
  const canModify = canEdit

  const handleReaction = (type: 'amen' | 'pray' | 'heart') => {
    setReactions(r => {
      const next = { ...r }
      if (active === type) { next[type]--; setActive(null) }
      else { if (active) next[active]--; next[type]++; setActive(type) }
      return next
    })
  }

  function startEdit() {
    setEditText(post.content ?? '')
    setEditing(true)
    setMenuOpen(false)
  }

  function saveEdit() {
    if (!editText.trim()) return
    editPost.mutate({ postId: post.id, content: editText.trim() }, {
      onSuccess: () => setEditing(false),
    })
  }

  function handleDelete() {
    setMenuOpen(false)
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    deletePost.mutate(post.id)
  }

  function togglePrayerStatus() {
    const next = post.prayerStatus === 'answered' ? 'unanswered' : 'answered'
    setPrayerStatus.mutate({ postId: post.id, status: next })
  }

  const ts = TYPE_STYLE[post.type] ?? TYPE_STYLE['post']
  const total = (reactions?.amen ?? 0) + (reactions?.pray ?? 0) + (reactions?.heart ?? 0)

  return (
    <div style={{
      backgroundColor: 'var(--color-card)',
      borderRadius: '12px', marginBottom: '12px',
      border: `1px solid ${post.pinned ? 'var(--color-gold-border)' : 'var(--color-border)'}`,
      boxShadow: post.pinned ? '0 2px 12px rgba(200,155,60,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Pinned banner */}
      {post.pinned && (
        <div style={{
          padding: '6px 16px', fontSize: '12px', fontWeight: 700,
          backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)',
          borderBottom: '1px solid var(--color-gold-border)',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          ★ FMCI Official Announcement
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {post.isAnonymous
          ? <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, backgroundColor: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🙏</div>
          : post.orgName
          ? (post.orgImg
              ? <img src={post.orgImg} alt={post.orgName} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
              : <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏛</div>)
          : post.avatar
          ? <img src={post.avatar} alt={post.author} onClick={() => post.authorId && openProfile(post.authorId)} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', display: 'block', flexShrink: 0, cursor: post.authorId ? 'pointer' : 'default' }} />
          : <div onClick={() => post.authorId && openProfile(post.authorId)} style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, cursor: post.authorId ? 'pointer' : 'default', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' }}>{(post.author || '?').slice(0, 2).toUpperCase()}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <div onClick={() => !post.isAnonymous && !post.orgName && post.authorId && openProfile(post.authorId)} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, fontSize: '15px', color: 'var(--color-text-1)', cursor: !post.isAnonymous && !post.orgName && post.authorId ? 'pointer' : 'default', marginBottom: '3px' }}>
                {post.isAnonymous ? 'Anonymous' : post.orgName ?? post.author}
                {!post.isAnonymous && !post.orgName && (post.badges ?? []).includes('verified') && <VerifiedBadge size={14} />}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                {(post.badges ?? []).filter(b => b !== 'verified').map((b, i) => <Badge key={i} variant={b} />)}
              </div>
              {!post.isAnonymous && !post.orgName && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>
                  {post.title} · {post.church} · {post.location}
                </div>
              )}
              {post.orgName && (
                <div
                  onClick={() => post.authorId && openProfile(post.authorId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '3px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)', cursor: post.authorId ? 'pointer' : 'default' }}
                >
                  <span style={{ fontSize: '11px' }}>🏛</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)' }}>Official post · by {post.author}</span>
                </div>
              )}
              {post.wallUserId && post.wallUserId !== post.authorId && post.wallUserName && (
                <div
                  onClick={() => openProfile(post.wallUserId!)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '3px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '11px' }}>📝</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-2)' }}>Wrote on {post.wallUserName}'s page</span>
                </div>
              )}
              {(post.taggedUsers ?? []).length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '3px' }}>
                  with{' '}
                  {(post.taggedUsers ?? []).map((t, i, arr) => (
                    <span key={t.id}>
                      <span onClick={() => openProfile(t.id)} style={{ fontWeight: 700, color: 'var(--color-text-2)', cursor: 'pointer' }}>{t.name}</span>
                      {i < arr.length - 1 && (i === arr.length - 2 ? ' and ' : ', ')}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '2px' }}>{post.time}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {post.type !== 'post' && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                  borderRadius: '20px', backgroundColor: ts.bg, color: ts.color,
                  border: `1px solid ${ts.color}22`,
                }}>{ts.label}</span>
              )}
              {post.type === 'testimony' && post.testimonyCategory && (
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                  backgroundColor: TESTIMONY_CATEGORY_STYLE[post.testimonyCategory].bg,
                  color: TESTIMONY_CATEGORY_STYLE[post.testimonyCategory].color,
                  border: `1px solid ${TESTIMONY_CATEGORY_STYLE[post.testimonyCategory].color}22`,
                }}>{TESTIMONY_CATEGORY_STYLE[post.testimonyCategory].icon} {TESTIMONY_CATEGORY_STYLE[post.testimonyCategory].label}</span>
              )}
              {post.type === 'prayer' && (
                canModify ? (
                  <button
                    onClick={togglePrayerStatus}
                    disabled={setPrayerStatus.isPending}
                    title={post.prayerStatus === 'answered' ? 'Mark as unanswered' : 'Mark as answered'}
                    style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      border: `1px solid ${post.prayerStatus === 'answered' ? '#05966922' : '#f59e0b22'}`,
                      backgroundColor: post.prayerStatus === 'answered' ? '#ECFDF5' : '#FFFBEB',
                      color: post.prayerStatus === 'answered' ? '#047857' : '#b45309',
                      cursor: setPrayerStatus.isPending ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
                      opacity: setPrayerStatus.isPending ? 0.6 : 1,
                    }}
                  >{post.prayerStatus === 'answered' ? '✓ Answered' : '○ Unanswered'}</button>
                ) : (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                    border: `1px solid ${post.prayerStatus === 'answered' ? '#05966922' : '#f59e0b22'}`,
                    backgroundColor: post.prayerStatus === 'answered' ? '#ECFDF5' : '#FFFBEB',
                    color: post.prayerStatus === 'answered' ? '#047857' : '#b45309',
                  }}>{post.prayerStatus === 'answered' ? '✓ Answered' : '○ Unanswered'}</span>
                )
              )}
              {(canEdit || canDelete) && (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuOpen(o => !o)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                    color: 'var(--color-text-3)', fontSize: '16px', lineHeight: 1, borderRadius: '6px',
                  }}>⋯</button>
                  {menuOpen && (
                    <>
                      <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                      <div style={{
                        position: 'absolute', top: '26px', right: 0, zIndex: 10,
                        backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)',
                        borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
                        minWidth: '120px',
                      }}>
                        {canEdit && (
                          <button onClick={startEdit} style={{
                            display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)',
                            textAlign: 'left', fontFamily: 'var(--font-sans)',
                          }}>✏️ Edit</button>
                        )}
                        {canDelete && (
                        <button onClick={handleDelete} disabled={deletePost.isPending} style={{
                          display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
                          cursor: deletePost.isPending ? 'default' : 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-red)',
                          textAlign: 'left', fontFamily: 'var(--font-sans)', opacity: deletePost.isPending ? 0.5 : 1,
                        }}>{deletePost.isPending ? 'Deleting…' : '🗑 Delete'}</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scripture */}
      {post.scripture && (
        <div style={{ padding: '12px 16px 0' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
            backgroundColor: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)',
            color: 'var(--color-gold)', cursor: 'pointer',
          }}>📖 {post.scripture}</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '12px 16px' }}>
        {editing ? (
          <div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={4}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical',
                border: '1px solid var(--color-border)', borderRadius: '8px',
                fontSize: '15px', fontFamily: 'var(--font-sans)', lineHeight: 1.6,
                color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)', outline: 'none',
              }}
            />
            {editPost.isError && (
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-red)' }}>
                {(editPost.error as any)?.message ?? 'Failed to save changes.'}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setEditing(false)} style={{
                padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--color-border)',
                background: 'none', color: 'var(--color-text-2)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>Cancel</button>
              <button onClick={saveEdit} disabled={!editText.trim() || editPost.isPending} style={{
                padding: '7px 18px', borderRadius: '8px', border: 'none',
                backgroundColor: editText.trim() ? 'var(--color-navy)' : 'var(--color-border)',
                color: editText.trim() ? '#fff' : 'var(--color-text-3)',
                fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                cursor: editText.trim() && !editPost.isPending ? 'pointer' : 'default',
              }}>{editPost.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        ) : (
          <>
            {(post.content ?? '').split('\n').map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? '0 0 8px' : '8px 0 0', fontSize: '15px', lineHeight: 1.7, color: 'var(--color-text-1)' }}>
                {line.split(/(#[\p{L}\d_]+)/gu).map((part, j) =>
                  part.startsWith('#') && part.length > 1
                    ? <span key={j} onClick={() => viewHashtag(part.slice(1).toLowerCase())} style={{ color: 'var(--color-gold)', fontWeight: 700, cursor: 'pointer' }}>{part}</span>
                    : <span key={j}>{part}</span>
                )}
              </p>
            ))}
            {post.editedAt && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-3)', marginTop: '4px' }}>(edited)</div>
            )}
          </>
        )}
      </div>

      {/* Image */}
      {post.image && (
        <div style={{ overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
          <img src={post.image} alt={post.imageAlt ?? ''} style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'cover' }} />
        </div>
      )}

      {post.videoId && (
        <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${post.videoId}`}
            title="YouTube video"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Reaction summary */}
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-2)' }}>
          {total > 0 && <><span>🙏❤️✝️</span><span>{(total ?? 0).toLocaleString()} reactions</span></>}
        </div>
        <button onClick={() => setShowComments(!showComments)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)', padding: '0' }}>
          {post.comments} comments
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--color-border)' }}>
        {([
          { type: 'amen' as const, icon: '✝️', label: 'Amen' },
          { type: 'pray' as const, icon: '🙏', label: 'Praying' },
          { type: 'heart' as const, icon: '❤️', label: 'Bless' },
        ]).map(a => (
          <button key={a.type} onClick={() => handleReaction(a.type)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 4px', border: 'none', cursor: 'pointer',
            backgroundColor: active === a.type ? 'var(--color-gold-bg)' : 'transparent',
            color: active === a.type ? 'var(--color-gold)' : 'var(--color-text-2)',
            fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: active === a.type ? 700 : 500,
            transition: 'all 0.15s', borderRight: '1px solid var(--color-border)',
          }}
            onMouseEnter={e => { if (active !== a.type) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
            onMouseLeave={e => { if (active !== a.type) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
          >
            <span style={{ fontSize: '16px' }}>{a.icon}</span> {a.label}
          </button>
        ))}
        <button onClick={() => setShowComments(!showComments)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '10px 4px', border: 'none', cursor: 'pointer',
          backgroundColor: 'transparent', color: 'var(--color-text-2)',
          fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 500, transition: 'background 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
        >
          <span style={{ fontSize: '16px' }}>💬</span> Comment
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 14px', border: '1px solid var(--color-border)', gap: '8px' }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment…" style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', fontFamily: 'var(--font-sans)' }} />
              {commentText && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold)', fontWeight: 700, fontSize: '13px' }}>Post</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
