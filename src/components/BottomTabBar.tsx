// Bottom tab bar — the primary navigation on phones (hidden ≥768px where the
// desktop sidebars take over). Five destinations, thumb-reachable, one tap.
// Tapping the active tab scrolls to the top, the standard social-app behavior.
//
// Messages are panels, not views — the chat bubble opens the full-screen
// Messages panel (and carries the unread badge). Notifications are opened
// from the mobile header. The header menu opens the
// drawer containing secondary destinations. The bar hides while the keyboard
// is up and while either
// panel is full-screen, so it never fights those surfaces.

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useUIStore } from '../store/ui'
import { hapticSelection } from '../lib/haptics'
import { useConversations } from '../api-client/messages'
import { useAutoHideNavigation } from '../hooks/useAutoHideNavigation'
import type { ActiveView } from '../App'

type TabId = ActiveView | 'messages'

const TABS: { id: TabId; label: string; icon: (active: boolean) => ReactNode }[] = [
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9M9 21v-7h6v7" />
        <path d="M12 6v4m-2-2h4" />
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
    id: 'directory', label: 'Members',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'messages', label: 'Messages',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },

]

export default function BottomTabBar() {
  const activeView = useUIStore(s => s.activeView)
  const setActiveView = useUIStore(s => s.setActiveView)
  const messagesOpen = useUIStore(s => s.messagesOpen)
  const setMessagesOpen = useUIStore(s => s.setMessagesOpen)
  const notifOpen = useUIStore(s => s.notifOpen)
  const { data: conversations } = useConversations()
  const unreadTotal = (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const routeKey = useUIStore(s => [s.activeView, s.profileId, s.viewingOrgId, s.viewingBlogPostId, s.viewingEventId, s.viewingSeriesId].join('|'))
  const overlayOpen = useUIStore(s => s.mobileNavOpen || s.searchOpen || s.editProfileOpen)
  const { hidden, navRef } = useAutoHideNavigation(routeKey, messagesOpen || notifOpen || keyboardOpen || overlayOpen)


  // Hide while the keyboard is up (Facebook/Instagram behavior) — the WebView
  // resizes on iOS, so a shrinking visualViewport means the keyboard is out.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const vh = window.innerHeight
      setKeyboardOpen(vv.height < vh - 80)
    }
    onResize()
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  if (messagesOpen || notifOpen || keyboardOpen) return null

  function onTab(tab: (typeof TABS)[number]) {
    hapticSelection()
    if (tab.id === 'messages') {
      setMessagesOpen(true)
      return
    }
    if (tab.id === activeView) {
      // Tap the active tab → scroll to top, the standard behavior.
      const scroller = [document.getElementById('root'), document.body, document.documentElement].find(node => node && node.scrollTop > 0) ?? document.scrollingElement
      scroller?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setActiveView(tab.id)
  }

  return (
    <nav
      ref={navRef}
      className={`bottom-tab-bar${hidden ? ' bottom-tab-bar-hidden' : ''}`}
      aria-label="Main navigation"
      aria-hidden={hidden || undefined}
      inert={hidden}
    >
      {TABS.map(tab => {
        const active = tab.id === 'messages' ? messagesOpen
          : activeView === tab.id
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
              color: active ? 'var(--bottom-tab-active-color, var(--color-navy))' : 'var(--bottom-tab-inactive-color, var(--color-text-3))',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              {tab.icon(active)}
              {tab.id === 'messages' && unreadTotal > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-9px',
                  minWidth: '16px', height: '16px', borderRadius: '8px',
                  backgroundColor: 'var(--color-red)', color: '#fff',
                  fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', border: '2px solid var(--color-card)',
                }}>{unreadTotal > 9 ? '9+' : unreadTotal}</span>
              )}
            </span>
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
