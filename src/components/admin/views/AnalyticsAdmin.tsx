import { useEffect, useState } from 'react'
import { api } from '../../../api-client/server'

interface AnalyticsSummary {
  totals: { sessions: number; pageViews: number; uniqueVisitors: number; avgSessionMinutes: number }
  byDevice: { desktop: number; mobile: number; tablet: number }
  byBrowser: { name: string; count: number }[]
  byOS: { name: string; count: number }[]
  byCountry: { name: string; count: number }[]
  topPages: { view: string; count: number }[]
  dailyTrend: { date: string; sessions: number; pageViews: number }[]
}

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#161b22', borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.06)', padding: '18px 20px',
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ backgroundColor: '#161b22', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
      <div style={{ fontSize: '26px', fontWeight: 900, color, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</div>
    </div>
  )
}

function BarList({ title, rows, color }: { title: string; rows: { name: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...rows.map(r => r.count))
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: '#e6edf3', marginBottom: '14px' }}>{title}</div>
      {rows.length === 0 && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map(r => (
          <div key={r.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{r.name}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{r.count}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(r.count / max) * 100}%`, backgroundColor: color, borderRadius: '3px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalyticsAdmin() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AnalyticsSummary>('/analytics/summary').then(setSummary).catch(e => setError(e.message ?? 'Failed to load analytics'))
  }, [])

  if (error) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#f87171', fontSize: '14px' }}>{error}</div>
  }
  if (!summary) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading analytics…</div>
  }

  const deviceRows = [
    { name: 'Desktop', count: summary.byDevice.desktop },
    { name: 'Mobile', count: summary.byDevice.mobile },
    { name: 'Tablet', count: summary.byDevice.tablet },
  ]

  // Last 30 of the rolling 90-day window — the full range is collected, just
  // not all plotted at once to avoid an overcrowded chart.
  const recentTrend = summary.dailyTrend.slice(-30)
  const trendMax = Math.max(1, ...recentTrend.map(d => d.sessions))

  return (
    <div>
      <div className="grid-stats-4" style={{ marginBottom: '20px' }}>
        <StatCard label="Sessions" value={summary.totals.sessions} color="var(--color-gold)" />
        <StatCard label="Page Views" value={summary.totals.pageViews} color="#60a5fa" />
        <StatCard label="Unique Visitors" value={summary.totals.uniqueVisitors} color="#a78bfa" />
        <StatCard label="Avg. Time on Site" value={`${summary.totals.avgSessionMinutes}m`} color="#34d399" />
      </div>

      <div style={{ ...CARD_STYLE, marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#e6edf3', marginBottom: '14px' }}>Sessions — last 30 days</div>
        {recentTrend.length === 0 || summary.totals.sessions === 0 ? (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '90px' }}>
            {recentTrend.map(d => (
              <div key={d.date} title={`${d.date}: ${d.sessions} sessions, ${d.pageViews} page views`} style={{
                flex: 1, minWidth: '2px', height: `${Math.max(2, (d.sessions / trendMax) * 100)}%`,
                backgroundColor: 'var(--color-gold)', borderRadius: '2px 2px 0 0', opacity: d.sessions > 0 ? 1 : 0.15,
              }} />
            ))}
          </div>
        )}
      </div>

      <div className="grid-2-lg" style={{ marginBottom: '20px' }}>
        <BarList title="Device" rows={deviceRows} color="#60a5fa" />
        <BarList title="Browser" rows={summary.byBrowser} color="#a78bfa" />
        <BarList title="Operating System" rows={summary.byOS} color="#34d399" />
        <BarList title="Country" rows={summary.byCountry} color="var(--color-gold)" />
      </div>

      <BarList title="Top Pages" rows={summary.topPages.map(p => ({ name: p.view, count: p.count }))} color="#f87171" />
    </div>
  )
}
