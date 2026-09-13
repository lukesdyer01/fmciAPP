// Full-window Notifications panel — mirrors MessagesPanel: a slide-over on
// desktop, the whole screen on a phone. The bell tab opens it; the labelled
// "← Home" (mobile) / ✕ (desktop) buttons and a backdrop tap close it. The
// tab bar hides while it's open so the two never fight.

import { useUIStore } from '../store/ui'

export default function NotificationsPanel() {
  const setNotifOpen = useUIStore(s => s.setNotifOpen)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setNotifOpen(false) }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}
    >
      <div className="notifications-panel" style={{
        width: '760px', maxWidth: '100vw', height: '100vh', backgroundColor: 'var(--color-card)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          {/* Which of these two shows is a breakpoint decision made in CSS — see
              .notifications-home-btn / .notifications-close-btn. Both do the same
              thing; full-screen on a phone wants the labelled way out, the desktop
              slide-over wants the usual dismiss. */}
          <button onClick={() => setNotifOpen(false)} className="notifications-home-btn" style={{
            background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', gap: '5px',
            color: 'var(--color-navy)', fontSize: '14px', fontWeight: 700, padding: '4px 2px',
            fontFamily: 'var(--font-sans)',
          }}>← Home</button>
          <div style={{ flex: 1, fontSize: '17px', fontWeight: 800, color: 'var(--color-text-1)' }}>Notifications</div>
          <button onClick={() => setNotifOpen(false)} className="notifications-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '34px' }}>🔔</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-1)' }}>No notifications yet</div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-2)', maxWidth: '280px', lineHeight: 1.5 }}>
            When someone reacts to your posts, comments, or sends you a message, you'll see it here.
          </div>
        </div>
      </div>
    </div>
  )
}