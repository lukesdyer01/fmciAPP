// Bottom tab bar — the primary navigation on phones (hidden ≥768px where the
// desktop sidebars take over). Five destinations, thumb-reachable, one tap.
// Tapping the active tab scrolls to the top, the standard social-app behavior.
//
// The "More" tab opens the slide-out drawer (the existing MobileNavDrawer,
// now holding only secondary destinations). The bar hides while the keyboard
// is up and while Messages is full-screen, so it never fights those surfaces.

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '../store/ui'
import { hapticSelection } from '../lib/haptics'
import type { ActiveView } from '../App'

const TABS: { id: ActiveView | 'more'; label: string; icon: (active: boolean) => ReactNode }[] = [
  {
    id: 'feed', label: 'Home',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'orgs', label: 'Ministries',
    icon: active => (
      // Hand holding a heart — the serving/care gesture for ministries.
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
        <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
        <path d="m2 15 6 6" />
        <path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" />
      </svg>
    ),
  },
  {
    id: 'events', label: 'Events',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'groups', label: 'Groups',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'more', label: 'More',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    ),
  },
]

export default function BottomTabBar() {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const setMobileNavOpen = useUIStore(s => s.setMobileNavOpen)
  const mobileNavOpen = useUIStore(s => s.mobileNavOpen)
  const messagesOpen = useUIStore(s => s.messagesOpen)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Hide while the keyboard is up (Facebook/Instagram behavior) — the WebView
  // resizes on iOS, so a shrinking visualViewport means the keyboard is out.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const vh = window.innerHeight
      setKeyboardOpen(vv.height < vh - 80)
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  if (messagesOpen || keyboardOpen) return null

  function onTab(tab: (typeof TABS)[number]) {
    hapticSelection()
    if (tab.id === 'more') {
      setMobileNavOpen(true)
      return
    }
    if (tab.id === activeView) {
      // Tap the active tab → scroll to top, the standard behavior.
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setActiveView(tab.id)
  }

  const moreActive = mobileNavOpen

  return (
    <nav
      className="bottom-tab-bar"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        backgroundColor: 'var(--color-card)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        // The home indicator sits below the bar's content — the bar itself
        // paints the full inset so the white background runs edge to edge.
        paddingBottom: 'var(--safe-bottom)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {TABS.map(tab => {
        const active = tab.id === 'more' ? moreActive : activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTab(tab)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '2px', minHeight: '52px', padding: '6px 2px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              color: active ? 'var(--color-navy)' : 'var(--color-text-3)',
              transition: 'color 0.15s',
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontSize: '10px', fontWeight: active ? 800 : 600,
              letterSpacing: '0.2px',
            }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}