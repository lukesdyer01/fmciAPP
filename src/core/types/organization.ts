// Organizations are graph nodes, not a flat list.
// A Network contains Churches. A Diocese contains Parishes.
// Organizations can belong to multiple parent organizations.

export type OrganizationType =
  | 'church'
  | 'network'
  | 'ministry'
  | 'school'
  | 'bible_college'
  | 'business'
  | 'publisher'
  | 'mission_organization'
  | 'conference'
  | 'nonprofit'
  | 'media_ministry'

export type OrgRelationshipType = 'member' | 'partner' | 'affiliate' | 'subsidiary'

// Branding is configuration, not code.
// Every organization gets this contract — no org-specific overrides.
export interface OrgBranding {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string | null
  bannerUrl: string | null
  customDomain: string | null
  // Resolved via Cloudflare for SaaS — no cert management needed
  customDomainVerified: boolean
}

export interface OrgFeatureFlags {
  giving: boolean
  events: boolean
  groups: boolean
  prayer: boolean
  media: boolean
  courses: boolean
  messaging: boolean
  volunteers: boolean
  livestream: boolean
  resources: boolean
  memberDirectory: boolean
  [key: string]: boolean
}

export interface Organization {
  id: string
  slug: string
  name: string
  type: OrganizationType
  description: string | null
  branding: OrgBranding
  features: OrgFeatureFlags
  verified: boolean
  memberCount: number
  createdAt: string
  // Graph edges — resolved separately, not embedded
  // parentIds and childIds come from org_relationships table
}

// Graph edge between organizations
export interface OrgRelationship {
  parentOrgId: string
  childOrgId: string
  relationshipType: OrgRelationshipType
  establishedAt: string
}

// Resolved org node for UI rendering — includes its graph context
export interface OrgNode extends Organization {
  parents: Array<{ id: string; name: string; type: OrganizationType; relationshipType: OrgRelationshipType }>
  children: Array<{ id: string; name: string; type: OrganizationType; relationshipType: OrgRelationshipType; memberCount: number }>
  depth: number // Distance from root in this traversal
}
