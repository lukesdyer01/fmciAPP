import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../../api-client/server'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../providers/AuthProvider'

interface Group {
  id: string
  name: string
  description: string
  about: string
  type: 'Leadership-Only' | 'Private' | 'Public' | 'Invite-Only'
  img: string
  founded: string
  lastActivity: string
  members: number
  admins: string[]
}

const GROUP_TYPES: Group['type'][] = ['Public', 'Private', 'Invite-Only', 'Leadership-Only']

const TYPE_STYLE: Record<Group['type'], { bg: string; color: string }> = {
  'Public':          { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  'Private':         { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
  'Invite-Only':     { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  'Leadership-Only': { bg: 'rgba(200,155,60,0.12)', color: 'var(--color-gold)' },
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
function EditPanel({ group, onSave, onClose }: { group: Group; onSave: (updated: Group) => void; onClose: () => void }) {
  const { currentUser } = useAuth()
  const [draft, setDraft] = useState<Group>({ ...group })
  const [saved, setSaved] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Group>(key: K, value: Group[K]) { setDraft(d => ({ ...d, [key]: value })) }
  function handleSave() { onSave(draft); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  async function handleImageFile(file: File) {
    if (!currentUser) return
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${currentUser.id}/group-${Date.now()}.${ext}`
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

  return (
    <div className="admin-manage-panel" style={{ backgroundColor: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, backgroundColor: '#0d1117', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#e6edf3' }}>Edit Group</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{group.name}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
      </div>

      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', position: 'relative' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
              background: draft.img ? undefined : 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            }}>
              {draft.img ? <img src={draft.img} alt={draft.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👥'}
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
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{uploadingImg ? 'Uploading…' : 'Group Image'}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Click to {draft.img ? 'change' : 'upload'}</div>
          </div>
        </div>
        <div>
          <label style={labelStyle()}>Group Name</label>
          <input value={draft.name} onChange={e => set('name', e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <label style={labelStyle()}>Access</label>
          <select value={draft.type} onChange={e => set('type', e.target.value as Group['type'])} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
            {GROUP_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#161b22' }}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle()}>Short Description</label>
          <input value={draft.description} onChange={e => set('description', e.target.value)} style={inputStyle()} placeholder="One line describing this group" />
        </div>
        <div>
          <label style={labelStyle()}>About</label>
          <textarea value={draft.about} onChange={e => set('about', e.target.value)} style={inputStyle(true)} placeholder="What's this group for?" />
        </div>
        <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{draft.members}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Members</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{(draft.admins ?? []).length}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Admins</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{draft.founded ? new Date(draft.founded).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Founded</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', position: 'sticky', bottom: 0, backgroundColor: '#0d1117' }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>Discard</button>
        <button onClick={handleSave} disabled={uploadingImg} style={{ flex: 2, padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-sans)', transition: 'background 0.3s', opacity: uploadingImg ? 0.7 : 1 }}>{saved ? '✓ Saved' : 'Save Changes'}</button>
      </div>
    </div>
  )
}

// ── Create Group Modal ───────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (group: Group) => void }) {
  const [form, setForm] = useState({ name: '', description: '', about: '', type: 'Public' as Group['type'] })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) { setForm(f => ({ ...f, [key]: val })) }

  async function handleCreate() {
    if (!form.name.trim()) { setErr('Group name is required.'); return }
    setSaving(true); setErr('')
    try {
      const group = await api<Group>('/groups', { method: 'POST', body: JSON.stringify(form) })
      onCreate(group)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create group.')
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ backgroundColor: '#0d1117', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '28px', width: '480px', maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3' }}>Add Group</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '20px', padding: '4px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle()}>Group Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle()} placeholder="e.g. Young Adults Ministry" autoFocus />
          </div>
          <div>
            <label style={labelStyle()}>Access</label>
            <select value={form.type} onChange={e => set('type', e.target.value as Group['type'])} style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}>
              {GROUP_TYPES.map(t => <option key={t} value={t} style={{ backgroundColor: '#161b22' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle()}>Short Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} style={inputStyle()} placeholder="One line describing this group" />
          </div>
          <div>
            <label style={labelStyle()}>About</label>
            <textarea value={form.about} onChange={e => set('about', e.target.value)} style={inputStyle(true)} placeholder="What's this group for?" />
          </div>
        </div>
        {err && <div style={{ fontSize: '13px', color: '#fca5a5', marginTop: '12px', fontWeight: 600 }}>{err}</div>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light, #d4a017))', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create Group'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main GroupsAdmin ─────────────────────────────────────────────────────────
export default function GroupsAdmin() {
  const [groups, setGroups] = useState<Group[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Group['type']>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const editingGroup = groups.find(g => g.id === editingId) ?? null

  useEffect(() => {
    api<Group[]>('/groups').then(setGroups).catch(() => {})
  }, [])

  const persistGroup = useCallback((updated: Group) => {
    api(`/groups/${updated.id}`, { method: 'PATCH', body: JSON.stringify({ name: updated.name, description: updated.description, about: updated.about, type: updated.type, img: updated.img }) }).catch(() => {})
  }, [])

  const filtered = groups.filter(g => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || (g.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || g.type === typeFilter
    return matchSearch && matchType
  })

  const saveGroup = (updated: Group) => {
    setGroups(gs => gs.map(g => g.id === updated.id ? updated : g))
    persistGroup(updated)
  }

  const deleteGroup = async (id: string) => {
    setGroups(gs => gs.filter(g => g.id !== id))
    setConfirmDeleteId(null)
    if (editingId === id) setEditingId(null)
    try {
      await api(`/groups/${id}`, { method: 'DELETE' })
    } catch {
      // Best-effort — a failed delete will simply reappear on next load.
    }
  }

  const handleGroupCreated = (group: Group) => {
    setGroups(gs => [group, ...gs])
    setShowCreate(false)
  }

  return (
    <div className="admin-view-container" style={{ paddingRight: editingId ? '456px' : '0', transition: 'padding-right 0.25s' }}>
      {/* Summary row */}
      <div className="grid-stats-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Groups',      value: groups.length,                                              color: 'var(--color-gold)' },
          { label: 'Public',            value: groups.filter(g => g.type === 'Public').length,              color: '#22c55e' },
          { label: 'Private / Invite',  value: groups.filter(g => g.type === 'Private' || g.type === 'Invite-Only').length, color: '#60a5fa' },
          { label: 'Leadership-Only',   value: groups.filter(g => g.type === 'Leadership-Only').length,     color: '#a78bfa' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(['all', ...GROUP_TYPES] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${typeFilter === t ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: typeFilter === t ? 'rgba(200,155,60,0.1)' : 'transparent', color: typeFilter === t ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
        <button onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(200,155,60,0.3)', backgroundColor: 'rgba(200,155,60,0.1)', color: 'var(--color-gold)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
          + Add Group
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>👥</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
            {search ? 'No groups match your search' : 'No groups yet'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {search ? 'Try a different name or description.' : 'Add the first ministry circle or prayer network using the button above.'}
          </div>
        </div>
      )}

      {/* Group cards grid */}
      {filtered.length > 0 && (
        <div className={editingId ? 'grid-1' : 'grid-2-auto'} style={{ gap: '14px' }}>
          {filtered.map(group => {
            const ts = TYPE_STYLE[group.type]
            const isEditing = editingId === group.id
            return (
              <div key={group.id} style={{ backgroundColor: isEditing ? 'rgba(200,155,60,0.06)' : '#161b22', borderRadius: '12px', border: `1px solid ${isEditing ? 'rgba(200,155,60,0.3)' : 'rgba(255,255,255,0.06)'}`, padding: '18px 20px', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, overflow: 'hidden' }}>
                    {group.img ? <img src={group.img} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👥'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{group.name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Active {group.lastActivity}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: ts.bg, color: ts.color, flexShrink: 0 }}>{group.type}</span>
                </div>
                {group.description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '12px', fontStyle: 'italic' }}>{group.description}</div>}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{group.members}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Members</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#e6edf3' }}>{(group.admins ?? []).length}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Admins</div>
                  </div>
                  {group.founded && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3' }}>{new Date(group.founded).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Founded</div>
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {confirmDeleteId === group.id ? (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, flex: 1 }}>Delete "{group.name}"? This cannot be undone.</span>
                      <button onClick={() => deleteGroup(group.id)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setEditingId(isEditing ? null : group.id)} style={adminActionBtn(isEditing ? 'var(--color-gold)' : '#60a5fa')}>{isEditing ? '← Close' : '✏ Edit'}</button>
                      <button onClick={() => { setConfirmDeleteId(group.id); setEditingId(null) }} style={adminActionBtn('#f87171')}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editingGroup && <EditPanel group={editingGroup} onSave={saveGroup} onClose={() => setEditingId(null)} />}
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={handleGroupCreated} />}
    </div>
  )
}
