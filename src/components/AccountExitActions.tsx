import { useState } from 'react'
import { api } from '../api-client/server'
import { supabase } from '../lib/supabase'

export default function AccountExitActions() {
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function remove() {
    if (confirmation !== 'DELETE') return
    setBusy(true); setError('')
    try {
      await api('/me', { method: 'DELETE' })
      await supabase.auth.signOut({ scope: 'local' })
      window.location.replace('/')
    } catch { setError('Unable to delete your account. Retry or contact luke@dyerplex.com.'); setBusy(false) }
  }
  const button = { border: 0, background: 'none', color: '#d5dce8', cursor: 'pointer', padding: '10px', fontSize: '13px' }
  return <div style={{ marginTop: '20px', color: '#fff', textAlign: 'center' }}>
    <button type="button" disabled={busy} style={button} onClick={() => supabase.auth.signOut({ scope: 'local' })}>Sign out</button>
    <button type="button" disabled={busy} style={button} onClick={() => setConfirming(!confirming)}>Delete account</button>
    {confirming && <div style={{ textAlign: 'left', padding: '16px', border: '1px solid #79434b', borderRadius: '10px', background: '#291c28' }}>
      <p>Delete this account and its uploads and contributions permanently? Type DELETE to confirm. This cannot be undone.</p>
      <input aria-label="Type DELETE to delete your account" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" style={{ width: '100%', padding: '10px', color: '#111', background: '#fff', borderRadius: '6px', boxSizing: 'border-box' }} />
      <button type="button" disabled={busy || confirmation !== 'DELETE'} onClick={remove} style={{ ...button, color: '#fca5a5' }}>{busy ? 'Deleting…' : 'Permanently delete account'}</button>
    </div>}
    {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
  </div>
}
