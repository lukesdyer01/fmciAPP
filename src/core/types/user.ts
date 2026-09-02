// One identity. One account. One profile. One social graph.
// Users belong to unlimited organizations with independent permission sets.

export type PlatformRole = 'superadmin' | 'moderator' | 'support' | 'user'

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  bio: string | null
  title: string | null
  church: string | null
  location: string | null
  website: string | null
  phone: string | null
  ministryRoles: string[]
  additionalRoles: string[]
  communicationPrefs: string[]
  platformRole: PlatformRole
  verified: boolean
  createdAt: string
  // Social graph counts — stored as denormalized counters, not computed at read time
  followerCount: number
  followingCount: number
  friendCount: number
}

export interface UserMembership {
  userId: string
  organizationId: string
  orgRole: OrgRole
  groupRoles: GroupRoleMembership[]
  joinedAt: string
  status: 'active' | 'pending' | 'suspended'
}

export interface GroupRoleMembership {
  groupId: string
  role: GroupRole
}

// Imported here to avoid circular deps
export type OrgRole = 'owner' | 'admin' | 'leader' | 'member' | 'guest'
export type GroupRole = 'leader' | 'moderator' | 'member'
