import { useEffect, useState } from 'react'
import { NAV } from './LeftSidebar'
import { useUIStore } from '../store/ui'
import fmciLogo from '../imports/fmci-copy1280x400_orig.png'

export default function MobileNavDrawer() {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(() => setMobileNavOpen(false), 200)
  }

  function selectView(id: typeof activeView) {
    setVisible(false)
    setTimeout(() => setActiveView(id), 200)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) close() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.5)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '78vw', maxWidth: '300px',
        backgroundColor: 'var(--color-card)', boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <img src={fmciLogo} alt="FMCI" style={{ height: '28px', width: '28px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-1)', letterSpacing: '0.5px' }}>FMCI</div>
          <button onClick={close} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-3)', fontSize: '20px', lineHeight: 1, padding: '4px',
          }}>✕</button>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {NAV.map(item => {
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => selectView(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '11px 12px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                backgroundColor: active ? 'var(--color-navy)' : 'transparent',
                color: active ? '#fff' : 'var(--color-text-1)',
                fontSize: '15px', fontWeight: active ? 700 : 500,
                marginBottom: '2px',
              }}>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'var(--color-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
