import { useState } from 'react'
import { api } from '../../../api-client/server'

export default function SettingsAdmin() {
  const [email, setEmail] = useState('')
  const [invitation, setInvitation] = useState<{ email: string; token: string; expiresAt: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function createInvitation(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInvitation(null)
    try {
      setInvitation(await api('/admin/invitations', { method: 'POST', body: JSON.stringify({ email }) }))
    } catch {
      setError('Unable to create invitation. Check your admin access and try again.')
    } finally { setBusy(false) }
  }
  return <div style={{ maxWidth: '760px', color: '#e6edf3' }}>
    <section style={{ background: '#161b22', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ marginTop: 0 }}>Registration &amp; Access</h2>
      <p>FMCI Network is invite only. Existing members can continue to sign in.</p>
      <p style={{ color: '#adb5c0', fontSize: '13px' }}>Create a code for a specific email address and share it privately. Codes expire after seven days and can be used once. Creating another code for the same email replaces the previous invitation.</p>
      <form onSubmit={createInvitation} style={{ display: 'grid', gap: '12px' }}>
        <label htmlFor="invite-email">New member’s email</label>
        <input id="invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="member@church.org" style={{ padding: '12px', borderRadius: '8px', background: '#0d1117', color: '#fff', border: '1px solid #444' }} />
        <button disabled={busy} style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-gold)', color: '#111', cursor: 'pointer', border: 0 }}>{busy ? 'Creating…' : 'Create invitation'}</button>
      </form>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      {invitation && <div role="status" style={{ marginTop: '20px' }}>
        <p>Invitation for {invitation.email} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
        <textarea aria-label="Invitation message" readOnly rows={6} value={`You’re invited to FMCI Network! Visit https://fmci.network and choose Accept invitation. Use ${invitation.email} and this code:\n\n${invitation.token}`} style={{ width: '100%', padding: '12px', background: '#0d1117', color: '#fff', border: '1px solid #444', borderRadius: '8px', boxSizing: 'border-box' }} />
        <p style={{ fontSize: '12px', color: '#adb5c0' }}>Copy and share this message privately. The code is shown only here.</p>
      </div>}
    </section>
  </div>
}
