import { useState, useRef } from 'react'
import { useUIStore, type UserProfile } from '../store/ui'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../api-client/server'

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
  const { updateCurrentUser } = useAuth()

  const [draft, setDraft] = useState<UserProfile>({ ...userProfile })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function handleImageFile(key: 'avatarUrl' | 'coverUrl', file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      if (e.target?.result) set(key, e.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    setStatus('saving')
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify(draft) })
      updateUserProfile(draft)
      updateCurrentUser({ displayName: draft.name, avatarUrl: draft.avatarUrl, bio: draft.bio, email: draft.email })
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
          {/* Cover photo */}
          <div style={{ position: 'relative', marginBottom: '48px' }}>
            <div
              onClick={() => coverInputRef.current?.click()}
              style={{
                height: '120px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                background: draft.coverUrl
                  ? `url(${draft.coverUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.35)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
              >
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.45)', padding: '6px 14px', borderRadius: '20px' }}>
                  📷 Change Cover
                </span>
              </div>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile('coverUrl', f) }} />

            {/* Avatar overlapping cover */}
            <div style={{ position: 'absolute', bottom: '-36px', left: '24px' }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: '72px', height: '72px', borderRadius: '16px',
                  border: '3px solid var(--color-card)',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                {draft.avatarUrl
                  ? <img src={draft.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '22px' }}>📷</div>
                }
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.2s', borderRadius: '13px',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.45)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
                >
                  <span style={{ color: '#fff', fontSize: '18px' }}>📷</span>
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile('avatarUrl', f) }} />
            </div>

            <div style={{ position: 'absolute', bottom: '-28px', left: '108px', right: '24px' }}>
              <input
                value={draft.avatarUrl.startsWith('data:') ? '' : draft.avatarUrl}
                onChange={e => set('avatarUrl', e.target.value)}
                placeholder="Or paste photo URL…"
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                  fontSize: '12px', fontFamily: 'var(--font-sans)',
                  border: '1px solid var(--color-border)', borderRadius: '6px',
                  backgroundColor: 'var(--color-surface)', color: 'var(--color-text-2)', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Form fields */}
          <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Full Name" value={draft.name} onChange={v => set('name', v)} />
              <Field label="Title / Role" value={draft.title} onChange={v => set('title', v)} placeholder="e.g. Senior Pastor" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Church / Organization" value={draft.church} onChange={v => set('church', v)} />
              <Field label="Location" value={draft.location} onChange={v => set('location', v)} placeholder="City, State" />
            </div>
            <Field label="Bio" value={draft.bio} onChange={v => set('bio', v)} multiline placeholder="Tell the network about yourself…" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Website" value={draft.website} onChange={v => set('website', v)} placeholder="yoursite.org" />
              <Field label="Email" value={draft.email} onChange={v => set('email', v)} />
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
          <button onClick={handleSave} disabled={status === 'saving'} style={{
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
