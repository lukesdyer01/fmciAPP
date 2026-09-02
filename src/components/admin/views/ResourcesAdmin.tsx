import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api-client/server'
import CreateResourceModal from '../../CreateResourceModal'
import type { Resource } from '../../ResourcesView'

const TYPES = ['Book', 'Video', 'Podcast']

function adminActionBtn(color: string): React.CSSProperties {
  return { flex: 1, padding: '7px 10px', borderRadius: '7px', border: `1px solid ${color}30`, backgroundColor: color + '12', color, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }
}

export default function ResourcesAdmin() {
  const [resources, setResources] = useState<Resource[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api<Resource[]>('/resources').then(setResources).catch(() => setResources([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = resources.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.author ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || r.type === typeFilter
    return matchSearch && matchType
  })

  async function deleteResource(id: string) {
    try {
      await api(`/resources/${id}`, { method: 'DELETE' })
      setResources(rs => rs.filter(r => r.id !== id))
    } catch {
      // leave list as-is; the delete failed server-side
    }
    setConfirmDeleteId(null)
  }

  return (
    <div>
      {/* Summary row */}
      <div className="grid-stats-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Resources', value: resources.length, color: 'var(--color-gold)' },
          { label: 'Published as FMCI', value: resources.filter(r => !r.createdBy).length, color: '#60a5fa' },
          { label: 'FMCI Recommended', value: resources.filter(r => r.recommended).length, color: '#a78bfa' },
          { label: 'Total Reviews', value: resources.reduce((sum, r) => sum + (r.reviews ?? 0), 0), color: '#22c55e' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {(['all', ...TYPES] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${typeFilter === t ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`, backgroundColor: typeFilter === t ? 'rgba(200,155,60,0.1)' : 'transparent', color: typeFilter === t ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
        <button onClick={() => setShowCreate(true)} style={{ marginLeft: 'auto', padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-gold)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>+ Add Resource</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Loading resources…</div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>📚</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
            {search ? 'No resources match your search' : 'No resources yet'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            {search ? 'Try a different title or author.' : 'Add the first resource to the library.'}
          </div>
        </div>
      )}

      {/* Resource cards grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid-2-auto" style={{ gap: '14px' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '38px', height: '50px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, overflow: 'hidden' }}>
                  {r.img ? <img src={r.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📚'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>{r.title}</span>
                    {r.recommended && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', backgroundColor: 'rgba(200,155,60,0.15)', color: 'var(--color-gold)' }}>★ Recommended</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    {[r.type, r.category].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: '11px', color: !r.createdBy ? '#60a5fa' : 'var(--color-gold)', marginTop: '2px' }}>
                    {!r.createdBy ? '🏛 Published by FMCI' : r.submittedByName ? `Shared by ${r.submittedByName}` : 'Individual submission'}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{r.rating > 0 ? `★ ${r.rating}` : 'No reviews'}</span>
              </div>
              {r.description && (
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</p>
              )}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                {confirmDeleteId === r.id ? (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#f87171', fontWeight: 600, flex: 1 }}>Delete "{r.title}"? This cannot be undone.</span>
                    <button onClick={() => deleteResource(r.id)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingResource(r)} style={adminActionBtn('#60a5fa')}>✏ Edit</button>
                    <button onClick={() => setConfirmDeleteId(r.id)} style={adminActionBtn('#f87171')}>🗑 Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateResourceModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}
      {editingResource && (
        <CreateResourceModal resource={editingResource} onClose={() => setEditingResource(null)} onSaved={() => { setEditingResource(null); load() }} />
      )}
    </div>
  )
}
