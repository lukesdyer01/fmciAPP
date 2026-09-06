import { useState } from 'react'
import { useOpenProfile } from './ProfileView'
import type { FeedComment } from '../api-client/comments'

// Entity-agnostic comment thread — originally built inline in PostCard for
// feed-post comments, extracted so the same UI/behavior can be reused for
// event discussion threads without duplicating it.
export default function CommentThread({ comments, onSubmit, onDelete, submitting, currentUserId, isAdmin }: {
  comments: FeedComment[]
  onSubmit: (text: string) => void
  onDelete: (commentId: string) => void
  submitting: boolean
  currentUserId?: string
  isAdmin: boolean
}) {
  const [commentText, setCommentText] = useState('')
  const openProfile = useOpenProfile()

  function submit() {
    const text = commentText.trim()
    if (!text || submitting) return
    onSubmit(text)
    setCommentText('')
  }

  return (
    <div>
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          {comments.map(cm => {
            const canDeleteComment = !!currentUserId && (cm.authorId === currentUserId || isAdmin)
            return (
              <div key={cm.id} style={{ display: 'flex', gap: '8px' }}>
                {cm.authorAvatarUrl
                  ? <img onClick={() => openProfile(cm.authorId)} src={cm.authorAvatarUrl} alt="" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }} />
                  : <div onClick={() => openProfile(cm.authorId)} style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>{(cm.authorName || '?').slice(0, 2).toUpperCase()}</div>
                }
                <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '10px', padding: '8px 12px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span onClick={() => openProfile(cm.authorId)} style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-1)', cursor: 'pointer' }}>{cm.authorName}</span>
                    {canDeleteComment && (
                      <button onClick={() => onDelete(cm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '11px', padding: 0 }}>✕</button>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-1)', lineHeight: 1.5, marginTop: '2px', whiteSpace: 'pre-wrap' }}>{cm.text}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 14px', border: '1px solid var(--color-border)', gap: '8px' }}>
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Write a comment…"
            style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '14px', fontFamily: 'var(--font-sans)' }}
          />
          {commentText && (
            <button onClick={submit} disabled={submitting} style={{ background: 'none', border: 'none', cursor: submitting ? 'default' : 'pointer', color: 'var(--color-gold)', fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
              {submitting ? 'Posting…' : 'Post'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
