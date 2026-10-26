import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, UserMembership, OrgRole } from '../core/types/user'
import { useSupabaseRole } from '../contexts/SupabaseRoleContext'

interface AuthContextValue {
  currentUser: User | null
  currentMembership: UserMembership | null
  setActiveOrg: (orgId: string) => void
  activeOrgId: string | null
  isAuthenticated: boolean
  platformRole: User['platformRole']
  orgRole: OrgRole | null
  updateCurrentUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function buildUserFromSession(session: ReturnType<typeof useSupabaseRole>['session'], role: ReturnType<typeof useSupabaseRole>['role']): User {
  const su = session.user
  const meta = su.user_metadata ?? {}
  return {
    id: su.id,
    analyticsOptOut: meta.analytics_opt_out === true,
    username: meta.username ?? su.email?.split('@')[0] ?? su.id,
    displayName: meta.full_name ?? meta.name ?? su.email ?? '',
    email: su.email ?? '',
    avatarUrl: meta.avatar_url ?? null,
    bio: meta.bio ?? null,
    title: meta.title ?? null,
    church: meta.church ?? null,
    location: meta.location ?? null,
    city: meta.city ?? '',
    state: meta.state ?? '',
    country: meta.country ?? '',
    website: meta.website ?? null,
    phone: meta.phone ?? null,
    ministryRoles: Array.isArray(meta.ministryRoles) ? meta.ministryRoles : [],
    requestedMinistryRoles: Array.isArray(meta.requestedMinistryRoles) ? meta.requestedMinistryRoles : (Array.isArray(meta.ministryRoles) ? meta.ministryRoles : []),
    welcomeGuideEligible: meta.welcomeGuideEligible === true,
    welcomeGuideDismissed: meta.welcomeGuideDismissed === true,
    additionalRoles: Array.isArray(meta.additionalRoles) ? meta.additionalRoles : [],
    communicationPrefs: Array.isArray(meta.communicationPrefs) ? meta.communicationPrefs : [],
    memberSince: meta.memberSince ?? null,
    primaryMinistryId: meta.primaryMinistryId ?? null,
    platformRole: role as User['platformRole'],
    verified: meta.verified ?? false,
    createdAt: su.created_at ?? new Date().toISOString(),
    followerCount: meta.follower_count ?? 0,
    followingCount: meta.following_count ?? 0,
    friendCount: meta.friend_count ?? 0,
  }
}

const MOCK_MEMBERSHIPS: UserMembership[] = [
  {
    userId: '',
    organizationId: 'org_fmci',
    orgRole: 'member',
    groupRoles: [],
    joinedAt: new Date().toISOString(),
    status: 'active',
  },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const { session, role } = useSupabaseRole()
  const [activeOrgId, setActiveOrgId] = useState<string | null>('org_fmci')
  const [currentUser, setCurrentUser] = useState<User>(() => buildUserFromSession(session, role))

  // Re-sync when the session refreshes (e.g. after a token refresh or role change)
  useEffect(() => {
    setCurrentUser(buildUserFromSession(session, role))
  }, [session.user, role])

  const memberships = MOCK_MEMBERSHIPS.map(m => ({ ...m, userId: session.user.id, orgRole: (role === 'admin' || role === 'superadmin' ? 'admin' : 'member') as OrgRole }))
  const currentMembership = memberships.find(m => m.organizationId === activeOrgId) ?? null

  const value: AuthContextValue = {
    currentUser,
    currentMembership,
    activeOrgId,
    setActiveOrg: setActiveOrgId,
    isAuthenticated: true,
    platformRole: currentUser.platformRole,
    orgRole: currentMembership?.orgRole ?? null,
    updateCurrentUser: patch => setCurrentUser(u => ({ ...u, ...patch })),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
