import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { openExternal } from '../lib/openExternal'
import AccountExitActions from './AccountExitActions'

export default function AdultMembershipGate() {
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.updateUser({ data: { age18_confirmed: true, community_rules_version: '2026-10-17' } })
    if (error) { setError('Unable to save your confirmation. Please try again.'); setBusy(false) }
  }
  return <div style={{ minHeight: '100vh', background: 'var(--color-navy)', padding: 'calc(50px + var(--safe-top)) 24px', boxSizing: 'border-box', color: '#fff' }}>
    <div style={{ maxWidth: '440px', margin: '0 auto' }}>
      <h1>Welcome to FMCI Network</h1>
      <p style={{ lineHeight: 1.7 }}>FMCI Network is a free, invitation-only community for adults aged 18 and older. Please confirm your eligibility to continue.</p>
      <form onSubmit={submit}>
        <label style={{ display: 'flex', gap: '12px', lineHeight: 1.6, alignItems: 'start' }}><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: '6px', width: '20px', height: '20px', flexShrink: 0 }} />I confirm I am at least 18 and will follow the community rules.</label>
        <button type="button" onClick={() => openExternal('https://fmci.network/terms/')} style={{ border: 0, background: 'none', color: 'var(--color-gold)', padding: '12px 0', cursor: 'pointer' }}>Read the community rules</button>
        <button disabled={!confirmed || busy} style={{ width: '100%', padding: '14px', background: 'var(--color-gold)', border: 0, borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Continue'}</button>
      </form>
      {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
      <p>Need help? <a href="mailto:luke@dyerplex.com" style={{ color: '#fff' }}>Contact Luke Dyer</a></p>
      <AccountExitActions />
    </div>
  </div>
}
