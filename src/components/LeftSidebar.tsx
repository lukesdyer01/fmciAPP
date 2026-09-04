import { useState, useEffect } from 'react'
import type { ActiveView } from '../App'
import { api } from '../api-client/server'
import { useUIStore } from '../store/ui'

interface Props {
  activeView: ActiveView
  setActiveView: (v: ActiveView) => void
}

interface RecentOrg {
  id: string
  name: string
  type: string
  location: string
  img: string
  createdAt?: string
}

function RecentMinistries() {
  const viewOrg = useUIStore(s => s.viewOrg)
  const [orgs, setOrgs] = useState<RecentOrg[] | null>(null)

  useEffect(() => {
    api<RecentOrg[]>('/orgs/my').then(setOrgs).catch(() => setOrgs([]))
  }, [])

  if (!orgs) return null

  const recent = orgs
    .filter(o => o.id !== 'org_fmci')
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5)

  if (recent.length === 0) return null

  return (
    <div style={{
      backgroundColor: 'var(--color-card)', borderRadius: '12px',
      border: '1px solid var(--color-border)', padding: '14px', marginTop: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>🏛 Recent Ministries</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recent.map(o => (
          <div key={o.id} onClick={() => viewOrg(o.id)} style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, overflow: 'hidden' }}>
              {o.img
                ? <img src={o.img} alt={o.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-navy) 0%, var(--color-navy-mid) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🏛</div>
              }
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-1)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
              {o.location && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.location}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const NAV: { id: ActiveView; icon: string; label: string }[] = [
  { id: 'feed',      icon: '🏠', label: 'Home Feed' },
  { id: 'directory', icon: '👤', label: 'Member Directory' },
  { id: 'orgs',      icon: '🏛', label: 'Ministries' },
  { id: 'groups',    icon: '👥', label: 'Groups' },
  { id: 'blog',      icon: '📝', label: 'Blog' },
  { id: 'prayer',    icon: '🙏', label: 'Prayer Requests' },
  { id: 'testimonies', icon: '✨', label: 'Testimony Wall' },
  { id: 'events',    icon: '📅', label: 'Events' },
  { id: 'resources', icon: '📚', label: 'Resources' },
  { id: 'about',     icon: 'ℹ️', label: 'About' },
]

export default function LeftSidebar({ activeView, setActiveView }: Props) {
  return (
    // Desktop: sticky sidebar. Hidden below 768px (see .left-sidebar-desktop in
    // index.css) — the mobile equivalent is the hamburger-triggered MobileNavDrawer.
    <aside className="left-sidebar-desktop" style={{
      position: 'sticky', top: '64px',
      height: 'calc(100vh - 64px)', overflowY: 'auto',
      padding: '16px 12px 32px',
      scrollbarWidth: 'thin',
    }}>
      <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px' }}>
        {NAV.map(item => {
          const active = activeView === item.id
          return (
            <button key={item.id} onClick={() => setActiveView(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 12px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
              backgroundColor: active ? 'var(--color-navy)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-1)',
              fontSize: '14px', fontWeight: active ? 700 : 500,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              <span style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
              }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </div>

      <RecentMinistries />
    </aside>
  )
}
