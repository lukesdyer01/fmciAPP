import { useState } from 'react'
import { api } from '../api-client/server'
import { invitationLink, type Invitation } from '../lib/invitations'

export default function InviteMembersView() {
  const [email, setEmail] = useState('')
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const link = invitation ? invitationLink(invitation) : ''

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setCopied(false)
    setInvitation(null)
    try {
      setInvitation(await api<Invitation>('/invitations', { method: 'POST', body: JSON.stringify({ email }) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(message.includes('409')
        ? 'An invitation already exists for this email. Ask an administrator to replace it.'
        : 'Unable to create an invitation. Please try again or contact an administrator.')
    } finally { setBusy(false) }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setError('')
    } catch {
      setError('Select and copy the link below to share it.')
    }
  }

  const fieldStyle = { width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--color-surface)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', fontSize: '16px' }
  const buttonStyle = { padding: '12px 18px', borderRadius: '8px', background: 'var(--color-navy)', color: '#fff', cursor: 'pointer', border: 0, fontWeight: 700 }

  return <section style={{ maxWidth: '680px', margin: '0 auto', padding: '24px', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px' }}>
    <div style={{ fontSize: '32px', marginBottom: '12px' }} aria-hidden="true">✉️</div>
    <h1 style={{ margin: '0 0 10px', fontSize: '24px', color: 'var(--color-text-1)' }}>Invite someone</h1>
    <p style={{ color: 'var(--color-text-2)', lineHeight: 1.6 }}>Know someone who belongs in the FMCI community? Create a personal invitation and share the link with them.</p>
    <p style={{ color: 'var(--color-text-3)', fontSize: '13px', lineHeight: 1.6 }}>Each link is for one email address, works once, and expires after seven days. Share it privately with someone you know.</p>
    <form onSubmit={createInvitation} style={{ display: 'grid', gap: '12px', marginTop: '24px' }}>
      <label htmlFor="member-invite-email" style={{ fontWeight: 600 }}>Their email address</label>
      <input id="member-invite-email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@church.org" style={fieldStyle} />
      <button disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.6 : 1 }}>{busy ? 'Creating link…' : 'Create invite link'}</button>
    </form>
    {error && <p role="alert" style={{ color: 'var(--color-red)', fontSize: '14px' }}>{error}</p>}
    {invitation && <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '20px' }}>
      <p role="status" style={{ color: 'var(--color-green)', fontWeight: 700 }}>Your invite link is ready</p>
      <p style={{ fontSize: '13px', color: 'var(--color-text-2)' }}>For {invitation.email} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
      <label htmlFor="member-invite-link" style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Invitation link</label>
      <textarea id="member-invite-link" readOnly value={link} rows={4} onFocus={e => e.currentTarget.select()} style={{ ...fieldStyle, resize: 'vertical' }} />
      <button type="button" onClick={copyLink} style={{ ...buttonStyle, marginTop: '12px' }}>{copied ? 'Copied!' : 'Copy invite link'}</button>
      <p style={{ fontSize: '12px', color: 'var(--color-text-3)' }}>Copy it before leaving this page. Opening the link fills in their invitation at signup.</p>
    </div>}
  </section>
}
