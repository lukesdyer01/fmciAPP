// Zustand store for UI-only state.
// Server state (posts, members, events) lives in TanStack Query — never here.
// Only genuinely local, ephemeral UI state belongs in this store.

import { create } from 'zustand'
import type { ActiveView } from '../App'

// URL <-> view mapping so each page has its own address (deep-linkable,
// back/forward-navigable) without pulling in a router dependency.
const VIEW_TO_PATH: Record<ActiveView, string> = {
  feed: '/', directory: '/directory', orgs: '/ministries', groups: '/groups', blog: '/blog',
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

interface UrlState { activeView: ActiveView; profileId: string | null; viewingOrgId: string | null; viewingBlogPostId: string | null; viewingEventId: string | null; viewingSeriesId: string | null; adminMode: boolean }

const EMPTY_URL_STATE = { profileId: null, viewingOrgId: null, viewingBlogPostId: null, viewingEventId: null, viewingSeriesId: null }

function stateFromUrl(): UrlState {
  if (typeof window === 'undefined') return { activeView: 'feed', ...EMPTY_URL_STATE, adminMode: false }
  const path = window.location.pathname
  const profileMatch = path.match(/^\/profile\/([^/]+)\/?$/)
  if (profileMatch) return { activeView: 'feed', ...EMPTY_URL_STATE, profileId: decodeURIComponent(profileMatch[1]), adminMode: false }
  const orgMatch = path.match(/^\/ministries\/([^/]+)\/?$/)
  if (orgMatch) return { activeView: 'orgs', ...EMPTY_URL_STATE, viewingOrgId: decodeURIComponent(orgMatch[1]), adminMode: false }
  const blogMatch = path.match(/^\/blog\/([^/]+)\/?$/)
  if (blogMatch) return { activeView: 'blog', ...EMPTY_URL_STATE, viewingBlogPostId: decodeURIComponent(blogMatch[1]), adminMode: false }
  const seriesMatch = path.match(/^\/meeting-series\/([^/]+)\/?$/)
  if (seriesMatch) return { activeView: 'events', ...EMPTY_URL_STATE, viewingSeriesId: decodeURIComponent(seriesMatch[1]), adminMode: false }
  const eventMatch = path.match(/^\/events\/([^/]+)\/?$/)
  if (eventMatch) return { activeView: 'events', ...EMPTY_URL_STATE, viewingEventId: decodeURIComponent(eventMatch[1]), adminMode: false }
  if (path === '/admin' || path.startsWith('/admin/')) return { activeView: 'feed', ...EMPTY_URL_STATE, adminMode: true }
  return { activeView: PATH_TO_VIEW[path] ?? 'feed', ...EMPTY_URL_STATE, adminMode: false }
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
  memberSince: string
  primaryMinistryId: string
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
  memberSince: '',
  primaryMinistryId: '',
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

  // Same deep-linkable pattern as viewingOrgId, for a single blog article.
  viewingBlogPostId: string | null
  viewBlogPost: (id: string) => void
  closeBlogPostView: () => void

  // Same deep-linkable pattern, for a single event's detail page (its full
  // info, RSVP, and discussion thread) — replaces the old scroll-to-card
  // behavior so a specific meeting always has a stable, shareable URL.
  viewingEventId: string | null
  viewEvent: (id: string) => void
  closeEventView: () => void

  // The bookmarkable hub for a recurring meeting (e.g. "Tuesday Prayer
  // Call") — lists every linked occurrence so a series' history stays
  // findable in one place instead of scattered across independent events.
  viewingSeriesId: string | null
  viewMeetingSeries: (id: string) => void
  closeMeetingSeriesView: () => void

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


  // Re-syncs view/profile/admin state from the URL — called on browser
  // back/forward (popstate), since those change location without going
  // through any of the actions above.
  syncFromUrl: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeView: INITIAL_URL_STATE.activeView,
  setActiveView: view => { pushUrl(VIEW_TO_PATH[view] ?? '/'); set({ activeView: view, profileId: null, viewingOrgId: null, viewingBlogPostId: null, viewingEventId: null, viewingSeriesId: null, notifOpen: false, mobileNavOpen: false }) },

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
  openProfile: id => { pushUrl(`/profile/${id}`); set({ profileId: id, viewingOrgId: null, viewingBlogPostId: null, viewingEventId: null, viewingSeriesId: null }) },
  closeProfile: () => { pushUrl(VIEW_TO_PATH[get().activeView] ?? '/'); set({ profileId: null }) },

  viewingOrgId: INITIAL_URL_STATE.viewingOrgId,
  viewOrg: id => { pushUrl(`/ministries/${id}`); set({ viewingOrgId: id, activeView: 'orgs', profileId: null, viewingBlogPostId: null, viewingEventId: null, viewingSeriesId: null, notifOpen: false, mobileNavOpen: false }) },
  closeOrgView: () => { pushUrl(VIEW_TO_PATH.orgs); set({ viewingOrgId: null }) },

  viewingBlogPostId: INITIAL_URL_STATE.viewingBlogPostId,
  viewBlogPost: id => { pushUrl(`/blog/${id}`); set({ viewingBlogPostId: id, activeView: 'blog', profileId: null, viewingOrgId: null, viewingEventId: null, viewingSeriesId: null, notifOpen: false, mobileNavOpen: false }) },
  closeBlogPostView: () => { pushUrl(VIEW_TO_PATH.blog); set({ viewingBlogPostId: null }) },

  viewingEventId: INITIAL_URL_STATE.viewingEventId,
  viewEvent: id => { pushUrl(`/events/${id}`); set({ viewingEventId: id, activeView: 'events', profileId: null, viewingOrgId: null, viewingBlogPostId: null, viewingSeriesId: null, notifOpen: false, mobileNavOpen: false }) },
  closeEventView: () => { pushUrl(VIEW_TO_PATH.events); set({ viewingEventId: null }) },

  viewingSeriesId: INITIAL_URL_STATE.viewingSeriesId,
  viewMeetingSeries: id => { pushUrl(`/meeting-series/${id}`); set({ viewingSeriesId: id, activeView: 'events', profileId: null, viewingOrgId: null, viewingBlogPostId: null, viewingEventId: null, notifOpen: false, mobileNavOpen: false }) },
  closeMeetingSeriesView: () => { pushUrl(VIEW_TO_PATH.events); set({ viewingSeriesId: null }) },

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
  viewHashtag: tag => { pushUrl('/'); set({ activeHashtag: tag, activeView: 'feed', profileId: null, viewingOrgId: null, viewingBlogPostId: null, viewingEventId: null, viewingSeriesId: null, notifOpen: false, mobileNavOpen: false }) },
  clearHashtag: () => set({ activeHashtag: null }),

  syncFromUrl: () => {
    const s = stateFromUrl()
    set({ activeView: s.activeView, profileId: s.profileId, viewingOrgId: s.viewingOrgId, viewingBlogPostId: s.viewingBlogPostId, viewingEventId: s.viewingEventId, viewingSeriesId: s.viewingSeriesId, adminMode: s.adminMode })
  },
}))
