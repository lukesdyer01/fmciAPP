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

interface UserActivity {
  userId: string
  name: string
  avatarUrl: string
  sessions: number
  pageViews: number
  lastSeenAt: string
}

interface ActiveSiteUser {
  userId: string
  name: string
  avatarUrl: string
  title: string
  church: string
  lastActiveAt: string
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

function ActiveNowPanel() {
  const [users, setUsers] = useState<ActiveSiteUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const refresh = () => {
      api<ActiveSiteUser[]>('/analytics/active-users')
        .then(rows => { if (mounted) { setUsers(rows); setError('') } })
        .catch(e => { if (mounted) setError(e.message ?? 'Unable to load active users') })
        .finally(() => { if (mounted) setLoading(false) })
    }
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [])

  return (
    <section aria-labelledby="active-now-title" style={{ ...CARD_STYLE, marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span aria-hidden="true" style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#31c46c', boxShadow: '0 0 0 4px rgba(49,196,108,0.12)' }} />
        <h2 id="active-now-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#e6edf3' }}>Active now</h2>
        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(49,196,108,0.12)', color: '#55d887', fontSize: '12px', fontWeight: 800 }}>{users.length}</span>
        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>Refreshes every 30 seconds</span>
      </div>
      <p style={{ margin: '0 0 14px 19px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Members with activity in the last five minutes</p>
      {error && users.length === 0 && !loading ? (
        <div role="alert" style={{ color: '#f87171', fontSize: '13px' }}>{error}</div>
      ) : loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Checking who’s online…</div>
      ) : users.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No members are active right now.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '8px' }}>
          {users.map(user => {
            const elapsedMinutes = Math.floor((Date.now() - new Date(user.lastActiveAt).getTime()) / 60_000)
            const activity = elapsedMinutes < 1 ? 'Just now' : `${elapsedMinutes} min ago`
            return (
              <div key={user.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, padding: '9px', borderRadius: '9px', background: 'rgba(255,255,255,0.035)' }}>
                <span style={{ position: 'relative', flexShrink: 0 }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#303b4c', color: '#fff', fontSize: '11px', fontWeight: 800 }}>{(user.name || '?').slice(0, 2).toUpperCase()}</span>
                  }
                  <span aria-label="Online" style={{ position: 'absolute', right: '-1px', bottom: '-1px', width: '11px', height: '11px', borderRadius: '50%', border: '2px solid #161b22', background: '#31c46c' }} />
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', overflow: 'hidden', color: '#e6edf3', fontSize: '13px', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                  <span style={{ display: 'block', overflow: 'hidden', color: 'rgba(255,255,255,0.42)', fontSize: '11px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[user.title, user.church].filter(Boolean).join(' · ') || activity}</span>
                </span>
                <time dateTime={user.lastActiveAt} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{activity}</time>
              </div>
            )
          })}
        </div>
      )}
      {error && users.length > 0 && <div role="status" style={{ marginTop: '8px', color: '#fca5a5', fontSize: '11px' }}>Couldn’t refresh the list; showing the last results.</div>}
    </section>
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

// Shared by the network-wide overview and a single user's detail panel —
// both are fed by the same backend shape (GET /analytics/summary, optionally
// scoped with ?userId=), so this is the one place that renders it.
function SummaryPanels({ summary }: { summary: AnalyticsSummary }) {
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
    <>
      <div className="grid-stats-4" style={{ marginBottom: '20px' }}>
        <StatCard label="Sessions" value={summary.totals.sessions} color="var(--color-gold)" />
        <StatCard label="Page Views" value={summary.totals.pageViews} color="#60a5fa" />
        <StatCard label="Unique Visitors" value={summary.totals.uniqueVisitors} color="var(--color-purple)" />
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
      <BarList title="Browser" rows={summary.byBrowser} color="var(--color-purple)" />
        <BarList title="Operating System" rows={summary.byOS} color="#34d399" />
        <BarList title="Country" rows={summary.byCountry} color="var(--color-gold)" />
      </div>

      <BarList title="Top Pages" rows={summary.topPages.map(p => ({ name: p.view, count: p.count }))} color="#f87171" />
    </>
  )
}

function UserDetail({ user, onBack }: { user: UserActivity; onBack: () => void }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setSummary(null); setError('')
    api<AnalyticsSummary>(`/analytics/summary?userId=${encodeURIComponent(user.userId)}`)
      .then(setSummary)
      .catch(e => setError(e.message ?? 'Failed to load this member’s analytics'))
  }, [user.userId])

  return (
    <div>
      <button onClick={onBack} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)',
      }}>← Back to overview</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt={user.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
          : <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'var(--color-navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{(user.name || '?').slice(0, 2).toUpperCase()}</div>
        }
        <div>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#e6edf3' }}>{user.name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Last active {new Date(user.lastSeenAt).toLocaleString()}</div>
        </div>
      </div>

      {error && <div style={{ padding: '32px', textAlign: 'center', color: '#f87171', fontSize: '14px' }}>{error}</div>}
      {!error && !summary && <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading…</div>}
      {summary && <SummaryPanels summary={summary} />}
    </div>
  )
}

function UserActivityTable({ users, onSelect }: { users: UserActivity[]; onSelect: (u: UserActivity) => void }) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontSize: '13px', fontWeight: 800, color: '#e6edf3', marginBottom: '14px' }}>By Member</div>
      {users.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No attributed activity yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 140px', gap: '8px', padding: '0 8px 8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Member</div><div>Sessions</div><div>Page Views</div><div>Last Active</div>
          </div>
          {users.map(u => (
            <div key={u.userId} onClick={() => onSelect(u)} style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 90px 140px', gap: '8px', alignItems: 'center',
              padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {u.avatarUrl
                  ? <img src={u.avatarUrl} alt="" style={{ width: '26px', height: '26px', borderRadius: '7px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0, backgroundColor: 'var(--color-navy-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '10px' }}>{(u.name || '?').slice(0, 2).toUpperCase()}</div>
                }
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{u.sessions}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{u.pageViews}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{new Date(u.lastSeenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsAdmin() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [users, setUsers] = useState<UserActivity[]>([])
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AnalyticsSummary>('/analytics/summary').then(setSummary).catch(e => setError(e.message ?? 'Failed to load analytics'))
    api<UserActivity[]>('/analytics/users').then(setUsers).catch(() => setUsers([]))
  }, [])

  if (error) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#f87171', fontSize: '14px' }}>{error}</div>
  }
  if (!summary) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading analytics…</div>
  }

  if (selectedUser) {
    return <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />
  }

  return (
    <div>
      <ActiveNowPanel />
      <SummaryPanels summary={summary} />
      <div style={{ marginTop: '20px' }}>
        <UserActivityTable users={users} onSelect={setSelectedUser} />
      </div>
    </div>
  )
}
