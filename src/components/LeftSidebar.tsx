import type { ActiveView } from '../App'

interface Props {
  activeView: ActiveView
  setActiveView: (v: ActiveView) => void
}

export const NAV: { id: ActiveView; icon: string; label: string }[] = [
  { id: 'feed',      icon: '🏠', label: 'Home Feed' },
  { id: 'directory', icon: '👤', label: 'Member Directory' },
  { id: 'orgs',      icon: '🏛', label: 'Ministries' },
  { id: 'groups',    icon: '👥', label: 'Groups' },
  { id: 'prayer',    icon: '🙏', label: 'Prayer Requests' },
  { id: 'testimonies', icon: '✨', label: 'Testimony Wall' },
  { id: 'events',    icon: '📅', label: 'Events' },
  { id: 'resources', icon: '📚', label: 'Resources' },
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
    </aside>
  )
}
