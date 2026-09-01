import { useState, useRef } from 'react'
import { useUIStore, type UserProfile } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { supabase } from '../lib/supabase'

const MINISTRY_ROLES = ['Pastor', 'Teacher', 'Evangelist', 'Apostle', 'Prophet']

function Field({ label, value, onChange, multiline = false, placeholder = '' }: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const base: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text-1)',
    backgroundColor: 'var(--color-surface)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={3} style={{ ...base, resize: 'vertical', lineHeight: 1.6 }}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-navy)' }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'var(--color-border)' }}
          />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={base}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-navy)' }}
            onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)' }}
          />
      }
    </div>
  )
}

export default function EditProfileModal() {
  const userProfile = useUIStore(s => s.userProfile)
  const updateUserProfile = useUIStore(s => s.updateUserProfile)
  const setEditProfileOpen = useUIStore(s => s.setEditProfileOpen)
  const { currentUser, updateCurrentUser } = useAuth()

  const [draft, setDraft] = useState<UserProfile>({ ...userProfile })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [uploading, setUploading] = useState<'avatarUrl' | null>(null)
  const [uploadError, setUploadError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function toggleRole(role: string) {
    setDraft(d => ({
      ...d,
      ministryRoles: d.ministryRoles.includes(role) ? d.ministryRoles.filter(r => r !== role) : [...d.ministryRoles, role],
    }))
  }

  async function handleImageFile(key: 'avatarUrl', file: File) {
    if (!currentUser) return
    setUploading(key)
    setUploadError('')
    try {
      // Uploaded to Supabase Storage rather than kept as a base64 data URI — a data
      // URI here would get saved into the user's own auth metadata, which is
      // embedded in every JWT they're issued; a multi-hundred-KB image blows the
      // token past what Cloudflare/most proxies allow in a request header,
      // breaking every authenticated call the user makes (posting included).
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      set(key, data.publicUrl)
    } catch (e: any) {
      setUploadError(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    setStatus('saving')
    try {
      // Profile fields live on the user's own Supabase Auth record — this is the
      // only per-user store for them, unlike the old shared/global profile endpoint.
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: draft.name,
          avatar_url: draft.avatarUrl,
          bio: draft.bio,
          title: draft.title,
          church: draft.church,
          location: draft.location,
          website: draft.website,
          phone: draft.phone,
          ministryRoles: draft.ministryRoles,
        },
      })
      if (error) throw error
      updateUserProfile(draft)
      updateCurrentUser({
        displayName: draft.name,
        avatarUrl: draft.avatarUrl,
        bio: draft.bio,
        title: draft.title,
        church: draft.church,
        location: draft.location,
        website: draft.website,
        email: draft.email,
        phone: draft.phone,
        ministryRoles: draft.ministryRoles,
      })
      setStatus('saved')
      setTimeout(() => {
        setStatus('idle')
        setEditProfileOpen(false)
      }, 900)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }} onClick={e => { if (e.target === e.currentTarget) setEditProfileOpen(false) }}>
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        width: '100%', maxWidth: '560px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky', top: 0, backgroundColor: 'var(--color-card)', zIndex: 1,
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Edit Profile</div>
          <button onClick={() => setEditProfileOpen(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px',
          }}>✕</button>
        </div>

        <div style={{ padding: '0 0 24px' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px 0', marginBottom: '4px' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: '72px', height: '72px', borderRadius: '16px', flexShrink: 0,
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {draft.avatarUrl
                ? <img src={draft.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '22px' }}>📷</div>
              }
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.2s', borderRadius: '16px',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
              >
                <span style={{ color: '#fff', fontSize: uploading === 'avatarUrl' ? '11px' : '18px', fontWeight: 700, textAlign: 'center' }}>
                  {uploading === 'avatarUrl' ? 'Uploading…' : '📷'}
                </span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile('avatarUrl', f) }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', marginBottom: '6px' }}>Profile Photo</div>
              <input
                value={draft.avatarUrl.startsWith('data:') ? '' : draft.avatarUrl}
                onChange={e => set('avatarUrl', e.target.value)}
                placeholder="Or paste photo URL…"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                  fontSize: '12px', fontFamily: 'var(--font-sans)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)', outline: 'none',
                }}
              />
            </div>
          </div>

          {uploadError && (
            <div style={{ margin: '0 24px 16px', padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', fontSize: '13px', color: 'var(--color-red)' }}>
              {uploadError}
            </div>
          )}

          {/* Form fields */}
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2">
              <Field label="Full Name" value={draft.name} onChange={v => set('name', v)} />
              <Field label="Title / Role" value={draft.title} onChange={v => set('title', v)} placeholder="e.g. Senior Pastor" />
            </div>
            <div className="grid-2">
              <Field label="Church / Organization" value={draft.church} onChange={v => set('church', v)} />
              <Field label="Location" value={draft.location} onChange={v => set('location', v)} placeholder="City, State" />
            </div>
            <Field label="Bio" value={draft.bio} onChange={v => set('bio', v)} multiline placeholder="Tell the network about yourself…" />
            <div className="grid-2">
              <Field label="Website" value={draft.website} onChange={v => set('website', v)} placeholder="yoursite.org" />
              <Field label="Email" value={draft.email} onChange={v => set('email', v)} />
            </div>
            <Field label="Phone" value={draft.phone} onChange={v => set('phone', v)} placeholder="(555) 555-5555" />
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-2)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ministry Role <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(select all that apply)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {MINISTRY_ROLES.map(role => {
                  const active = draft.ministryRoles.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        fontSize: '13px', fontWeight: 700,
                        border: `1.5px solid ${active ? 'var(--color-navy)' : 'var(--color-border)'}`,
                        backgroundColor: active ? 'var(--color-navy)' : 'var(--color-surface)',
                        color: active ? '#fff' : 'var(--color-text-2)',
                        transition: 'all 0.15s',
                      }}
                    >{active ? '✓ ' : ''}{role}</button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', gap: '10px', padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          position: 'sticky', bottom: 0, backgroundColor: 'var(--color-card)',
          borderRadius: '0 0 16px 16px',
        }}>
          <button onClick={() => setEditProfileOpen(false)} style={{
            flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer',
            border: '1px solid var(--color-border)', backgroundColor: 'transparent',
            color: 'var(--color-text-2)', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-sans)',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={status === 'saving' || uploading !== null} style={{
            flex: 2, padding: '10px', borderRadius: '8px', cursor: status === 'saving' ? 'default' : 'pointer', border: 'none',
            background: status === 'saved'
              ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
            color: '#fff', fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-sans)',
            transition: 'background 0.3s',
          }}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
