import { useState } from 'react'
import {
  REPORT_REASONS,
  useReports,
  useUpdateReportStatus,
  type ContentReport,
  type ReportStatus,
} from '../../../api-client/moderation'

const REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map(r => [r.value, r.label]))

const STATUS_STYLE: Record<ReportStatus, { bg: string; color: string }> = {
  open: { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  actioned: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  dismissed: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' },
}

const TARGET_LABEL: Record<string, string> = {
  post: 'a post',
  comment: 'a comment',
  user: 'a member',
  message: 'a message',
}

// The review queue for member reports. This is the only place the reason and
// the reporter's note are ever read — without it a report is written to the
// store and seen by nobody.
export default function ModerationAdmin() {
  const { data: reports, isLoading } = useReports()
  const updateStatus = useUpdateReportStatus()
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open')
  const [selected, setSelected] = useState<string | null>(null)

  const all = reports ?? []
  const filtered = all.filter(r => filter === 'all' || r.status === filter)
  const detail = all.find(r => r.id === selected)

  function setReportStatus(id: string, status: ReportStatus) {
    updateStatus.mutate({ id, status }, { onSuccess: () => setSelected(null) })
  }

  return (
    <div className={detail ? 'grid-aside-400' : 'grid-1'}>
      {/* List */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', alignItems: 'center' }}>
          {(['open', 'actioned', 'dismissed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 16px', borderRadius: '8px',
              border: `1px solid ${filter === f ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.08)'}`,
              backgroundColor: filter === f ? 'rgba(200,155,60,0.1)' : 'transparent',
              color: filter === f ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', textTransform: 'capitalize',
            }}>
              {f} {f !== 'all' && `(${all.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Loading reports…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🕊</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
                {filter === 'open' ? 'Nothing waiting for review' : `No ${filter} reports`}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Content reported by members lands here, with the reason they gave.
              </div>
            </div>
          )}
          {!isLoading && filtered.map(report => {
            const isSelected = selected === report.id
            const status = STATUS_STYLE[report.status] ?? STATUS_STYLE.dismissed
            return (
              <div key={report.id} onClick={() => setSelected(isSelected ? null : report.id)} style={{
                backgroundColor: '#161b22', borderRadius: '12px',
                border: `1px solid ${isSelected ? 'rgba(200,155,60,0.4)' : 'rgba(255,255,255,0.06)'}`,
                padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
                opacity: report.status !== 'open' ? 0.65 : 1,
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1.2 }}>🚩</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>
                        {REASON_LABEL[report.reason] ?? report.reason}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '8px', backgroundColor: status.bg, color: status.color, textTransform: 'capitalize' }}>{report.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                      {report.reporter?.name ?? 'A member'} reported {TARGET_LABEL[report.targetType] ?? report.targetType}
                      {report.targetAuthor ? ` by ${report.targetAuthor.name}` : ''}
                    </div>
                    {report.note && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px', lineHeight: 1.5 }}>“{report.note}”</div>
                    )}
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {report.status === 'open' && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button disabled={updateStatus.isPending} onClick={() => setReportStatus(report.id, 'actioned')} style={actionBtn('rgba(34,197,94,0.3)', 'rgba(34,197,94,0.1)', '#22c55e', updateStatus.isPending)}>Actioned</button>
                      <button disabled={updateStatus.isPending} onClick={() => setReportStatus(report.id, 'dismissed')} style={actionBtn('rgba(255,255,255,0.12)', 'transparent', 'rgba(255,255,255,0.45)', updateStatus.isPending)}>Dismiss</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      {detail && <ReportDetail report={detail} onClose={() => setSelected(null)} onSetStatus={setReportStatus} busy={updateStatus.isPending} />}
    </div>
  )
}

function ReportDetail({ report, onClose, onSetStatus, busy }: {
  report: ContentReport
  onClose: () => void
  onSetStatus: (id: string, status: ReportStatus) => void
  busy: boolean
}) {
  const preview = report.targetPreview
  return (
    <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(200,155,60,0.2)', padding: '22px', height: 'fit-content', position: 'sticky', top: '80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>Report Detail</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
      </div>

      <Section label="Reason">
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{REASON_LABEL[report.reason] ?? report.reason}</p>
      </Section>

      <Section label="What the reporter said">
        <p style={{ margin: 0, fontSize: '13px', color: report.note ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {report.note || 'No note was left.'}
        </p>
      </Section>

      <Section label="Reported content">
        {preview ? (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px' }}>
            {preview.kind === 'comment' && preview.postText && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px', lineHeight: 1.5 }}>
                On a post reading “{preview.postText.slice(0, 120)}{preview.postText.length > 120 ? '…' : ''}”
              </div>
            )}
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{preview.text || '(no text)'}</p>
            {preview.image && (
              <img src={preview.image} alt="" style={{ width: '100%', marginTop: '10px', borderRadius: '8px', display: 'block' }} />
            )}
            {preview.createdAt && (
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>
                Posted {new Date(preview.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            {report.targetType === 'post' || report.targetType === 'comment'
              ? 'This content has since been deleted.'
              : `A ${report.targetType} was reported; it is not shown here.`}
          </p>
        )}
      </Section>

      <Section label="Reported member">
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{report.targetAuthor?.name ?? '—'}</p>
      </Section>

      <Section label="Reported by">
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
          {report.reporter?.name ?? '—'} · {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </Section>

      {report.status === 'open' ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          <button disabled={busy} onClick={() => onSetStatus(report.id, 'actioned')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '13px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}>✓ Mark actioned</button>
          <button disabled={busy} onClick={() => onSetStatus(report.id, 'dismissed')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}>Dismiss</button>
        </div>
      ) : (
        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Reviewed{report.reviewedAt ? ` ${new Date(report.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </span>
          <button disabled={busy} onClick={() => onSetStatus(report.id, 'open')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}>Reopen</button>
        </div>
      )}
    </div>
  )
}

function actionBtn(border: string, bg: string, color: string, busy: boolean): React.CSSProperties {
  return {
    padding: '6px 14px', borderRadius: '7px', border: `1px solid ${border}`, backgroundColor: bg, color,
    fontSize: '12px', fontWeight: 700, cursor: busy ? 'default' : 'pointer',
    fontFamily: 'var(--font-sans)', opacity: busy ? 0.6 : 1,
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}
