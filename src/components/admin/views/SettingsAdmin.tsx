import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api-client/server'
import { networkSettingsKey, type NetworkSettings } from '../../../api-client/features'
import { useAuth } from '../../../providers/AuthProvider'
import { invitationLink } from '../../../lib/invitations'

export default function SettingsAdmin() {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const isSuperAdmin = currentUser?.platformRole === 'superadmin'
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useQuery({
    queryKey: networkSettingsKey,
    queryFn: () => api<NetworkSettings>('/settings'),
  })
  const storiesMutation = useMutation({
    mutationFn: (photoStoriesEnabled: boolean) => api<NetworkSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ photoStoriesEnabled }),
    }),
    onSuccess: updated => queryClient.setQueryData(networkSettingsKey, updated),
  })
  const [email, setEmail] = useState('')
  const [invitation, setInvitation] = useState<{ email: string; token: string; expiresAt: string } | null>(null)
  const [openInvitation, setOpenInvitation] = useState<{ token: string; expiresAt: string } | null>(null)
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
  async function createOpenInvitation() {
    setBusy(true)
    setError('')
    setOpenInvitation(null)
    try {
      setOpenInvitation(await api('/admin/invitations/open', { method: 'POST', body: JSON.stringify({}) }))
    } catch {
      setError('Unable to create a registration link. Check your super admin access and try again.')
    } finally { setBusy(false) }
  }
  return <div style={{ maxWidth: '760px', color: '#e6edf3' }}>
    {isSuperAdmin && <section style={{ background: '#161b22', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
      <h2 style={{ marginTop: 0 }}>Feature controls</h2>
      <p style={{ color: '#adb5c0', fontSize: '13px' }}>Turn photo Stories on or off for everyone in FMCI Network.</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: storiesMutation.isPending ? 'wait' : 'pointer' }}>
        <input
          type="checkbox"
          checked={settings?.photoStoriesEnabled ?? true}
          disabled={settingsLoading || !settings || storiesMutation.isPending}
          onChange={event => storiesMutation.mutate(event.target.checked)}
          aria-label="Enable photo Stories for all members"
        />
        <span>{settings?.photoStoriesEnabled === false ? 'Photo Stories are off' : 'Photo Stories are on'}</span>
      </label>
      {(settingsError || storiesMutation.isError) && <p role="alert" style={{ color: '#fca5a5' }}>Unable to update this setting. Please try again.</p>}
      {storiesMutation.isSuccess && <p role="status" style={{ color: '#86efac' }}>Story setting saved.</p>}
    </section>}
    <section style={{ background: '#161b22', borderRadius: '12px', padding: '24px' }}>
      <h2 style={{ marginTop: 0 }}>Registration &amp; Access</h2>
      <p>FMCI Network is invite only. Existing members can continue to sign in.</p>
      <p style={{ color: '#adb5c0', fontSize: '13px' }}>Members can invite people from Invite someone in the main navigation. Admins can also create or replace an invitation here. Email-specific links expire after seven days and can be used once.</p>
      <form onSubmit={createInvitation} style={{ display: 'grid', gap: '12px' }}>
        <label htmlFor="invite-email">New member’s email</label>
        <input id="invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="member@church.org" style={{ padding: '12px', borderRadius: '8px', background: '#0d1117', color: '#fff', border: '1px solid #444' }} />
        <button disabled={busy} style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-gold)', color: '#111', cursor: 'pointer', border: 0 }}>{busy ? 'Creating…' : 'Create invitation'}</button>
      </form>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      {invitation && <div role="status" style={{ marginTop: '20px' }}>
        <p>Invitation for {invitation.email} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
        <textarea aria-label="Invitation message" readOnly rows={6} value={`You’re invited to FMCI Network! Use ${invitation.email} to join:\n\n${invitationLink(invitation)}`} style={{ width: '100%', padding: '12px', background: '#0d1117', color: '#fff', border: '1px solid #444', borderRadius: '8px', boxSizing: 'border-box' }} />
        <p style={{ fontSize: '12px', color: '#adb5c0' }}>Copy and share this message privately. The code is shown only here.</p>
      </div>}
      {isSuperAdmin && <div style={{ borderTop: '1px solid #30363d', marginTop: '24px', paddingTop: '20px' }}>
        <h3 style={{ marginTop: 0 }}>General registration link</h3>
        <p style={{ color: '#adb5c0', fontSize: '13px' }}>Create a link that does not require an email match. Anyone with it can register once within seven days.</p>
        <button type="button" disabled={busy} onClick={createOpenInvitation} style={{ padding: '12px', borderRadius: '8px', background: 'var(--color-gold)', color: '#111', cursor: busy ? 'wait' : 'pointer', border: 0 }}>{busy ? 'Creating…' : 'Generate registration link'}</button>
        {openInvitation && <div role="status" style={{ marginTop: '16px' }}>
          <p>Link expires {new Date(openInvitation.expiresAt).toLocaleDateString()} · one registration</p>
          <textarea aria-label="General registration link" readOnly rows={3} value={invitationLink(openInvitation)} onFocus={event => event.currentTarget.select()} style={{ width: '100%', padding: '12px', background: '#0d1117', color: '#fff', border: '1px solid #444', borderRadius: '8px', boxSizing: 'border-box' }} />
          <p style={{ fontSize: '12px', color: '#adb5c0' }}>Share privately. The link grants one person access to create an account.</p>
        </div>}
      </div>}
    </section>
  </div>
}
