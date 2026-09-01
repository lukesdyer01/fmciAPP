import { useState, useRef } from 'react'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'
import { useUIStore } from '../store/ui'
import type { Resource } from './ResourcesView'

const RESOURCE_TYPES = ['Book', 'Course', 'Video', 'Article']
const CATEGORIES = ['Apostolic Teaching', 'Leadership', 'Prayer', 'Missions', 'Marketplace', 'Discipleship']

export default function CreateResourceModal({ resource, onClose, onSaved }: {
  resource?: Resource
  onClose: () => void
  onSaved: () => void
}) {
  const { currentUser } = useAuth()
  const userProfile = useUIStore(s => s.userProfile)
  const [title, setTitle] = useState(resource?.title ?? '')
  const [author, setAuthor] = useState(resource?.author ?? '')
  const [type, setType] = useState(resource?.type ?? RESOURCE_TYPES[0])
  const [category, setCategory] = useState(resource?.category ?? CATEGORIES[0])
  const [description, setDescription] = useState(resource?.description ?? '')
  const [tags, setTags] = useState((resource?.tags ?? []).join(', '))
  const [url, setUrl] = useState(resource?.url ?? '')
  const [img, setImg] = useState(resource?.img ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/resource-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setImg(data.publicUrl)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!title.trim()) { setErr('Title is required.'); return }
    setSaving(true); setErr('')
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
    try {
      if (resource) {
        await api(`/resources/${resource.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: title.trim(), author, type, category, description, tags: tagList, img, url }),
        })
      } else {
        await api('/resources', {
          method: 'POST',
          body: JSON.stringify({ title: title.trim(), author, type, category, description, tags: tagList, img, url, submittedByName: userProfile.name }),
        })
      }
      onSaved()
    } catch (e: any) {
      setErr(e.message ?? `Failed to ${resource ? 'update' : 'add'} resource.`)
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
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '16px', border: '1px solid var(--color-border)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>
            {resource ? 'Edit Resource' : 'Add Resource'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
              <div style={{
                width: 56, height: 78, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: img ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
              }}>
                {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📚'}
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
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{uploading ? 'Uploading…' : 'Cover Image'}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Click to {img ? 'change' : 'upload'} (optional)</div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Cost of Discipleship" style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Author</label>
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Dietrich Bonhoeffer" style={inputStyle} />
          </div>
          <div className="grid-2">
            <div>
              <label style={labelStyle}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this resource about?" rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
          </div>
          <div>
            <label style={labelStyle}>Tags</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="prayer, leadership, missions (comma separated)" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Link URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
          </div>
          {err && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>{err}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || uploading} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>
            {saving ? (resource ? 'Saving…' : 'Adding…') : resource ? 'Save Changes' : 'Add Resource'}
          </button>
        </div>
      </div>
    </div>
  )
}
