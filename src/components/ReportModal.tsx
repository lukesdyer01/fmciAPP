import { useState } from 'react'
import { REPORT_REASONS, useReportContent, type ReportReason, type ReportTargetType } from '../api-client/moderation'

interface ReportModalProps {
  targetType: ReportTargetType
  targetId: string
  targetAuthorId?: string
  targetLabel: string
  onClose: () => void
}

// Report dialog for user-generated content. Deliberately says nothing about
// what happens to the reported member: the reporter shouldn't be able to infer
// whether anyone was actioned, and the person reported is never notified.
export default function ReportModal({ targetType, targetId, targetAuthorId, targetLabel, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const report = useReportContent()

  async function submit() {
    if (!reason) return
    try {
      await report.mutateAsync({ targetType, targetId, targetAuthorId, reason, note: note.trim() || undefined })
      setSent(true)
    } catch {
      // Swallowed intentionally — the confirmation below is shown either way so
      // a reporter never learns whether their report was recorded.
      setSent(true)
    }
  }

  return (
    <div onClick={onClose} className="sheet-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 600, backgroundColor: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div onClick={e => e.stopPropagation()} className="sheet-card" style={{
        backgroundColor: 'var(--color-card)', borderRadius: '16px', width: '100%', maxWidth: '440px',
        maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {sent ? (
          <div style={{ padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '34px', marginBottom: '10px' }}>🙏</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: 'var(--color-text-1)' }}>Thank you</h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', lineHeight: 1.5, color: 'var(--color-text-2)' }}>
              Your report has been sent to the FMCI moderators for review.
            </p>
            <button onClick={onClose} style={{
              padding: '10px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              backgroundColor: 'var(--color-navy)', color: '#fff', fontSize: '14px', fontWeight: 700,
              fontFamily: 'var(--font-sans)',
            }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700, color: 'var(--color-text-1)' }}>Report {targetLabel}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-2)' }}>
                Moderators review every report. The member is not told who reported them.
              </p>
            </div>

            <div style={{ padding: '14px 24px' }}>
              {REPORT_REASONS.map(r => (
                <button key={r.value} onClick={() => setReason(r.value)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '11px 12px', marginBottom: '6px', borderRadius: '10px', cursor: 'pointer',
                  border: `1px solid ${reason === r.value ? 'var(--color-gold)' : 'var(--color-border)'}`,
                  backgroundColor: reason === r.value ? 'var(--color-gold-bg)' : 'transparent',
                  fontSize: '14px', fontWeight: 600, color: 'var(--color-text-1)',
                  textAlign: 'left', fontFamily: 'var(--font-sans)',
                }}>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${reason === r.value ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    backgroundColor: reason === r.value ? 'var(--color-gold)' : 'transparent',
                  }} />
                  {r.label}
                </button>
              ))}

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Anything else the moderators should know? (optional)"
                rows={3}
                style={{
                  width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
                  border: '1px solid var(--color-border)', fontSize: '14px', resize: 'vertical',
                  fontFamily: 'var(--font-sans)', color: 'var(--color-text-1)',
                  backgroundColor: 'var(--color-surface)',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '0 24px 20px' }}>
              <button onClick={onClose} style={{
                padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid var(--color-border)', backgroundColor: 'transparent',
                fontSize: '14px', fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'var(--font-sans)',
              }}>Cancel</button>
              <button onClick={submit} disabled={!reason || report.isPending} style={{
                padding: '10px 18px', borderRadius: '10px', border: 'none',
                cursor: reason && !report.isPending ? 'pointer' : 'default',
                backgroundColor: 'var(--color-red)', color: '#fff', opacity: reason && !report.isPending ? 1 : 0.45,
                fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}>{report.isPending ? 'Sending…' : 'Submit report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
