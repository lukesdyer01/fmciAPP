import { useState, useEffect } from 'react'
import { api } from '../api-client/server'
import { useAuth } from '../providers/AuthProvider'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'
import CreateResourceModal from './CreateResourceModal'

export interface Resource {
  id: string
  title: string
  author: string
  type: string
  category: string
  rating: number
  reviews: number
  img: string
  url?: string
  description: string
  tags: string[]
  recommended: boolean
  createdBy: string
  submittedByName?: string
}

const CATEGORIES = ['All', 'Apostolic Teaching', 'Leadership', 'Prayer', 'Missions', 'Marketplace', 'Discipleship']
const TYPES = ['All', 'Books', 'Courses', 'Series', 'Podcasts', 'Articles']

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Book:    { bg: '#EFF6FF', color: '#1D4ED8' },
  Series:  { bg: '#F5F3FF', color: '#6D28D9' },
  Course:  { bg: '#ECFDF5', color: '#047857' },
  Podcast: { bg: '#FFF7ED', color: '#C2410C' },
  Article: { bg: '#F0F9FF', color: '#0369A1' },
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#CBD5E1', fontSize: '14px' }}>★</span>
      ))}
      <span style={{ fontSize: '13px', color: 'var(--color-text-2)', marginLeft: '5px', fontWeight: 600 }}>{rating}</span>
    </span>
  )
}

