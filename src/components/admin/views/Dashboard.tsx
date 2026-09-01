import { useState, useEffect } from 'react'
import { api } from '../../../api-client/server'

const STATIC_STATS = [
  { label: 'Posts This Week',    value: '—',    delta: 'Via feed activity',        icon: '📝', trend: 'up'   as const },
  { label: 'Prayer Requests',    value: '—',    delta: 'Via feed activity',        icon: '🙏', trend: 'up'   as const },
  { label: 'Flagged Content',    value: '0',    delta: 'Nothing flagged',          icon: '⚑',  trend: 'up'   as const },
]

const ACTIVITY = [
  { type: 'join',   text: 'Activity log coming soon — new members, posts, and flags will appear here.', time: '', icon: '📋', color: '#60a5fa' },
]

function StatCard({ label, value, delta, icon, trend }: { label: string; value: string; delta: string; icon: string; trend: 'up' | 'warn' }) {
  return (
    <div style={{
      backgroundColor: '#161b22', borderRadius: '12px',
      border: `1px solid ${trend === 'warn' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)'}`,
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: 900, color: trend === 'warn' ? '#f59e0b' : '#e6edf3', lineHeight: 1, marginBottom: '8px' }}>{value}</div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: trend === 'up' ? '#22c55e' : '#f59e0b' }}>
        {trend === 'up' ? '↑ ' : '⚠ '}{delta}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [memberLoading, setMemberLoading] = useState(true)
  const [orgCount, setOrgCount] = useState<number | null>(null)
  const [pendingVerifCount, setPendingVerifCount] = useState<number | null>(null)

  function loadMembers() {
    setMemberLoading(true)
    api<{ id: string }[]>('/admin/users')
      .then(users => setMemberCount(users.length))
      .catch(() => setMemberCount(null))
      .finally(() => setMemberLoading(false))
  }

  useEffect(() => {
    loadMembers()
    api<{ id: string }[]>('/orgs')
      .then(orgs => setOrgCount(orgs.length))
      .catch(() => setOrgCount(null))
    api<{ status: string }[]>('/verification-requests')
      .then(reqs => setPendingVerifCount(reqs.filter(r => r.status === 'pending').length))
      .catch(() => setPendingVerifCount(null))
  }, [])

  const memberValue = memberLoading ? '…' : memberCount === null ? '—' : String(memberCount)

  return (
    <div>
      <div className="grid-stats-3" style={{ marginBottom: '28px' }}>
        <StatCard
          label="Total Members"
          value={memberValue}
          delta={memberCount !== null ? `${memberCount} registered users` : 'Could not load'}
          icon="👥"
          trend="up"
        />
        <StatCard
          label="Organizations"
          value={orgCount === null ? '—' : String(orgCount)}
          delta={orgCount !== null ? `${orgCount} registered orgs` : 'Via Orgs panel'}
          icon="🏛"
          trend="up"
        />
        <StatCard
          label="Pending Verif."
          value={pendingVerifCount === null ? '—' : String(pendingVerifCount)}
          delta={pendingVerifCount === null ? 'Could not load' : pendingVerifCount > 0 ? 'Awaiting review' : 'No queue'}
          icon="✓"
          trend={pendingVerifCount !== null && pendingVerifCount > 0 ? 'warn' : 'up'}
        />
        {STATIC_STATS.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid-aside-340" style={{ marginBottom: '20px' }}>
        {/* Member count summary */}
        <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', marginBottom: '2px' }}>Member Count</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Live from Supabase Auth</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={loadMembers}
                disabled={memberLoading}
                title="Refresh member count"
                style={{
                  width: '30px', height: '30px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                  cursor: memberLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', transition: 'all 0.15s',
                  opacity: memberLoading ? 0.5 : 1,
                }}
              >↻</button>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-gold)' }}>
                {memberLoading ? '…' : memberCount ?? '—'}
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '140px', borderRadius: '10px',
            backgroundColor: 'rgba(200,155,60,0.04)', border: '1px dashed rgba(200,155,60,0.15)',
            color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', lineHeight: 1.6,
          }}>
            {memberLoading
              ? 'Loading member data…'
              : memberCount !== null
                ? <span><strong style={{ color: 'var(--color-gold)', fontSize: '40px', fontWeight: 900, display: 'block', lineHeight: 1.1 }}>{memberCount}</strong>registered members</span>
                : 'Could not load member count'
            }
          </div>
        </div>

        {/* Quick links */}
        <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', marginBottom: '16px' }}>Quick Access</div>
          {[
            { icon: '👥', label: 'Manage Members',    desc: 'View and edit all users' },
            { icon: '🏛',  label: 'Organizations',     desc: 'Manage churches and networks' },
            { icon: '✓',  label: 'Verification Queue', desc: 'Review pending requests' },
            { icon: '⚙',  label: 'Platform Settings',  desc: 'Configure platform options' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '22px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', marginBottom: '16px' }}>Recent Platform Activity</div>
        <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px', lineHeight: 1.6 }}>
          📋 Activity log coming soon — new member registrations, verifications, and content flags will appear here.
        </div>
      </div>
    </div>
  )
}
