import { useRef, useState } from 'react'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'
import BlockEditor, { type BlogBlock } from './BlockEditor'
import type { BlogPost } from './BlogView'

export const BLOG_TAGS = ['Leadership', 'Prophetic', 'Creative', 'Marketplace', 'Newsletter', 'Missions', 'Discipleship', 'Testimony', 'Youth']

export default function CreateBlogPostModal({ post, onClose, onSaved }: {
  post?: BlogPost
  onClose: () => void
  onSaved: () => void
}) {
  const { currentUser } = useAuth()
  const [title, setTitle] = useState(post?.title ?? '')
  const [date, setDate] = useState(post?.date ?? new Date().toISOString().slice(0, 10))
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnailUrl ?? '')
  const [tags, setTags] = useState<string[]>(post?.tags ?? [])
  const [blocks, setBlocks] = useState<BlogBlock[]>(post?.blocks ?? [{ type: 'paragraph', text: '' }])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleThumbnail(file: File) {
    if (!currentUser) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/blog-thumb-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setThumbnailUrl(data.publicUrl)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!title.trim()) { setErr('Title is required.'); return }
    setSaving(true); setErr('')
    try {
      const payload = { title: title.trim(), date, blocks, thumbnailUrl, tags }
      if (post) {
        await api(`/blog-posts/${post.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await api('/blog-posts', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSaved()
    } catch (e: any) {
      setErr(e.message ?? `Failed to ${post ? 'update' : 'publish'} post.`)
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '14px',
    fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
    >
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, backgroundColor: 'var(--color-card)', zIndex: 1, borderRadius: '16px 16px 0 0' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>
            {post ? 'Edit Post' : 'Write a Post'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
              <div style={{
                width: 78, height: 56, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: thumbnailUrl ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>
                {thumbnailUrl ? <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📝'}
              </div>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.15s', fontSize: '15px',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
              >📷</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnail(f) }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{uploading ? 'Uploading…' : 'Thumbnail'}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Click to {thumbnailUrl ? 'change' : 'upload'} (optional)</div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Why Leadership Matters" style={inputStyle} autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {BLOG_TAGS.map(tag => {
                const active = tags.includes(tag)
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} style={{
                    padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    fontSize: '12px', fontWeight: 700,
                    border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    backgroundColor: active ? 'var(--color-gold-bg)' : 'var(--color-surface)',
                    color: active ? 'var(--color-gold)' : 'var(--color-text-2)',
                    transition: 'all 0.15s',
                  }}>{active ? '✓ ' : ''}{tag}</button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Body</label>
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>

          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)', position: 'sticky', bottom: 0, backgroundColor: 'var(--color-card)', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>
            {saving ? (post ? 'Saving…' : 'Publishing…') : post ? 'Save Changes' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
