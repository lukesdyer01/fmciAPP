import BetaFeedback from './BetaFeedback'
import NotificationPreferences from './NotificationPreferences'
import { useState } from 'react'
import { api } from '../api-client/server'
import { REPORT_REASONS } from '../api-client/moderation'
import PolicyView from './PolicyView'

export default function SafetySupportView() {
  const [reason, setReason] = useState('other')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      await api('/reports', { method: 'POST', body: JSON.stringify({ targetType: 'other', targetId: location.trim() || 'community-safety', reason, note: note.trim() }) })
      setMessage('Your report has been sent to the administrators for review.'); setNote(''); setLocation('')
    } catch { setError('Unable to send this report. Retry or email luke@dyerplex.com.') }
    finally { setBusy(false) }
  }
  const field = { display: 'block', width: '100%', padding: '12px', margin: '6px 0 16px', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-text-1)', background: 'var(--color-card)', boxSizing: 'border-box' as const, fontSize: '16px' }
  return <div style={{ maxWidth: '760px', margin: '0 auto' }}>
    <section style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
      <h1 style={{ marginTop: 0 }}>Safety &amp; Support</h1>
      <p>Report any post, photo, article, event/resource discussion, profile, or direct message here. Use the member or post menu to block unwanted contact. Administrators review reports; the reported member is not told who reported them.</p>
      <p>Support: Luke Dyer — <a href="mailto:luke@dyerplex.com">luke@dyerplex.com</a></p>
      <form onSubmit={submit}>
        <label>Reason<select style={field} value={reason} onChange={e => setReason(e.target.value)}>{REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <label>Content link or location (optional)<input value={location} maxLength={1000} onChange={e => setLocation(e.target.value)} placeholder="Page link, article/event title, or conversation details" style={field} /></label>
        <label>Describe the concern<textarea required minLength={20} maxLength={4000} rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Explain what happened and identify the content or member. Do not include passwords." style={field} /></label>
        <button disabled={busy} style={{ background: 'var(--color-navy)', color: '#fff', padding: '12px 20px', border: 0, borderRadius: '8px', cursor: 'pointer' }}>{busy ? 'Sending…' : 'Send safety report'}</button>
      </form>
      {message && <p role="status" style={{ color: 'var(--color-green-text)' }}>{message}</p>}
      {error && <p role="alert" style={{ color: 'var(--color-red-text)' }}>{error}</p>}
    </section>
    <BetaFeedback />
    <NotificationPreferences />
    <PolicyView kind="terms" />
  </div>
}
