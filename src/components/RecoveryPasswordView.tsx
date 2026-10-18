import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function RecoveryPasswordView({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (password !== repeat) { setError('Passwords must match.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setBusy(false); return }
    await supabase.auth.signOut({ scope: 'local' })
    onDone()
  }
  return <div style={{ minHeight: '100vh', background: 'var(--color-navy)', color: '#fff', padding: '60px 24px', boxSizing: 'border-box' }}>
    <div style={{ maxWidth: '420px', margin: 'auto' }}><h1>Set your new password</h1>
      {ready ? <form onSubmit={save} style={{ display: 'grid', gap: '16px' }}>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '6px', background: '#fff', color: '#111', border: 0, borderRadius: '8px', boxSizing: 'border-box' }} /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={repeat} onChange={e => setRepeat(e.target.value)} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '6px', background: '#fff', color: '#111', border: 0, borderRadius: '8px', boxSizing: 'border-box' }} /></label>
        <button disabled={busy} style={{ padding: '12px', background: 'var(--color-gold)', border: 0, borderRadius: '8px', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save password and return to sign in'}</button>
      </form> : <p>This recovery link is invalid or expired. Return to sign in and choose Forgot password to request another link.</p>}
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      <button disabled={busy} onClick={onDone} style={{ marginTop: '20px', padding: '10px 0', background: 'none', border: 0, color: '#fff', cursor: 'pointer' }}>Back to sign in</button>
    </div>
  </div>
}
