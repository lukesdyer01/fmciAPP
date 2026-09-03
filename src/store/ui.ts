// Zustand store for UI-only state.
// Server state (posts, members, events) lives in TanStack Query — never here.
// Only genuinely local, ephemeral UI state belongs in this store.

import { create } from 'zustand'
import type { ActiveView } from '../App'

// URL <-> view mapping so each page has its own address (deep-linkable,
// back/forward-navigable) without pulling in a router dependency.
const VIEW_TO_PATH: Record<ActiveView, string> = {
  feed: '/', directory: '/directory', orgs: '/ministries', groups: '/groups',
  prayer: '/prayer', testimonies: '/testimonies', events: '/events',
  resources: '/resources', map: '/map', about: '/about',
}
const PATH_TO_VIEW: Record<string, ActiveView> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view as ActiveView])
)

function pushUrl(path: string) {
  if (typeof window === 'undefined' || window.location.pathname === path) return
  window.history.pushState(null, '', path)
}

interface UrlState { activeView: ActiveView; profileId: string | null; viewingOrgId: string | null; adminMode: boolean }

function stateFromUrl(): UrlState {
  if (typeof window === 'undefined') return { activeView: 'feed', profileId: null, viewingOrgId: null, adminMode: false }
  const path = window.location.pathname
  const profileMatch = path.match(/^\/profile\/([^/]+)\/?$/)
  if (profileMatch) return { activeView: 'feed', profileId: decodeURIComponent(profileMatch[1]), viewingOrgId: null, adminMode: false }
  const orgMatch = path.match(/^\/ministries\/([^/]+)\/?$/)
  if (orgMatch) return { activeView: 'orgs', profileId: null, viewingOrgId: decodeURIComponent(orgMatch[1]), adminMode: false }
  if (path === '/admin' || path.startsWith('/admin/')) return { activeView: 'feed', profileId: null, viewingOrgId: null, adminMode: true }
  return { activeView: PATH_TO_VIEW[path] ?? 'feed', profileId: null, viewingOrgId: null, adminMode: false }
}

const INITIAL_URL_STATE = stateFromUrl()

export interface UserProfile {
  name: string
  title: string
  church: string
  location: string
  bio: string
  avatarUrl: string
  website: string
  email: string
  phone: string
  ministryRoles: string[]
  additionalRoles: string[]
  communicationPrefs: string[]
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  title: '',
  church: '',
  location: '',
  bio: '',
  avatarUrl: '',
  website: '',
  email: '',
  phone: '',
  ministryRoles: [],
  additionalRoles: [],
  communicationPrefs: [],
}

interface UIState {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void

  notifOpen: boolean
  setNotifOpen: (open: boolean) => void

  leftSidebarCollapsed: boolean
  toggleLeftSidebar: () => void

  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void

  composerDraft: string
  setComposerDraft: (text: string) => void
  clearComposerDraft: () => void

  adminMode: boolean
  setAdminMode: (on: boolean) => void

  profileId: string | null
  openProfile: (id: string) => void
  closeProfile: () => void

  // Jumping to a specific ministry's page — from anywhere (the Ministries
  // list, the Recent Ministries widget, etc.), not just via local component
  // state, so it's deep-linkable and back/forward-navigable like a profile.
  viewingOrgId: string | null
  viewOrg: (id: string) => void
  closeOrgView: () => void

  messagesOpen: boolean
  messageTargetUserId: string | null
  setMessagesOpen: (open: boolean) => void
  openMessagesWith: (userId: string) => void
  closeMessages: () => void

  userProfile: UserProfile
  updateUserProfile: (patch: Partial<UserProfile>) => void
  editProfileOpen: boolean
  setEditProfileOpen: (open: boolean) => void

  // Clicking a #hashtag anywhere jumps to the home feed filtered to it —
  // global so it works the same from a post on any page, not just the feed.
  activeHashtag: string | null
  viewHashtag: (tag: string) => void
  clearHashtag: () => void

  // Clicking an event in a widget (e.g. the homepage Upcoming Events list)
  // jumps to the network Events page and scrolls/highlights that specific
  // card there — there's no standalone single-event detail page in the app.
  focusEventId: string | null
  focusEvent: (id: string) => void
  clearFocusEvent: () => void

  // Re-syncs view/profile/admin state from the URL — called on browser
  // back/forward (popstate), since those change location without going
  // through any of the actions above.
  syncFromUrl: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeView: INITIAL_URL_STATE.activeView,
  setActiveView: view => { pushUrl(VIEW_TO_PATH[view] ?? '/'); set({ activeView: view, profileId: null, viewingOrgId: null, notifOpen: false, mobileNavOpen: false }) },

  notifOpen: false,
  setNotifOpen: open => set({ notifOpen: open }),

  leftSidebarCollapsed: false,
  toggleLeftSidebar: () => set(s => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),

  mobileNavOpen: false,
  setMobileNavOpen: open => set({ mobileNavOpen: open }),

  composerDraft: '',
  setComposerDraft: text => set({ composerDraft: text }),
  clearComposerDraft: () => set({ composerDraft: '' }),

  adminMode: INITIAL_URL_STATE.adminMode,
  setAdminMode: on => { pushUrl(on ? '/admin' : (VIEW_TO_PATH[get().activeView] ?? '/')); set({ adminMode: on }) },

  profileId: INITIAL_URL_STATE.profileId,
  openProfile: id => { pushUrl(`/profile/${id}`); set({ profileId: id, viewingOrgId: null }) },
  closeProfile: () => { pushUrl(VIEW_TO_PATH[get().activeView] ?? '/'); set({ profileId: null }) },

  viewingOrgId: INITIAL_URL_STATE.viewingOrgId,
  viewOrg: id => { pushUrl(`/ministries/${id}`); set({ viewingOrgId: id, activeView: 'orgs', profileId: null, notifOpen: false, mobileNavOpen: false }) },
  closeOrgView: () => { pushUrl(VIEW_TO_PATH.orgs); set({ viewingOrgId: null }) },

  messagesOpen: false,
  messageTargetUserId: null,
  setMessagesOpen: open => set({ messagesOpen: open }),
  openMessagesWith: userId => set({ messagesOpen: true, messageTargetUserId: userId }),
  closeMessages: () => set({ messagesOpen: false, messageTargetUserId: null }),

  userProfile: DEFAULT_PROFILE,
  updateUserProfile: patch => set(s => ({ userProfile: { ...s.userProfile, ...patch } })),
  editProfileOpen: false,
  setEditProfileOpen: open => set({ editProfileOpen: open }),

  activeHashtag: null,
  viewHashtag: tag => { pushUrl('/'); set({ activeHashtag: tag, activeView: 'feed', profileId: null, viewingOrgId: null, notifOpen: false, mobileNavOpen: false }) },
  clearHashtag: () => set({ activeHashtag: null }),

  focusEventId: null,
  focusEvent: id => { pushUrl(VIEW_TO_PATH.events); set({ focusEventId: id, activeView: 'events', profileId: null, viewingOrgId: null, notifOpen: false, mobileNavOpen: false }) },
  clearFocusEvent: () => set({ focusEventId: null }),

  syncFromUrl: () => {
    const s = stateFromUrl()
    set({ activeView: s.activeView, profileId: s.profileId, viewingOrgId: s.viewingOrgId, adminMode: s.adminMode })
  },
}))
