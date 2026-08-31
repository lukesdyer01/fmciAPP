import { useState } from 'react'

interface OrgFlags {
  orgId: string
  orgName: string
  orgType: string
  giving: boolean
  events: boolean
  groups: boolean
  prayer: boolean
  media: boolean
  courses: boolean
  messaging: boolean
  volunteers: boolean
  livestream: boolean
  resources: boolean
  memberDirectory: boolean
}

const FLAGS: (keyof Omit<OrgFlags, 'orgId' | 'orgName' | 'orgType'>)[] = [
  'giving', 'events', 'groups', 'prayer', 'media', 'courses',
  'messaging', 'volunteers', 'livestream', 'resources', 'memberDirectory',
]

const FLAG_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  giving:          { label: 'Giving',           icon: '💳', description: 'Online giving and tithing portal' },
  events:          { label: 'Events',           icon: '📅', description: 'Event creation and RSVP management' },
  groups:          { label: 'Groups',           icon: '👥', description: 'Small groups and cell groups' },
  prayer:          { label: 'Prayer Wall',      icon: '🙏', description: 'Prayer requests and prayer tracking' },
  media:           { label: 'Media',            icon: '🎥', description: 'Audio/video library and sermons' },
  courses:         { label: 'Courses',          icon: '🎓', description: 'Online courses and Bible study tracks' },
  messaging:       { label: 'Messaging',        icon: '💬', description: 'Direct messaging between members' },
  volunteers:      { label: 'Volunteers',       icon: '🤝', description: 'Volunteer scheduling and management' },
  livestream:      { label: 'Livestream',       icon: '📡', description: 'Live service streaming integration' },
  resources:       { label: 'Resources',        icon: '📚', description: 'Books, articles, and teaching materials' },
  memberDirectory: { label: 'Directory',        icon: '🗂', description: 'Public member directory visibility' },
}

const INITIAL_ORGS: OrgFlags[] = []

export default function FeatureFlagsAdmin() {
  const [orgs, setOrgs] = useState(INITIAL_ORGS)
  const [search, setSearch] = useState('')
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const filtered = orgs.filter(o => !search || o.orgName.toLowerCase().includes(search.toLowerCase()))

  const toggle = (orgId: string, flag: keyof Omit<OrgFlags, 'orgId' | 'orgName' | 'orgType'>) =>
    setOrgs(os => os.map(o => o.orgId === orgId ? { ...o, [flag]: !o[flag] } : o))

  const enableAll = (orgId: string) =>
    setOrgs(os => os.map(o => o.orgId === orgId ? { ...o, ...Object.fromEntries(FLAGS.map(f => [f, true])) } : o))

  const disableAll = (orgId: string) =>
    setOrgs(os => os.map(o => o.orgId === orgId ? { ...o, ...Object.fromEntries(FLAGS.map(f => [f, false])) } : o))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '22px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations…"
            style={{ width: '100%', padding: '9px 12px 9px 32px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>Changes apply immediately</div>
      </div>

      {/* Feature flag legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {FLAGS.map(f => {
          const fl = FLAG_LABELS[f]
          return (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '7px', backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '12px' }}>{fl.icon}</span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{fl.label}</span>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '36px', marginBottom: '14px' }}>🏳</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '6px' }}>
            {search ? 'No organizations match your search' : 'No organizations configured'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            Add organizations in the Organizations panel — their feature flags will appear here.
          </div>
        </div>
      )}

      {/* Matrix table */}
      {filtered.length > 0 && (
      <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', width: '220px' }}>Organization</th>
              {FLAGS.map(f => (
                <th key={f} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '16px' }} title={FLAG_LABELS[f].label + ' — ' + FLAG_LABELS[f].description}>
                  {FLAG_LABELS[f].icon}
                </th>
              ))}
              <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((org, oi) => {
              const enabledCount = FLAGS.filter(f => org[f]).length
              return (
                <tr key={org.orgId} style={{ borderBottom: oi < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', marginBottom: '2px' }}>{org.orgName}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{org.orgType} · {enabledCount}/{FLAGS.length} features</div>
                  </td>
                  {FLAGS.map(f => {
                    const enabled = org[f]
                    const cellKey = `${org.orgId}-${f}`
                    const hov = hoveredCell === cellKey
                    return (
                      <td key={f} style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggle(org.orgId, f)}
                          onMouseEnter={() => setHoveredCell(cellKey)}
                          onMouseLeave={() => setHoveredCell(null)}
                          title={`${enabled ? 'Disable' : 'Enable'} ${FLAG_LABELS[f].label}`}
                          style={{
                            width: '26px', height: '26px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            backgroundColor: enabled
                              ? (hov ? 'rgba(200,155,60,0.35)' : 'rgba(200,155,60,0.2)')
                              : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'),
                            color: enabled ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)',
                            fontSize: '13px', fontWeight: 900, lineHeight: 1, transition: 'all 0.1s',
                          }}
                        >{enabled ? '✓' : '·'}</button>
                      </td>
                    )
                  })}
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button onClick={() => enableAll(org.orgId)} style={matrixBtn('var(--color-gold)')}>All On</button>
                      <button onClick={() => disableAll(org.orgId)} style={matrixBtn('#f87171')}>All Off</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

function matrixBtn(color: string): React.CSSProperties {
  return {
    padding: '4px 10px', borderRadius: '6px', border: `1px solid ${color}25`,
    backgroundColor: color + '10', color, fontSize: '11px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
  }
}
