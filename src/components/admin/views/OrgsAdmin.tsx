import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../../api-client/server'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../providers/AuthProvider'

interface OrgMember {
  userId: string
  email: string
  name: string
  avatarUrl: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  addedAt: string
}

interface Org {
  id: string
  name: string
  type: string
  parentName: string | null
  members: OrgMember[]
  location: string
  address?: string
  website: string
  description: string
  img?: string
  verified: boolean
  status: 'active' | 'suspended' | 'pending'
  features: string[]
  joinedAt: string
}

interface PlatformUser {
  id: string
  email: string
  name: string
  avatarUrl: string
}

const ALL_FEATURES = ['events', 'groups', 'media', 'giving', 'courses', 'livestream', 'resources', 'prayer', 'directory']
const ORG_TYPES = ['network', 'church', 'bible_college', 'ministry', 'school']

const TYPE_ICON: Record<string, string> = {
  network: '🏛', church: '⛪', bible_college: '🎓', ministry: '✝', school: '📚',
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  pending:   { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  suspended: { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:     { bg: 'rgba(200,155,60,0.12)',  color: 'var(--color-gold)' },
  admin:     { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  moderator: { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  member:    { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' },
}

function adminActionBtn(color: string): React.CSSProperties {
  return { flex: 1, padding: '7px 10px', borderRadius: '7px', border: `1px solid ${color}30`, backgroundColor: color + '12', color, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
}

function inputStyle(multiline = false): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', boxSizing: 'border-box', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', resize: multiline ? 'vertical' : 'none', ...(multiline ? { minHeight: '80px' } : {}) }
}

function labelStyle(): React.CSSProperties {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
interface EditPanelProps { org: Org; allOrgs: Org[]; onSave: (updated: Org) => void; onClose: () => void }

function EditPanel({ org, allOrgs, onSave, onClose }: EditPanelProps) {
  const { currentUser } = useAuth()
  const [draft, setDraft] = useState<Org>({ ...org })
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'details' | 'members'>('details')
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator')
  const [addingMember, setAddingMember] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [memberMsg, setMemberMsg] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Org>(key: K, value: Org[K]) { setDraft(d => ({ ...d, [key]: value })) }
  function toggleFeature(f: string) { setDraft(d => ({ ...d, features: d.features.includes(f) ? d.features.filter(x => x !== f) : [...d.features, f] })) }

  function handleSave() { onSave(draft); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/org-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      set('img', data.publicUrl)
    } catch {
      // Non-critical — the field just stays unset and the admin can retry.
    } finally {
      setUploadingImg(false)
    }
  }

  useEffect(() => {
    api<PlatformUser[]>('/members').then(setAllUsers).catch(() => {})
  }, [])

  const members = draft.members ?? []
  const filteredUsers = allUsers.filter(u =>
    !members.some(m => m.userId === u.id) && (
      memberSearch === '' ||
      (u.name ?? '').toLowerCase().includes(memberSearch.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(memberSearch.toLowerCase())
    )
  )

  async function addOrgMember() {
    if (!selectedUser) return
    setAddingMember(true); setMemberMsg('')
    try {
      await api(`/orgs/${org.id}/members`, { method: 'POST', body: JSON.stringify({ userId: selectedUser.id, role: selectedRole }) })
      const newMember: OrgMember = { userId: selectedUser.id, email: selectedUser.email, name: selectedUser.name, avatarUrl: selectedUser.avatarUrl, role: selectedRole, addedAt: new Date().toISOString() }
      setDraft(d => ({ ...d, members: [...(d.members ?? []), newMember] }))
      setSelectedUser(null); setMemberSearch('')
      setMemberMsg(`${selectedUser.name || selectedUser.email} added as ${selectedRole}.`)
    } catch (e: any) {
      setMemberMsg(`Error: ${e.message}`)
    } finally {
      setAddingMember(false)
    }
  }

  async function removeOrgMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from ${org.name}?`)) return
    setRemovingId(userId); setMemberMsg('')
    try {
      await api(`/orgs/${org.id}/members/${userId}`, { method: 'DELETE' })
      setDraft(d => ({ ...d, members: (d.members ?? []).filter(m => m.userId !== userId) }))
      setMemberMsg(`${name} removed.`)
    } catch (e: any) {
      setMemberMsg(`Error: ${e.message}`)
    } finally {
      setRemovingId(null)
    }
  }

  const parentOptions = allOrgs.filter(o => o.id !== org.id)

  return (
    <div className="admin-manage-panel" style={{ backgroundColor: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#0d1117', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#e6edf3' }}>Edit Organization</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{org.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['details', 'members'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: tab === t ? 700 : 500, backgroundColor: 'transparent', color: tab === t ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)', borderBottom: `2px solid ${tab === t ? 'var(--color-gold)' : 'transparent'}`, textTransform: 'capitalize', transition: 'all 0.15s' }}>
            {t === 'details' ? '⚙ Details' : `👥 Members (${(draft.members ?? []).length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
        {tab === 'details' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
                  background: draft.img ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                }}>
                  {draft.img ? <img src={draft.img} alt={draft.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (TYPE_ICON[draft.type] ?? '🏛')}
                </div>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0)', transition: 'background 0.15s', fontSize: '16px',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0.45)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(0,0,0,0)' }}
                >📷</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{uploadingImg ? 'Uploading…' : 'Logo / Photo'}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Click to {draft.img ? 'change' : 'upload'}</div>
              </div>
            </div>
            <div>
              <label style={labelStyle()}>Organization Name</label>
              <input value={draft.name} onChange={e => set('name', e.target.value)} style={inputStyle()} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle()}>Type</label>
                <select value={draft.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
                  {ORG_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#161b22' }}>{t === 'bible_college' ? 'Bible College' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle()}>Status</label>
                <select value={draft.status} onChange={e => set('status', e.target.value as Org['status'])} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
                  <option value="active" style={{ backgroundColor: '#161b22' }}>Active</option>
                  <option value="pending" style={{ backgroundColor: '#161b22' }}>Pending</option>
                  <option value="suspended" style={{ backgroundColor: '#161b22' }}>Suspended</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle()}>Location</label>
              <input value={draft.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="City, State or Country" />
            </div>
            <div>
              <label style={labelStyle()}>Full Address <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(pins it precisely on the Global Map)</span></label>
              <input value={draft.address ?? ''} onChange={e => set('address', e.target.value)} style={inputStyle()} placeholder="123 Main St, City, State ZIP" />
            </div>
            <div>
              <label style={labelStyle()}>Website</label>
              <input value={draft.website} onChange={e => set('website', e.target.value)} style={inputStyle()} placeholder="example.org" />
            </div>
            <div>
              <label style={labelStyle()}>Parent Organization</label>
              <select value={draft.parentName ?? ''} onChange={e => set('parentName', e.target.value || null)} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
                <option value="" style={{ backgroundColor: '#161b22' }}>— None —</option>
                {parentOptions.map(o => <option key={o.id} value={o.name} style={{ backgroundColor: '#161b22' }}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle()}>Description</label>
              <textarea value={draft.description} onChange={e => set('description', e.target.value)} style={inputStyle(true) as React.TextareaHTMLAttributes<HTMLTextAreaElement>['style']} placeholder="Brief description…" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>Verified Status</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Show verified badge to all members</div>
              </div>
              <button onClick={() => set('verified', !draft.verified)} style={{ width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', backgroundColor: draft.verified ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
                <span style={{ position: 'absolute', top: '3px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', left: draft.verified ? '21px' : '3px' }} />
              </button>
            </div>
            <div>
              <label style={labelStyle()}>Enabled Features</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {ALL_FEATURES.map(f => {
                  const on = draft.features.includes(f)
                  return <button key={f} onClick={() => toggleFeature(f)} style={{ padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', border: `1px solid ${on ? 'rgba(200,155,60,0.5)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: on ? 'rgba(200,155,60,0.15)' : 'rgba(255,255,255,0.03)', color: on ? 'var(--color-gold)' : 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: on ? 700 : 500, fontFamily: 'var(--font-sans)', textTransform: 'capitalize', transition: 'all 0.15s' }}>{on ? '✓ ' : ''}{f}</button>
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'members' && (
          <>
            {memberMsg && (
              <div style={{ fontSize: '12px', fontWeight: 600, color: memberMsg.startsWith('Error') ? '#fca5a5' : '#86efac', padding: '10px 14px', backgroundColor: memberMsg.startsWith('Error') ? 'rgba(248,113,113,0.08)' : 'rgba(134,239,172,0.08)', borderRadius: '8px', border: `1px solid ${memberMsg.startsWith('Error') ? 'rgba(248,113,113,0.2)' : 'rgba(134,239,172,0.2)'}` }}>{memberMsg}</div>
            )}

            {/* Current members */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Current Members ({members.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => {
                  const rs = ROLE_STYLE[m.role] ?? ROLE_STYLE.moderator
                  return (
                    <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {m.avatarUrl
                        ? <img src={m.avatarUrl} alt={m.name} style={{ width: '32px', height: '32px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: '32px', height: '32px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '12px' }}>{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3' }}>{m.name || m.email}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{m.email}</div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', backgroundColor: rs.bg, color: rs.color, textTransform: 'capitalize', flexShrink: 0 }}>{m.role}</span>
                      {m.role !== 'owner' && (
                        <button
                          onClick={() => removeOrgMember(m.userId, m.name || m.email)}
                          disabled={removingId === m.userId}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '14px', padding: '2px 6px', borderRadius: '4px', opacity: removingId === m.userId ? 0.5 : 1 }}
                          title="Remove"
                        >✕</button>
                      )}
                    </div>
                  )
                })}
                {members.length === 0 && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', padding: '16px 0', textAlign: 'center' }}>No members yet</div>}
              </div>
            </div>

            {/* Add member */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Add Member</div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setSelectedUser(null) }} placeholder="Search platform users…" style={{ ...inputStyle(), paddingLeft: '32px' }} />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>🔍</span>
              </div>
              {memberSearch && filteredUsers.length > 0 && !selectedUser && (
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                  {filteredUsers.slice(0, 8).map(u => (
                    <button key={u.id} onClick={() => { setSelectedUser(u); setMemberSearch(u.name || u.email) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', border: 'none', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.02)' }}
                    >
                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} style={{ width: '26px', height: '26px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '10px' }}>{(u.name || u.email || '?').slice(0, 2).toUpperCase()}</div>}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{u.name || '(no name)'}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{u.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as 'admin' | 'moderator')} style={{ ...inputStyle(), flex: 1, cursor: 'pointer' }}>
                    <option value="moderator" style={{ backgroundColor: '#161b22' }}>Moderator</option>
                    <option value="admin" style={{ backgroundColor: '#161b22' }}>Admin</option>
                  </select>
                  <button onClick={addOrgMember} disabled={addingMember} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: addingMember ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: addingMember ? 0.7 : 1, whiteSpace: 'nowrap' }}>{addingMember ? 'Adding…' : 'Add'}</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer — only show save for details tab */}
      {tab === 'details' && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, backgroundColor: '#0d1117' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Discard</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-sans)', transition: 'background 0.3s' }}>{saved ? '✓ Saved' : 'Save Changes'}</button>
        </div>
      )}
    </div>
  )
}

// ── Create Org Modal ──────────────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreate }: { onClose: () => void; onCreate: (org: Org) => void }) {
  const [form, setForm] = useState({ name: '', type: 'church', description: '', location: '', address: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(key: keyof typeof form, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleCreate() {
    if (!form.name.trim()) { setErr('Organization name is required.'); return }
    setSaving(true); setErr('')
    try {
      const org = await api<Org>('/orgs', { method: 'POST', body: JSON.stringify(form) })
      onCreate(org)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create organization.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#0d1117', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3' }}>Add Organization</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '20px', padding: '4px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle()}>Organization Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle()} placeholder="e.g. Grace Community Church" />
          </div>
          <div className="grid-2">
            <div>
              <label style={labelStyle()}>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
                {ORG_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#161b22' }}>{t === 'bible_college' ? 'Bible College' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle()}>Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} style={inputStyle()} placeholder="City, Country" />
            </div>
          </div>
          <div>
            <label style={labelStyle()}>Full Address <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input value={form.address} onChange={e => set('address', e.target.value)} style={inputStyle()} placeholder="123 Main St, City, State ZIP" />
          </div>
          <div>
            <label style={labelStyle()}>Website</label>
            <input value={form.website} onChange={e => set('website', e.target.value)} style={inputStyle()} placeholder="example.org" />
          </div>
          <div>
            <label style={labelStyle()}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} style={{ ...inputStyle(true), minHeight: '70px' } as React.TextareaHTMLAttributes<HTMLTextAreaElement>['style']} placeholder="Brief description…" />
          </div>
        </div>
        {err && <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '12px', fontWeight: 600 }}>{err}</div>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create Organization'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main OrgsAdmin ────────────────────────────────────────────────────────────
export default function OrgsAdmin() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const editingOrg = orgs.find(o => o.id === editingId) ?? null

  useEffect(() => {
    api<Org[]>('/orgs').then(setOrgs).catch(() => {})
  }, [])

  const persistOrgs = useCallback((updated: Org[]) => {
    api('/orgs', { method: 'PUT', body: JSON.stringify(updated) }).catch(() => {})
  }, [])

  const filtered = orgs.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || (o.location ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || o.type === typeFilter
    return matchSearch && matchType
  })

  const saveOrg = (updated: Org) =>
    setOrgs(os => { const next = os.map(o => o.id === updated.id ? updated : o); persistOrgs(next); return next })

  const deleteOrg = (id: string) => {
    setOrgs(os => { const next = os.filter(o => o.id !== id); persistOrgs(next); return next })
    setConfirmDeleteId(null)
    if (editingId === id) setEditingId(null)
  }

  const toggleVerify = (id: string) =>
    setOrgs(os => { const next = os.map(o => o.id === id ? { ...o, verified: !o.verified } : o); persistOrgs(next); return next })

  const toggleStatus = (id: string) =>
    setOrgs(os => { const next = os.map(o => o.id === id ? { ...o, status: o.status === 'active' ? 'suspended' : 'active' } : o) as Org[]; persistOrgs(next); return next })

  const approve = (id: string) =>
    setOrgs(os => { const next = os.map(o => o.id === id ? { ...o, status: 'active' as const, verified: true } : o); persistOrgs(next); return next })

  const handleOrgCreated = (org: Org) => {
    setOrgs(os => [...os, org])
    setShowCreate(false)
  }

  return (
    <div className="admin-view-container" style={{ paddingRight: editingId ? '456px' : '0', transition: 'padding-right 0.25s' }}>
      {/* Summary row */}
      <div className="grid-stats-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Orgs',       value: orgs.length,                                   color: 'var(--color-gold)' },
          { label: 'Networks',         value: orgs.filter(o => o.type === 'network').length,  color: '#60a5fa' },
          { label: 'Churches',         value: orgs.filter(o => o.type === 'church').length,   color: '#a78bfa' },
          { label: 'Pending Approval', value: orgs.filter(o => o.status === 'pending').length, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(['all', 'network', 'church', 'bible_college'] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${typeFilter === t ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: typeFilter === t ? 'rgba(200,155,60,0.1)' : 'transparent', color: typeFilter === t ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>
            {t === 'all' ? 'All' : t === 'bible_college' ? 'Bible College' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(200,155,60,0.3)', backgroundColor: 'rgba(200,155,60,0.1)', color: 'var(--color-gold)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          + Add Organization
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>🏛</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
            {search ? 'No organizations match your search' : 'No organizations yet'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {search ? 'Try a different name or location.' : 'Add your first church, network, or ministry using the button above.'}
          </div>
        </div>
      )}

      {/* Org cards grid */}
      {filtered.length > 0 && (
        <div className={editingId ? 'grid-1' : 'grid-2-auto'} style={{ gap: '14px' }}>
          {filtered.map(org => {
            const ss = STATUS_STYLE[org.status]
            const isEditing = editingId === org.id
            const memberCount = Array.isArray(org.members) ? org.members.length : (org as any).members?.length ?? 0
            return (
              <div key={org.id} style={{ backgroundColor: isEditing ? 'rgba(200,155,60,0.06)' : '#161b22', borderRadius: '12px', border: `1px solid ${isEditing ? 'rgba(200,155,60,0.3)' : org.status === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`, padding: '18px 20px', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{TYPE_ICON[org.type] ?? '🏛'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{org.name}</span>
                      {org.verified && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✓ Verified</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {org.type.replace('_', ' ')} · {org.location}
                      {org.parentName && <span style={{ color: 'var(--color-gold)' }}> · {org.parentName}</span>}
                    </div>
                    {org.website && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{org.website}</div>}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: ss.bg, color: ss.color, flexShrink: 0, textTransform: 'capitalize' }}>{org.status}</span>
                </div>
                {org.description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>{org.description}</div>}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{memberCount}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Members</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{(org.features ?? []).length}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Features</div>
                  </div>
                  {org.joinedAt && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3' }}>{new Date(org.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Joined</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '14px' }}>
                  {(org.features ?? []).map(f => <span key={f} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'capitalize' }}>{f}</span>)}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {confirmDeleteId === org.id ? (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, flex: 1 }}>Delete "{org.name}"? This cannot be undone.</span>
                      <button onClick={() => deleteOrg(org.id)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {org.status === 'pending'
                        ? <button onClick={() => approve(org.id)} style={adminActionBtn('#22c55e')}>✓ Approve</button>
                        : <button onClick={() => toggleVerify(org.id)} style={adminActionBtn('var(--color-gold)')}>{org.verified ? 'Unverify' : '✓ Verify'}</button>
                      }
                      <button onClick={() => toggleStatus(org.id)} style={adminActionBtn(org.status === 'active' ? '#f87171' : '#22c55e')}>{org.status === 'active' ? 'Suspend' : 'Activate'}</button>
                      <button onClick={() => setEditingId(isEditing ? null : org.id)} style={adminActionBtn(isEditing ? 'var(--color-gold)' : '#60a5fa')}>{isEditing ? '← Close' : '✏ Edit'}</button>
                      <button onClick={() => { setConfirmDeleteId(org.id); setEditingId(null) }} style={adminActionBtn('#f87171')}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingOrg && <EditPanel org={editingOrg} allOrgs={orgs} onSave={saveOrg} onClose={() => setEditingId(null)} />}
      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreate={handleOrgCreated} />}
    </div>
  )
}
