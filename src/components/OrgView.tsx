import { useState, useEffect, useRef } from 'react'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'
import { useAuth } from '../providers/AuthProvider'
import MinistryDetailView from './MinistryDetailView'

interface OrgMember {
  userId: string
  email: string
  name: string
  avatarUrl: string
  role: 'owner' | 'admin' | 'moderator'
  addedAt: string
}

interface MyOrg {
  id: string
  name: string
  type: string
  description: string
  location: string
  website: string
  verified: boolean
  status: string
  img: string
  features: string[]
  members: OrgMember[]
  following: boolean
  followerCount: number
  createdAt: string
}

interface PlatformUser {
  id: string
  email: string
  name: string
  avatarUrl: string
}

const ORG_TYPES = [
  { value: 'church', label: 'Church' },
  { value: 'network', label: 'Network' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'bible_college', label: 'Bible College' },
  { value: 'school', label: 'School' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'headquarters', label: 'Headquarters' },
  { value: 'region', label: 'Region' },
  { value: 'council', label: 'Council' },
]

function typeLabel(type: string): string {
  return ORG_TYPES.find(t => t.value === type)?.label ?? type
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  owner:     { bg: 'rgba(200,155,60,0.1)',   color: 'var(--color-gold)' },
  admin:     { bg: 'rgba(96,165,250,0.1)',   color: '#60a5fa' },
  moderator: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa' },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: '#ECFDF5', color: '#047857', label: 'Active' },
  pending:   { bg: '#FBF5E6', color: '#92700A', label: 'Pending Approval' },
  suspended: { bg: '#FEF2F2', color: '#991B1B', label: 'Suspended' },
}

function label(_s?: string): React.CSSProperties {
  return { display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }
}
function input(): React.CSSProperties {
  return { width: '100%', padding: '9px 12px', boxSizing: 'border-box', border: '1.5px solid var(--color-border)', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)', backgroundColor: 'var(--color-surface)', outline: 'none' }
}

function OrgLogo({ org, size }: { org: Pick<MyOrg, 'name' | 'img'>; size: number }) {
  return org.img
    ? <img src={org.img} alt={org.name} style={{ width: size, height: size, borderRadius: size / 4, objectFit: 'cover', display: 'block', flexShrink: 0 }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: size / 4, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4,
      }}>🏛</div>
    )
}

// ── Create Org Form ──────────────────────────────────────────────────────────
function CreateOrgForm({ onCreated }: { onCreated: () => void }) {
  const { currentUser } = useAuth()
  const [form, setForm] = useState({ name: '', type: 'church', description: '', location: '', website: '', img: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function set(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/org-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      set('img', data.publicUrl)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) { setErr('Organization name is required.'); return }
    setSaving(true); setErr('')
    try {
      await api('/orgs', { method: 'POST', body: JSON.stringify(form) })
      onCreated()
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create organization.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '24px', marginBottom: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)', fontFamily: 'var(--font-serif)' }}>Create New Ministry</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
        <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
          <OrgLogo org={{ name: form.name || 'New', img: form.img }} size={56} />
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
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{uploading ? 'Uploading…' : 'Logo / Photo'}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Click to {form.img ? 'change' : 'upload'} (optional)</div>
        </div>
      </div>

      <div className="grid-2-lg" style={{ marginBottom: '16px' }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={label()}>Organization Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={input()} placeholder="e.g. Grace Community Church" />
        </div>
        <div>
          <label style={label()}>Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} style={{ ...input(), cursor: 'pointer' }}>
            {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={label()}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} style={input()} placeholder="City, Country" />
        </div>
        <div>
          <label style={label()}>Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} style={input()} placeholder="example.org" />
        </div>
        <div>
          <label style={label()}>Description</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} style={input()} placeholder="Brief description…" />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginBottom: '16px', lineHeight: 1.6 }}>
        You'll be set as owner and can manage members and content immediately.
      </div>
      {err && <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px', fontWeight: 600 }}>{err}</div>}
      <button
        onClick={handleCreate}
        disabled={saving || uploading}
        style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}
      >{saving ? 'Creating…' : 'Create Ministry'}</button>
    </div>
  )
}

