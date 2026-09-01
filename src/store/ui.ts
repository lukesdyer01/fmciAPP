// Zustand store for UI-only state.
// Server state (posts, members, events) lives in TanStack Query — never here.
// Only genuinely local, ephemeral UI state belongs in this store.

import { create } from 'zustand'
import type { ActiveView } from '../App'

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
}

export const useUIStore = create<UIState>(set => ({
  activeView: 'feed',
  setActiveView: view => set({ activeView: view, notifOpen: false, mobileNavOpen: false }),

  notifOpen: false,
  setNotifOpen: open => set({ notifOpen: open }),

  leftSidebarCollapsed: false,
  toggleLeftSidebar: () => set(s => ({ leftSidebarCollapsed: !s.leftSidebarCollapsed })),

  mobileNavOpen: false,
  setMobileNavOpen: open => set({ mobileNavOpen: open }),

  composerDraft: '',
  setComposerDraft: text => set({ composerDraft: text }),
  clearComposerDraft: () => set({ composerDraft: '' }),

  adminMode: false,
  setAdminMode: on => set({ adminMode: on }),

  profileId: null,
  openProfile: id => set({ profileId: id }),
  closeProfile: () => set({ profileId: null }),

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
  viewHashtag: tag => set({ activeHashtag: tag, activeView: 'feed', profileId: null, notifOpen: false, mobileNavOpen: false }),
  clearHashtag: () => set({ activeHashtag: null }),
}))
