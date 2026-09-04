import { useState } from 'react'
import { api } from '../../../api-client/server'

export default function ContentAdmin() {
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState('')
  const [sweeping, setSweeping] = useState(false)
  const [sweepResult, setSweepResult] = useState<{ removed: number; message: string } | null>(null)
  const [sweepError, setSweepError] = useState('')

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
  )
}