// ── Members Panel ────────────────────────────────────────────────────────────
function OrgMembersPanel({ org, currentUserId, onClose, onUpdate }: {
  org: MyOrg
  currentUserId: string
  onClose: () => void
  onUpdate: () => void
}) {
  const [allUsers, setAllUsers] = useState<PlatformUser[]>([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator'>('moderator')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const myRole = org.members.find(m => m.userId === currentUserId)?.role
  const canManage = myRole === 'owner' || myRole === 'admin'

  useEffect(() => {
    api<PlatformUser[]>('/members').then(setAllUsers).catch(() => {})
  }, [])

  const filteredUsers = allUsers.filter(u =>
    !org.members.some(m => m.userId === u.id) && (
      search === '' ||
      (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    )
  )

  async function addMember() {
    if (!selectedUser || !canManage) return
    setAdding(true); setMsg('')
    try {
      await api(`/orgs/${org.id}/members`, { method: 'POST', body: JSON.stringify({ userId: selectedUser.id, role: selectedRole }) })
      setSelectedUser(null); setSearch('')
      onUpdate()
      setMsg(`${selectedUser.name || selectedUser.email} added as ${selectedRole}.`)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setAdding(false)
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!canManage) return
    if (!window.confirm(`Remove ${name} from ${org.name}?`)) return
    setRemoving(userId); setMsg('')
    try {
      await api(`/orgs/${org.id}/members/${userId}`, { method: 'DELETE' })
      onUpdate()
      setMsg(`${name} removed.`)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="org-manage-panel" style={{
      backgroundColor: 'var(--color-card)', borderLeft: '1px solid var(--color-border)',
      zIndex: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: 'var(--color-card)', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-1)' }}>Manage Members</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-3)', marginTop: '2px' }}>{org.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-2)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
      </div>

      <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {msg && <div style={{ fontSize: '13px', fontWeight: 600, color: msg.startsWith('Error') ? '#dc2626' : '#047857', padding: '10px 14px', backgroundColor: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5', borderRadius: '8px' }}>{msg}</div>}

        {/* Current members */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
            Current Members ({org.members.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {org.members.map(m => {
              const rs = ROLE_STYLE[m.role] ?? ROLE_STYLE.moderator
              const isMe = m.userId === currentUserId
              const canRemove = canManage && !isMe && m.role !== 'owner'
              return (
                <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  {m.avatarUrl
                    ? <img src={m.avatarUrl} alt={m.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{(m.name || m.email || '?').slice(0, 2).toUpperCase()}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)' }}>{m.name || m.email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{m.email}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', backgroundColor: rs.bg, color: rs.color, textTransform: 'capitalize', flexShrink: 0 }}>{m.role}</span>
                  {canRemove && (
                    <button
                      onClick={() => removeMember(m.userId, m.name || m.email)}
                      disabled={removing === m.userId}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '14px', padding: '2px 6px', borderRadius: '4px', opacity: removing === m.userId ? 0.5 : 1 }}
                      title="Remove member"
                    >✕</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Add member */}
        {canManage && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>Add Member</div>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedUser(null) }}
                placeholder="Search by name or email…"
                style={{ ...input(), paddingLeft: '36px' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--color-text-3)' }}>🔍</span>
            </div>
            {search && filteredUsers.length > 0 && !selectedUser && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                {filteredUsers.slice(0, 8).map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setSearch(u.name || u.email) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', border: 'none', background: 'var(--color-card)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', borderBottom: '1px solid var(--color-border)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-card)' }}
                  >
                    {u.avatarUrl
                      ? <img src={u.avatarUrl} alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '6px', flexShrink: 0, backgroundColor: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '11px' }}>{(u.name || u.email || '?').slice(0, 2).toUpperCase()}</div>
                    }
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)' }}>{u.name || '(no name)'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-3)' }}>{u.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as 'admin' | 'moderator')}
                  style={{ ...input(), flex: 1, cursor: 'pointer' }}
                >
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={addMember}
                  disabled={adding}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: adding ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: adding ? 0.7 : 1, whiteSpace: 'nowrap' }}
                >{adding ? 'Adding…' : 'Add'}</button>
              </div>
            )}
            {search && filteredUsers.length === 0 && !selectedUser && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-3)', padding: '8px 0' }}>No platform users match "{search}"</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Org Card ─────────────────────────────────────────────────────────────────
function OrgCard({ org, currentUserId, isMember, onManage, onView, onFollowToggle, followBusy }: {
  org: MyOrg
  currentUserId: string
  isMember: boolean
  onManage: () => void
  onView: () => void
  onFollowToggle: () => void
  followBusy: boolean
}) {
  const myRole = org.members.find(m => m.userId === currentUserId)?.role
  const rs = ROLE_STYLE[myRole ?? 'moderator']
  const ss = STATUS_STYLE[org.status] ?? STATUS_STYLE.pending
  const canManage = myRole === 'owner' || myRole === 'admin'

  return (
    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ height: '6px', background: 'linear-gradient(90deg, var(--color-navy), var(--color-navy-light, #2d4a8a))' }} />
      <div style={{ padding: '18px 20px' }}>
        <div onClick={onView} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px', cursor: 'pointer' }}>
          <OrgLogo org={org} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-1)' }}>{org.name}</span>
              {org.verified && <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#047857' }}>✓ Verified</span>}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>{typeLabel(org.type)}{org.location ? ` · ${org.location}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', flexShrink: 0 }}>
            {isMember && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '8px', backgroundColor: rs.bg, color: rs.color, textTransform: 'capitalize' }}>{myRole}</span>}
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '8px', backgroundColor: ss.bg, color: ss.color }}>{ss.label}</span>
          </div>
        </div>
        {org.description && <div style={{ fontSize: '13px', color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: '12px' }}>{org.description}</div>}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
          <div><div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)' }}>{org.members.length}</div><div style={{ fontSize: '10px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Members</div></div>
          <div><div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-1)' }}>{org.followerCount}</div><div style={{ fontSize: '10px', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Followers</div></div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onView}
            style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-1)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >View →</button>
          {isMember && canManage && (
            <button
              onClick={onManage}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >Manage Members</button>
          )}
          {!isMember && (
            <button
              onClick={onFollowToggle}
              disabled={followBusy}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', cursor: followBusy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
                border: org.following ? '1px solid var(--color-border)' : 'none',
                backgroundColor: org.following ? 'var(--color-surface)' : 'var(--color-navy)',
                color: org.following ? 'var(--color-text-1)' : '#fff',
                opacity: followBusy ? 0.6 : 1,
              }}
            >{followBusy ? '…' : org.following ? '✓ Following' : '+ Follow'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────
export default function OrgView() {
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [orgs, setOrgs] = useState<MyOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [managingOrg, setManagingOrg] = useState<MyOrg | null>(null)
  const [viewingOrgId, setViewingOrgId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [followBusyId, setFollowBusyId] = useState<string | null>(null)

  async function load() {
    try {
      const [fetchedOrgs, { data: { user } }] = await Promise.all([
        api<MyOrg[]>('/orgs/my'),
        supabase.auth.getUser(),
      ])
      setOrgs(fetchedOrgs)
      setCurrentUserId(user?.id ?? '')
    } catch {
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleOrgCreated() {
    setShowCreate(false)
    setLoading(true)
    await load()
    setTab('my')
  }

  async function handleMemberUpdate() {
    await load()
  }

  // After reload, sync the managing panel with fresh data
  useEffect(() => {
    if (managingOrg) {
      const fresh = orgs.find(o => o.id === managingOrg.id)
      setManagingOrg(fresh ?? null)
    }
  }, [orgs])

  async function toggleFollow(org: MyOrg) {
    setFollowBusyId(org.id)
    try {
      await api(`/orgs/${org.id}/${org.following ? 'unfollow' : 'follow'}`, { method: 'POST' })
      await load()
    } finally {
      setFollowBusyId(null)
    }
  }

  const isMember = (org: MyOrg) => org.members.some(m => m.userId === currentUserId)
  const myOrgs = orgs.filter(isMember)
  const discoverOrgs = orgs.filter(o => !isMember(o))

  const availableTypes = Array.from(new Set(orgs.map(o => o.type))).sort()

  const tabOrgs = (tab === 'my' ? myOrgs : discoverOrgs).filter(o => typeFilter === 'all' || o.type === typeFilter)

  const viewingOrg = viewingOrgId ? orgs.find(o => o.id === viewingOrgId) ?? null : null
  if (viewingOrg) {
    return (
      <MinistryDetailView
        ministry={viewingOrg}
        currentUserId={currentUserId}
        onBack={() => setViewingOrgId(null)}
        onFollowToggle={() => toggleFollow(viewingOrg)}
        followBusy={followBusyId === viewingOrg.id}
      />
    )
  }

  return (
    <div className="org-view-container" style={{ maxWidth: '960px', margin: '0 auto', paddingRight: managingOrg ? '440px' : '0', transition: 'padding-right 0.25s' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: 'var(--color-navy)', fontFamily: 'var(--font-serif)' }}>Ministries</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-2)' }}>Churches, ministries, and networks across the FMCI network</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', backgroundColor: showCreate ? 'var(--color-border)' : 'var(--color-navy)', color: showCreate ? 'var(--color-text-1)' : '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >{showCreate ? 'Cancel' : '+ New Ministry'}</button>
      </div>

      {showCreate && <CreateOrgForm onCreated={handleOrgCreated} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {([
          { id: 'my' as const, label: `My Ministries (${myOrgs.length})` },
          { id: 'discover' as const, label: `Discover (${discoverOrgs.length})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '9px 22px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700,
            backgroundColor: tab === t.id ? 'var(--color-navy)' : 'var(--color-card)',
            color: tab === t.id ? '#fff' : 'var(--color-text-2)',
            border: tab === t.id ? 'none' : '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Type filter */}
      {availableTypes.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button onClick={() => setTypeFilter('all')} style={{
            padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
            border: `1px solid ${typeFilter === 'all' ? 'var(--color-navy)' : 'var(--color-border)'}`,
            backgroundColor: typeFilter === 'all' ? 'var(--color-navy)' : 'transparent',
            color: typeFilter === 'all' ? '#fff' : 'var(--color-text-2)',
          }}>All Types</button>
          {availableTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
              border: `1px solid ${typeFilter === t ? 'var(--color-navy)' : 'var(--color-border)'}`,
              backgroundColor: typeFilter === t ? 'var(--color-navy)' : 'transparent',
              color: typeFilter === t ? '#fff' : 'var(--color-text-2)',
            }}>{typeLabel(t)}</button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading ministries…</div>
      )}

      {!loading && tabOrgs.length === 0 && (
        <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏛</div>
          <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-text-1)', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
            {tab === 'my' ? "You're not part of any ministries yet" : 'Nothing to discover right now'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 20px' }}>
            {tab === 'my'
              ? 'Create your church, ministry, or network, or browse Discover to follow others.'
              : typeFilter !== 'all' ? 'Try a different type filter.' : "You're already part of everything else on the network."}
          </div>
          {tab === 'my' && (
            <button
              onClick={() => setShowCreate(true)}
              style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >Create Your First Ministry</button>
          )}
        </div>
      )}

      {!loading && tabOrgs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {tabOrgs.map(org => (
            <OrgCard
              key={org.id}
              org={org}
              currentUserId={currentUserId}
              isMember={isMember(org)}
              onManage={() => setManagingOrg(managingOrg?.id === org.id ? null : org)}
              onView={() => setViewingOrgId(org.id)}
              onFollowToggle={() => toggleFollow(org)}
              followBusy={followBusyId === org.id}
            />
          ))}
        </div>
      )}

      {managingOrg && (
        <OrgMembersPanel
          org={managingOrg}
          currentUserId={currentUserId}
          onClose={() => setManagingOrg(null)}
          onUpdate={handleMemberUpdate}
        />
      )}
    </div>
  )
}
