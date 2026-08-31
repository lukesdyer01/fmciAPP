import { useState } from 'react'
import { api } from '../../../api-client/server'

interface FlaggedPost {
  id: string
  author: string
  avatar: string
  content: string
  reason: string
  reportCount: number
  reportedBy: string
  time: string
  type: 'post' | 'comment' | 'prayer'
  status: 'pending' | 'approved' | 'removed'
}

const FLAGGED: FlaggedPost[] = []

const REASON_COLOR: Record<string, string> = {
  'Hostile / threatening language': '#f87171',
  'Spam / financial solicitation': '#fb923c',
  'Suspected bot activity': '#f59e0b',
  'False report — appears legitimate': '#22c55e',
}

export default function ContentAdmin() {
  const [items, setItems] = useState(FLAGGED)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'removed'>('all')
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState('')
  const [sweeping, setSweeping] = useState(false)
  const [sweepResult, setSweepResult] = useState<{ removed: number; message: string } | null>(null)
  const [sweepError, setSweepError] = useState('')

  const filtered = items.filter(i => filter === 'all' || i.status === filter)

  const approve = (id: string) => setItems(is => is.map(i => i.id === id ? { ...i, status: 'approved' } : i))
  const remove  = (id: string) => setItems(is => is.map(i => i.id === id ? { ...i, status: 'removed' }  : i))

  async function clearAllPosts() {
    if (!window.confirm('Clear ALL posts from the feed? This cannot be undone.')) return
    setClearing(true)
    setClearMsg('')
    try {
      await api('/admin/clear-posts', { method: 'POST' })
      setClearMsg('Feed cleared — all posts removed.')
    } catch (e: any) {
      setClearMsg(`Error: ${e.message}`)
    } finally {
      setClearing(false)
    }
  }

  async function removeOrphanedPosts() {
    setSweeping(true)
    setSweepResult(null)
    setSweepError('')
    try {
      const data = await api<{ removed: number; message?: string }>('/admin/remove-orphaned-posts', { method: 'POST' })
      setSweepResult({ removed: data.removed ?? 0, message: data.message ?? `${data.removed ?? 0} orphaned post${data.removed === 1 ? '' : 's'} removed.` })
    } catch (e: any) {
      setSweepError(e.message ?? 'Failed to remove orphaned posts.')
    } finally {
      setSweeping(false)
    }
  }

  return (
    <div>
      {/* Feed management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>

        {/* Orphaned posts sweep */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🧹</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', marginBottom: '2px' }}>Orphaned Posts</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Remove posts whose author account no longer exists in the system.</div>
          </div>
          {sweepResult && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#86efac' }}>
              ✓ {sweepResult.removed} removed
            </div>
          )}
          {sweepError && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#fca5a5' }}>{sweepError}</div>
          )}
          <button
            onClick={removeOrphanedPosts}
            disabled={sweeping}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '12px', fontWeight: 700, cursor: sweeping ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: sweeping ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >{sweeping ? 'Scanning…' : 'Remove Orphaned'}</button>
        </div>

        {/* Clear all posts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🗑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', marginBottom: '2px' }}>Clear All Posts</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Permanently removes every post from the feed KV store.</div>
          </div>
          {clearMsg && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: clearMsg.startsWith('Error') ? '#fca5a5' : '#86efac' }}>{clearMsg}</div>
          )}
          <button
            onClick={clearAllPosts}
            disabled={clearing}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: clearing ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', opacity: clearing ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >{clearing ? 'Clearing…' : 'Clear All Posts'}</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Pending Review', value: items.filter(i => i.status === 'pending').length, color: '#f59e0b' },
          { label: 'Approved',       value: items.filter(i => i.status === 'approved').length, color: '#22c55e' },
          { label: 'Removed',        value: items.filter(i => i.status === 'removed').length,  color: '#f87171' },
          { label: 'Total Reports',  value: items.length, color: '#60a5fa' },
        ].map((s, i) => (
          <div key={i} style={{ backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
            <div style={{ fontSize: '24px', fontWeight: 900, color: s.color, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['all', 'pending', 'approved', 'removed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 16px', borderRadius: '8px',
            border: `1px solid ${filter === f ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
            backgroundColor: filter === f ? 'rgba(200,155,60,0.1)' : 'transparent',
            color: filter === f ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {/* Flagged content list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
              {filter === 'pending' ? 'No content pending review' : `No ${filter} reports`}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Flagged posts and comments will appear here when members report them.
            </div>
          </div>
        )}
        {filtered.map(item => {
          const reasonColor = REASON_COLOR[item.reason] ?? '#f59e0b'
          return (
            <div key={item.id} style={{
              backgroundColor: '#161b22', borderRadius: '12px',
              border: `1px solid ${item.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)'}`,
              padding: '18px 20px',
              opacity: item.status !== 'pending' ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                {item.avatar
                  ? <img src={item.avatar} alt={item.author} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0, backgroundColor: 'rgba(200,155,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', fontWeight: 800, fontSize: '12px' }}>{(item.author || '?').slice(0, 2).toUpperCase()}</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{item.author}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{item.type}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{item.time}</span>
                    {item.status !== 'pending' && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', backgroundColor: item.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: item.status === 'approved' ? '#22c55e' : '#f87171', textTransform: 'capitalize' }}>{item.status}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', borderLeft: `3px solid rgba(255,255,255,0.08)` }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>"{item.content}"</p>
              </div>

              {/* Report info */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', backgroundColor: reasonColor + '12', border: `1px solid ${reasonColor}25` }}>
                  <span style={{ fontSize: '11px' }}>⚑</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: reasonColor }}>{item.reason}</span>
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                  {item.reportCount} {item.reportCount === 1 ? 'report' : 'reports'} · {item.reportedBy}
                </div>
              </div>

              {item.status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => remove(item.id)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Remove Content
                  </button>
                  <button onClick={() => approve(item.id)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Approve — No Violation
                  </button>
                  <button style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    View Full Post
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