export default function ResourcesView() {
  const { currentUser } = useAuth()
  const { role } = useSupabaseRole()
  const [category, setCategory] = useState('All')
  const [type, setType] = useState('All')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    api<Resource[]>('/resources').then(setResources).catch(() => setResources([])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    try {
      await api(`/resources/${id}`, { method: 'DELETE' })
      setResources(rs => rs.filter(r => r.id !== id))
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const filtered = resources.filter(r => {
    const matchType = type === 'All' || r.type === type || (type === 'Books' && r.type === 'Book') || (type === 'Courses' && r.type === 'Course') || (type === 'Series' && r.type === 'Series') || (type === 'Podcasts' && r.type === 'Podcast') || (type === 'Articles' && r.type === 'Article')
    const matchCat = category === 'All' || r.category === category
    return matchType && matchCat
  })

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)',
        borderRadius: '14px', padding: '24px 28px', marginBottom: '20px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.05 }}>📚</div>
        <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-sans)' }}>
          Resource Library
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
          Curated books, courses, and teachings from FMCI leaders and trusted apostolic voices.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { n: String(resources.length), label: 'Resources' },
            { n: String(resources.filter(r => r.recommended).length), label: 'Recommended', gold: true },
          ].map((s, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: '10px',
              padding: '10px 20px', textAlign: 'center', minWidth: '80px',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: s.gold ? 'var(--color-gold-light)' : '#fff' }}>{s.n}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
          <button onClick={() => setShowCreate(true)} style={{
            marginLeft: 'auto', padding: '10px 20px', borderRadius: '10px', border: 'none',
            backgroundColor: 'var(--color-gold)', color: '#fff', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>+ Add Resource</button>
        </div>
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, flexShrink: 0,
            backgroundColor: type === t ? 'var(--color-navy)' : 'var(--color-card)',
            color: type === t ? '#fff' : 'var(--color-text-1)',
            border: type === t ? '1px solid transparent' : '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCategory(c)} style={{
            padding: '5px 14px', borderRadius: '20px', cursor: 'pointer', flexShrink: 0,
            fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
            border: `1.5px solid ${category === c ? 'var(--color-gold)' : 'var(--color-border)'}`,
            backgroundColor: category === c ? 'var(--color-gold-bg)' : 'transparent',
            color: category === c ? 'var(--color-gold)' : 'var(--color-text-1)',
            transition: 'all 0.15s',
          }}>{c}</button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-2)', fontSize: '14px' }}>Loading resources…</div>
      )}

      {/* Resource cards */}
      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(r => {
            const isSaved = saved.has(r.id)
            const canModify = currentUser?.id === r.createdBy || role === 'admin' || role === 'superadmin'
            const typeStyle = TYPE_COLORS[r.type] ?? { bg: 'var(--color-surface)', color: 'var(--color-text-2)' }
            return (
              <div key={r.id} style={{
                backgroundColor: 'var(--color-card)', borderRadius: '14px',
                border: `1px solid ${r.recommended ? 'var(--color-gold-border)' : 'var(--color-border)'}`,
                padding: '20px 22px', display: 'flex', gap: '20px', alignItems: 'flex-start',
                boxShadow: r.recommended ? '0 2px 14px rgba(200,155,60,0.1)' : '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {/* Cover */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {r.img
                    ? <img src={r.img} alt={r.title} style={{ width: '84px', height: '112px', objectFit: 'cover', borderRadius: '8px', display: 'block', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }} />
                    : <div style={{ width: '84px', height: '112px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>📚</div>
                  }
                  {r.recommended && (
                    <div style={{
                      position: 'absolute', top: '-7px', left: '-7px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      backgroundColor: 'var(--color-gold)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: '#fff', fontWeight: 900,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    }}>★</div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Type + category row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 800, padding: '2px 9px', borderRadius: '10px',
                      backgroundColor: typeStyle.bg, color: typeStyle.color,
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>{r.type}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-2)', fontWeight: 600 }}>{r.category}</span>
                    {r.recommended && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '10px',
                        backgroundColor: 'var(--color-gold-bg)', color: 'var(--color-gold)',
                        border: '1px solid var(--color-gold-border)',
                      }}>★ FMCI Recommended</span>
                    )}
                    {canModify && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                        <button onClick={() => setEditingResource(r)} title="Edit resource" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '14px', padding: '2px 6px' }}>✏</button>
                        <button onClick={() => setConfirmDeleteId(r.id)} title="Delete resource" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '15px', padding: '2px 6px' }}>🗑</button>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)', lineHeight: 1.3 }}>
                    {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{r.title}</a> : r.title}
                  </h3>

                  {/* Author */}
                  {r.author && (
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-1)', marginBottom: '2px' }}>
                      by {r.author}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--color-text-2)', marginBottom: '10px' }}>
                    {r.submittedByName ? `Shared by ${r.submittedByName}` : ''}
                  </div>

                  {/* Stars + reviews */}
                  {r.reviews > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>({r.reviews.toLocaleString()} reviews)</span>
                    </div>
                  )}

                  {/* Description */}
                  {r.description && (
                    <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--color-text-1)', lineHeight: 1.65 }}>
                      {r.description}
                    </p>
                  )}

                  {/* Tags + Save button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {r.tags.map((tag, j) => (
                        <span key={j} style={{
                          fontSize: '12px', fontWeight: 600, padding: '3px 11px', borderRadius: '12px',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-1)',
                          border: '1px solid var(--color-border)',
                        }}>{tag}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => setSaved(prev => {
                        const next = new Set(prev)
                        if (isSaved) next.delete(r.id); else next.add(r.id)
                        return next
                      })}
                      style={{
                        padding: '7px 16px', borderRadius: '9px', cursor: 'pointer', flexShrink: 0,
                        border: `1px solid ${isSaved ? 'var(--color-gold-border)' : 'var(--color-border)'}`,
                        backgroundColor: isSaved ? 'var(--color-gold-bg)' : 'var(--color-surface)',
                        color: isSaved ? 'var(--color-gold)' : 'var(--color-text-1)',
                        fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-sans)',
                        transition: 'all 0.15s',
                      }}
                    >{isSaved ? '🔖 Saved' : '+ Save'}</button>
                  </div>

                  {confirmDeleteId === r.id && (
                    <div style={{ marginTop: '12px', backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-red)', fontWeight: 600, flex: 1 }}>Delete "{r.title}"?</span>
                      <button onClick={() => handleDelete(r.id)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-2)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: 'var(--color-card)', borderRadius: '14px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '40px', marginBottom: '14px' }}>📚</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-text-1)', marginBottom: '8px' }}>
                {resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                {resources.length === 0 ? 'Be the first to share a book, course, or teaching with the network.' : 'Try a different category or type filter.'}
              </div>
            </div>
          )}
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
