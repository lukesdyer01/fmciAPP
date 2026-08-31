import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { useSupabaseRole } from '../../../contexts/SupabaseRoleContext'

type MemberStatus = 'active' | 'suspended' | 'pending'
type PlatformRole = 'superadmin' | 'admin' | 'member'

interface Member {
  id: string
  name: string
  email: string
  avatarUrl: string
  title: string
  church: string
  location: string
  role: PlatformRole
  status: MemberStatus
  verified: boolean
  createdAt: string
  lastSignIn: string
  confirmed: boolean
}

const PLATFORM_ROLE_META: Record<PlatformRole, { label: string; bg: string; color: string }> = {
  superadmin: { label: 'Super Admin', bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  admin:      { label: 'Admin',       bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  member:     { label: 'Member',      bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' },
}

const STATUS_COLORS: Record<MemberStatus, { bg: string; color: string; label: string }> = {
  active:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'Active' },
  pending:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Pending' },
  suspended: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', label: 'Suspended' },
}

function initials(name: string, email: string) {
  const n = name || email || '?'
  return n.slice(0, 2).toUpperCase()
}

function relativeTime(dateStr: string) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

// ── Create User Modal ─────────────────────────────────────────────────────────

interface CreateUserForm {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  role: PlatformRole
  title: string
  church: string
  location: string
}

const EMPTY_FORM: CreateUserForm = {
  fullName: '', email: '', password: '', confirmPassword: '',
  role: 'member', title: '', church: '', location: '',
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateUserForm>(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  function set<K extends keyof CreateUserForm>(key: K, value: CreateUserForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function validate(): string | null {
    if (!form.fullName.trim()) return 'Full name is required.'
    if (!form.email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setErrorMsg(err); setStatus('error'); return }
    setStatus('saving'); setErrorMsg('')
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            title: form.title.trim(),
            church: form.church.trim(),
            location: form.location.trim(),
          },
        },
      })
      if (signUpErr) throw new Error(signUpErr.message)
      if (form.role !== 'member' && signUpData.user) {
        const { error: roleErr } = await supabase.rpc('admin_set_role', { target_user_id: signUpData.user.id, new_role: form.role })
        if (roleErr) throw new Error(roleErr.message)
      }
      setStatus('success')
      setTimeout(() => { onCreated(); onClose() }, 900)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to create user.')
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px',
    backgroundColor: '#0d1117',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '13px',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase', letterSpacing: '0.6px',
    marginBottom: '6px',
  }

  const ROLE_OPTIONS: { value: PlatformRole; label: string; desc: string; color: string }[] = [
    { value: 'member',     label: 'Member',     desc: 'Standard network access',          color: 'rgba(255,255,255,0.4)' },
    { value: 'admin',      label: 'Admin',      desc: 'Manage members & content',         color: '#60a5fa' },
    { value: 'superadmin', label: 'Super Admin', desc: 'Full platform control',           color: '#f87171' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: '#161b22', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, backgroundColor: '#161b22', borderRadius: '16px 16px 0 0', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3' }}>Create New User</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Add a new member to the platform</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '20px', lineHeight: 1, padding: '4px', borderRadius: '6px', transition: 'color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Identity */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '1px', backgroundColor: 'var(--color-gold)', opacity: 0.5 }} />
              Identity
            </div>
            <div className="grid-2">
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Full Name *</label>
                <input ref={firstRef} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Pastor James Wilson" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@church.org" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '1px', backgroundColor: 'var(--color-gold)', opacity: 0.5 }} />
              Credentials
            </div>
            <div className="grid-2">
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Password *</label>
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: '40px' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
                <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: 'absolute', right: '10px', bottom: '9px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: 0, lineHeight: 1 }}>
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <div>
                <label style={labelStyle}>Confirm Password *</label>
                <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repeat password" style={{ ...inputStyle, borderColor: form.confirmPassword && form.confirmPassword !== form.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = form.confirmPassword !== form.password ? 'rgba(239,68,68,0.5)' : 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = form.confirmPassword && form.confirmPassword !== form.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
            {form.password && (
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                {[
                  form.password.length >= 8,
                  /[A-Z]/.test(form.password),
                  /[0-9]/.test(form.password),
                  /[^A-Za-z0-9]/.test(form.password),
                ].map((met, i) => (
                  <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', backgroundColor: met ? '#22c55e' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s' }} />
                ))}
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', alignSelf: 'center', marginLeft: '6px' }}>
                  {[form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length}/4
                </span>
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '1px', backgroundColor: 'var(--color-gold)', opacity: 0.5 }} />
              Platform Role
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ROLE_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${form.role === opt.value ? opt.color + '40' : 'rgba(255,255,255,0.07)'}`, backgroundColor: form.role === opt.value ? opt.color + '10' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input type="radio" name="role" value={opt.value} checked={form.role === opt.value} onChange={() => set('role', opt.value)} style={{ accentColor: opt.color, width: '15px', height: '15px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: form.role === opt.value ? opt.color : '#e6edf3' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Profile details */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '1px', backgroundColor: 'var(--color-gold)', opacity: 0.5 }} />
              Profile Details <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </div>
            <div className="grid-2">
              <div>
                <label style={labelStyle}>Title / Role</label>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Pastor" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Church / Organization</label>
                <input value={form.church} onChange={e => set('church', e.target.value)} placeholder="Grace Community Church" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>

          {/* Error */}
          {status === 'error' && errorMsg && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>
              {errorMsg}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'sticky', bottom: 0, backgroundColor: '#161b22', borderRadius: '0 0 16px 16px' }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === 'saving' || status === 'success'}
            onClick={handleSubmit}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px', border: 'none', cursor: status === 'saving' || status === 'success' ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
              background: status === 'success'
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              color: '#fff', fontSize: '13px', fontWeight: 800, transition: 'all 0.2s',
              opacity: status === 'saving' ? 0.7 : 1,
            }}>
            {status === 'saving' ? 'Creating user…' : status === 'success' ? '✓ User created!' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Member Modal ─────────────────────────────────────────────────────────

interface EditMemberDraft {
  name: string
  email: string
  title: string
  church: string
  location: string
  avatarUrl: string
  role: PlatformRole
  status: MemberStatus
  verified: boolean
}

function EditMemberModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: (updated: Member) => void }) {
  const { userId: adminId } = useSupabaseRole()
  const [draft, setDraft] = useState<EditMemberDraft>({
    name: member.name,
    email: member.email,
    title: member.title,
    church: member.church,
    location: member.location,
    avatarUrl: member.avatarUrl ?? '',
    role: member.role,
    status: member.status,
    verified: member.verified,
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof EditMemberDraft>(key: K, value: EditMemberDraft[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  async function handleImageFile(file: File) {
    setUploading(true)
    setErrorMsg('')
    try {
      // Uploaded to Storage, not kept as base64 — a base64 image saved into a
      // user's auth metadata gets embedded in every JWT they're issued, which
      // is large enough to break authenticated requests (see avatar_url on
      // EditProfileModal for the full story).
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      // Stored under the admin's own folder (Storage RLS scopes uploads to the
      // uploader's own auth.uid(), not the member being edited).
      const path = `${adminId}/member-${member.id}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      set('avatarUrl', data.publicUrl)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to upload image.')
      setStatus('error')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!draft.name.trim()) { setErrorMsg('Full name is required.'); setStatus('error'); return }
    if (!draft.email.trim()) { setErrorMsg('Email is required.'); setStatus('error'); return }
    setStatus('saving'); setErrorMsg('')
    try {
      const { error: saveErr } = await supabase.rpc('admin_update_member', {
        target_user_id: member.id,
        updates: {
          name: draft.name.trim(),
          email: draft.email.trim(),
          title: draft.title.trim(),
          church: draft.church.trim(),
          location: draft.location.trim(),
          avatar_url: draft.avatarUrl,
          role: draft.role,
          status: draft.status,
          verified: draft.verified,
        },
      })
      if (saveErr) throw new Error(saveErr.message)
      setStatus('saved')
      onSaved({ ...member, ...draft, avatarUrl: draft.avatarUrl })
      setTimeout(onClose, 800)
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to save.')
      setStatus('error')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', color: '#e6edf3', fontSize: '13px',
    fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.15s',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700,
    color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
    letterSpacing: '0.6px', marginBottom: '6px',
  }
  const sectionLabel = (text: string) => (
    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ display: 'inline-block', width: '16px', height: '1px', backgroundColor: 'var(--color-gold)', opacity: 0.5 }} />
      {text}
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: '#161b22', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, backgroundColor: '#161b22', borderRadius: '16px 16px 0 0', zIndex: 1 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {draft.avatarUrl ? (
              <img src={draft.avatarUrl} alt={draft.name} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: 'var(--color-gold)' }}>
                {initials(member.name, member.email)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Edit {member.name || member.email}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{member.email}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '20px', lineHeight: 1, padding: '4px', borderRadius: '6px', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}>✕</button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Avatar */}
          <div>
            {sectionLabel('Photo')}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                onClick={() => avatarRef.current?.click()}
                style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, position: 'relative', border: '2px solid rgba(255,255,255,0.08)' }}
              >
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: 'var(--color-gold)' }}>
                    {initials(member.name, member.email)}
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.5)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}>
                  <span style={{ opacity: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.opacity = '1' }}>📷</span>
                </div>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
              <div style={{ flex: 1 }}>
                <input
                  value={draft.avatarUrl.startsWith('data:') ? '' : draft.avatarUrl}
                  onChange={e => set('avatarUrl', e.target.value)}
                  placeholder={uploading ? 'Uploading…' : 'Paste photo URL…'}
                  disabled={uploading}
                  style={{ ...inputStyle }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '5px' }}>Or click the avatar to upload a file</div>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div>
            {sectionLabel('Identity')}
            <div className="grid-2">
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Full Name *</label>
                <input value={draft.name} onChange={e => set('name', e.target.value)} placeholder="Full name" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="email@example.org" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label style={labelStyle}>Title / Role</label>
                <input value={draft.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Pastor" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={draft.location} onChange={e => set('location', e.target.value)} placeholder="City, State" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Church / Organization</label>
                <input value={draft.church} onChange={e => set('church', e.target.value)} placeholder="Grace Community Church" style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(200,155,60,0.5)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          </div>

          {/* Account */}
          <div>
            {sectionLabel('Account')}
            <div className="grid-2">
              <div>
                <label style={labelStyle}>Platform Role</label>
                <select value={draft.role} onChange={e => set('role', e.target.value as PlatformRole)}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' }}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={draft.status} onChange={e => set('status', e.target.value as MemberStatus)}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px' }}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <input type="checkbox" checked={draft.verified} onChange={e => set('verified', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>Verified member</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Shows a green checkmark on their profile</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {status === 'error' && errorMsg && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'sticky', bottom: 0, backgroundColor: '#161b22', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={status === 'saving' || status === 'saved' || uploading}
            style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, cursor: status === 'idle' || status === 'error' ? 'pointer' : 'default', transition: 'all 0.2s',
              background: status === 'saved' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              color: '#fff', opacity: status === 'saving' ? 0.7 : 1 }}>
            {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({ member, onClose, onDeleted }: { member: Member; onClose: () => void; onDeleted: () => void }) {
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmed, setConfirmed] = useState('')

  const nameMatch = confirmed.trim().toLowerCase() === (member.name || member.email).toLowerCase()

  async function handleDelete() {
    setStatus('deleting')
    try {
      const { error: delErr } = await supabase.rpc('admin_delete_user', { target_user_id: member.id })
      if (delErr) throw new Error(delErr.message)
      onDeleted()
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to delete user.')
      setStatus('error')
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: '#161b22', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)', width: '100%', maxWidth: '420px', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.1)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '14px' }}>
            🗑
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3', marginBottom: '6px' }}>Delete User</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            This will permanently delete <strong style={{ color: '#e6edf3' }}>{member.name || member.email}</strong> and all their data. This action cannot be undone.
          </div>
        </div>

        {/* User card */}
        <div style={{ margin: '16px 24px', padding: '12px 14px', backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--color-gold)', flexShrink: 0 }}>
              {initials(member.name, member.email)}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name || '(no name)'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{member.email}</div>
          </div>
        </div>

        {/* Confirmation input */}
        <div style={{ padding: '0 24px 20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', lineHeight: 1.5 }}>
            Type <strong style={{ color: '#e6edf3', fontFamily: 'monospace' }}>{member.name || member.email}</strong> to confirm
          </label>
          <input
            autoFocus
            value={confirmed}
            onChange={e => setConfirmed(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && nameMatch && status === 'idle') handleDelete() }}
            placeholder={member.name || member.email}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', backgroundColor: '#0d1117', border: `1px solid ${nameMatch ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', transition: 'border-color 0.15s' }}
          />

          {status === 'error' && (
            <div style={{ marginTop: '10px', padding: '9px 12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '12px', color: '#fca5a5' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 0 14px 14px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!nameMatch || status === 'deleting'}
            style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 800, cursor: nameMatch && status === 'idle' ? 'pointer' : 'default', transition: 'all 0.2s', backgroundColor: nameMatch ? '#dc2626' : 'rgba(239,68,68,0.15)', color: nameMatch ? '#fff' : 'rgba(239,68,68,0.4)', opacity: status === 'deleting' ? 0.7 : 1 }}>
            {status === 'deleting' ? 'Deleting…' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inline bootstrap-aware error for community tab ───────────────────────────

function CommunityMembersError({ error, onRetry }: { error: string; onRetry: () => void }) {
  const isNotDeployed = error.includes('42883') || error.toLowerCase().includes('does not exist')
  const isForbidden = error.includes('Forbidden') || error.includes('403') || error.includes('permission denied')
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapMsg, setBootstrapMsg] = useState('')
  const { refreshRole } = useSupabaseRole()

  async function handleBootstrap() {
    setBootstrapping(true); setBootstrapMsg('')
    try {
      const { data, error } = await supabase.rpc('admin_bootstrap')
      if (error) throw new Error(error.message)
      const msg = (data as any)?.message ?? 'Done! Sign out and back in.'
      setBootstrapMsg(msg)
      await refreshRole(); onRetry()
    } catch (e: any) {
      setBootstrapMsg(e.message ?? 'Failed')
    } finally { setBootstrapping(false) }
  }

  if (isNotDeployed) {
    return (
      <div style={{ padding: '16px 18px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
        <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>SQL functions not set up yet</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '10px' }}>
          The admin SQL functions need to be created in your Supabase project. Run the setup script in the Supabase SQL Editor, then retry.
        </div>
        <button onClick={onRetry} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          Retry after deploy
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5' }}>
      <div style={{ marginBottom: '8px', fontWeight: 700 }}>
        {isForbidden
          ? 'Admin access not yet claimed — click below to register your account.'
          : error}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '13px', fontFamily: 'var(--font-sans)', padding: 0 }}>Retry</button>
        {isForbidden && (
          <button onClick={handleBootstrap} disabled={bootstrapping} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(200,155,60,0.4)', backgroundColor: 'rgba(200,155,60,0.15)', color: 'var(--color-gold)', fontSize: '12px', fontWeight: 700, cursor: bootstrapping ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: bootstrapping ? 0.6 : 1 }}>
            {bootstrapping ? 'Claiming…' : 'Claim Admin Access'}
          </button>
        )}
      </div>
      {bootstrapMsg && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: bootstrapMsg.startsWith('Failed') || bootstrapMsg.includes('Error') ? '#fca5a5' : '#86efac' }}>
          {bootstrapMsg}
        </div>
      )}
    </div>
  )
}

// ── Community Members (real Supabase users) ───────────────────────────────────

function CommunityMembersTab() {
  const { role: myRole } = useSupabaseRole()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | MemberStatus>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('admin_list_users')
      if (error) throw new Error(error.message)
      setMembers((data ?? []).map((row: any) => ({
        ...row,
        avatarUrl: row.avatar_url ?? '',
        createdAt: row.created_at ?? '',
        lastSignIn: row.last_sign_in ?? '',
      })))
    } catch (e: any) {
      setError(e.message ?? 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  async function patchMember(id: string, patch: Record<string, any>) {
    setUpdating(id)
    try {
      const { error } = await supabase.rpc('admin_update_member', { target_user_id: id, updates: patch })
      if (error) throw new Error(error.message)
      // Optimistically update local state
      setMembers(ms => ms.map(m => {
        if (m.id !== id) return m
        const updated = { ...m }
        if ('status' in patch) updated.status = patch.status as MemberStatus
        if ('verified' in patch) updated.verified = patch.verified
        return updated
      }))
    } catch (e: any) {
      alert(`Update failed: ${e.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const filtered = members.filter(m => {
    const matchSearch = !search
      || m.name.toLowerCase().includes(search.toLowerCase())
      || m.email.toLowerCase().includes(search.toLowerCase())
      || m.church.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || m.status === filter
    return matchSearch && matchFilter
  })

  const counts = {
    all: members.length,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
    suspended: members.filter(m => m.status === 'suspended').length,
  }

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading members…</div>

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, church…"
            style={{ width: '100%', padding: '9px 14px 9px 34px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(['all', 'active', 'pending', 'suspended'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: '8px',
            border: `1px solid ${filter === f ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
            backgroundColor: filter === f ? 'rgba(200,155,60,0.12)' : 'transparent',
            color: filter === f ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
          }}>
            {f === 'all' ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
          </button>
        ))}
        <button onClick={loadMembers} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          ↺ Refresh
        </button>
        {(myRole === 'superadmin' || myRole === 'admin') && (
          <button
            onClick={() => setCreateOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(200,155,60,0.35)', backgroundColor: 'rgba(200,155,60,0.12)', color: 'var(--color-gold)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(200,155,60,0.2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,60,0.6)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(200,155,60,0.12)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,155,60,0.35)' }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Create User
          </button>
        )}
      </div>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); loadMembers() }}
        />
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={updated => {
            setMembers(ms => ms.map(m => m.id === updated.id ? updated : m))
            setEditingMember(null)
          }}
        />
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          member={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onDeleted={() => {
            setMembers(ms => ms.filter(m => m.id !== pendingDelete.id))
            setPendingDelete(null)
          }}
        />
      )}

      {error && <CommunityMembersError error={error} onRetry={loadMembers} />}

      <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Member', 'Church / Location', 'Role', 'Status', 'Joined', 'Last Active', 'Actions'].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => {
              const statusStyle = STATUS_COLORS[m.status]
              const roleMeta = PLATFORM_ROLE_META[m.role] ?? PLATFORM_ROLE_META.member
              const isUpdating = updating === m.id
              return (
                <tr key={m.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', opacity: isUpdating ? 0.6 : 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}>

                  {/* Member */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.name} style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--color-gold)' }}>
                            {initials(m.name, m.email)}
                          </div>
                        )}
                        {m.verified && (
                          <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid #161b22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: '#fff', fontWeight: 900 }}>✓</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', whiteSpace: 'nowrap' }}>{m.name || '(no name)'}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Church / Location */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{m.church || '—'}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{m.location || '—'}</div>
                  </td>

                  {/* Platform Role */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: roleMeta.bg, color: roleMeta.color }}>{roleMeta.label}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                  </td>

                  {/* Joined */}
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                  </td>

                  {/* Last Active */}
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                    {relativeTime(m.lastSignIn)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px' }}>
                    {(myRole === 'superadmin' || myRole === 'admin') && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <ActionBtn
                          label={m.verified ? 'Unverify' : 'Verify'}
                          color={m.verified ? '#f59e0b' : '#22c55e'}
                          disabled={isUpdating}
                          onClick={() => patchMember(m.id, { verified: !m.verified })}
                        />
                        {m.status === 'suspended'
                          ? <ActionBtn label="Activate" color="#22c55e" disabled={isUpdating} onClick={() => patchMember(m.id, { status: 'active' })} />
                          : <ActionBtn label="Suspend" color="#f87171" disabled={isUpdating} onClick={() => patchMember(m.id, { status: 'suspended' })} />
                        }
                        {myRole === 'superadmin' && (
                          <ActionBtn label="Edit" color="#60a5fa" disabled={isUpdating} onClick={() => setEditingMember(m)} />
                        )}
                        {myRole === 'superadmin' && (
                          <ActionBtn label="Delete" color="#f87171" disabled={isUpdating} onClick={() => setPendingDelete(m)} />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>
            {error ? 'Failed to load.' : members.length === 0 ? 'No members yet.' : 'No members match your search.'}
          </div>
        )}
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
        Showing {filtered.length} of {members.length} members
      </div>
    </div>
  )
}

// ── Platform Users (role management) tab ─────────────────────────────────────

function PlatformUsersTab() {
  const { role: myRole, userId: myId, refreshRole } = useSupabaseRole()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<Record<string, string>>({})
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootstrapMsg, setBootstrapMsg] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.rpc('admin_list_users')
      if (error) throw new Error(error.message)
      setUsers((data ?? []).map((row: any) => ({
        ...row,
        avatarUrl: row.avatar_url ?? '',
        createdAt: row.created_at ?? '',
        lastSignIn: row.last_sign_in ?? '',
      })))
    }
    catch (e: any) { setError(e.message ?? 'Failed to load users') }
    finally { setLoading(false) }
  }

  async function handleSetRole(userId: string, role: PlatformRole) {
    setSavingId(userId)
    try {
      const { error } = await supabase.rpc('admin_set_role', { target_user_id: userId, new_role: role })
      if (error) throw new Error(error.message)
      setUsers(us => us.map(u => u.id === userId ? { ...u, role } : u))
      setSaveMsg(m => ({ ...m, [userId]: '✓ Saved' }))
      setTimeout(() => setSaveMsg(m => { const n = { ...m }; delete n[userId]; return n }), 2000)
      if (userId === myId) await refreshRole()
    } catch (e: any) {
      setSaveMsg(m => ({ ...m, [userId]: `Error: ${e.message}` }))
    } finally { setSavingId(null) }
  }

  async function handleBootstrap() {
    setBootstrapping(true); setBootstrapMsg('')
    try {
      const { data, error } = await supabase.rpc('admin_bootstrap')
      if (error) throw new Error(error.message)
      setBootstrapMsg((data as any)?.message ?? 'Done! Sign out and back in.')
      await refreshRole(); await loadUsers()
    } catch (e: any) { setBootstrapMsg(e.message ?? 'Failed') }
    finally { setBootstrapping(false) }
  }

  const isNotDeployed = error.includes('42883') || error.toLowerCase().includes('does not exist')
  const noAdminExists = !users.some(u => u.role === 'superadmin')
  const isForbidden = error.includes('Forbidden') || error.includes('403') || error.includes('permission denied')
  const showBootstrap = !isNotDeployed && (noAdminExists || isForbidden)

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>

  return (
    <div>
      <div style={{ padding: '14px 18px', backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '4px' }}>Platform Access Control</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          Roles control admin area access. Changes take effect after the user signs out and back in.
          <br /><strong style={{ color: '#f87171' }}>Super Admin</strong> — full control &nbsp;·&nbsp; <strong style={{ color: '#60a5fa' }}>Admin</strong> — manage members &amp; content &nbsp;·&nbsp; <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Member</strong> — standard access
        </div>
      </div>

      {isNotDeployed && (
        <div style={{ padding: '16px 18px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>SQL functions not set up yet</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Run the setup script in the Supabase SQL Editor, then click Retry below.
          </div>
          <button onClick={loadUsers} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.4)', backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Retry
          </button>
        </div>
      )}

      {showBootstrap && (
        <div style={{ padding: '16px 18px', backgroundColor: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '3px' }}>
                {isForbidden ? 'Claim your Super Admin access' : 'No administrator configured yet'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {isForbidden
                  ? 'Your JWT has the superadmin role. Click below to register it with the backend.'
                  : 'Claim super admin — only works when no other super admin exists.'}
              </div>
            </div>
            <button onClick={handleBootstrap} disabled={bootstrapping} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(200,155,60,0.4)', backgroundColor: 'rgba(200,155,60,0.15)', color: 'var(--color-gold)', fontSize: '13px', fontWeight: 700, cursor: bootstrapping ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: bootstrapping ? 0.6 : 1 }}>
              {bootstrapping ? 'Claiming…' : 'Claim Admin Access'}
            </button>
          </div>
          {bootstrapMsg && (
            <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', backgroundColor: bootstrapMsg.includes('already') || bootstrapMsg.startsWith('Failed') ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', border: `1px solid ${bootstrapMsg.includes('already') || bootstrapMsg.startsWith('Failed') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.25)'}`, fontSize: '12px', color: bootstrapMsg.includes('already') || bootstrapMsg.startsWith('Failed') ? '#fca5a5' : '#86efac' }}>
              {bootstrapMsg}
            </div>
          )}
        </div>
      )}

      {error && !isForbidden && (
        <div style={{ padding: '14px 16px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5' }}>
          <div style={{ marginBottom: '4px', fontWeight: 700 }}>{error}</div>
          <button onClick={loadUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: '13px', fontFamily: 'var(--font-sans)', padding: 0 }}>Retry</button>
        </div>
      )}

      <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['User', 'Email', 'Platform Role', 'Joined', 'Last Sign In', 'Status'].map((h, i) => (
                <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const meta = PLATFORM_ROLE_META[u.role as PlatformRole] ?? PLATFORM_ROLE_META.member
              const isMe = u.id === myId
              const msg = saveMsg[u.id]
              return (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden' }}>
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name || u.email} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--color-gold)' }}>
                            {initials(u.name, u.email)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>
                          {u.name || '(no name)'}
                          {isMe && <span style={{ marginLeft: '7px', fontSize: '10px', padding: '2px 7px', borderRadius: '8px', backgroundColor: 'rgba(200,155,60,0.12)', color: 'var(--color-gold)', fontWeight: 700 }}>You</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{u.id?.slice(0, 12)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {myRole === 'superadmin' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select value={u.role} onChange={e => handleSetRole(u.id, e.target.value as PlatformRole)} disabled={savingId === u.id}
                          style={{ padding: '5px 28px 5px 10px', borderRadius: '7px', border: `1px solid ${meta.color}33`, backgroundColor: '#0d1117', color: meta.color, fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                          <option value="superadmin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        {savingId === u.id && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Saving…</span>}
                        {msg && <span style={{ fontSize: '11px', color: msg.startsWith('Error') ? '#fca5a5' : '#86efac', fontWeight: 600 }}>{msg}</span>}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', backgroundColor: meta.bg, color: meta.color }}>{meta.label}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                    {relativeTime(u.lastSignIn)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: u.confirmed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: u.confirmed ? '#22c55e' : '#f59e0b' }}>
                      {u.confirmed ? 'Confirmed' : 'Unconfirmed'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {users.length === 0 && !error && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>No users found.</div>
        )}
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
        {users.length} Supabase auth {users.length === 1 ? 'user' : 'users'} &nbsp;·&nbsp;
        <button onClick={loadUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'var(--font-sans)' }}>&#8635; Refresh</button>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function MembersAdmin() {
  const [tab, setTab] = useState<'community' | 'platform'>('community')
  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {([
          { id: 'community', label: 'Community Members', icon: '👥' },
          { id: 'platform',  label: 'Platform Users & Roles', icon: '🔐' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer',
            backgroundColor: tab === t.id ? '#161b22' : 'transparent',
            color: tab === t.id ? '#e6edf3' : 'rgba(255,255,255,0.35)',
            fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            transition: 'all 0.15s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'community' ? <CommunityMembersTab /> : <PlatformUsersTab />}
    </div>
  )
}

function ActionBtn({ label, color, onClick, disabled }: { label: string; color: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${color}30`, backgroundColor: color + '12', color, fontSize: '11px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap' }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = color + '25' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = color + '12' }}
    >{label}</button>
  )
}
