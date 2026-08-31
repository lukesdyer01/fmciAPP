import type { PlatformRole, OrgRole, GroupRole } from './user'

// Every permission check flows through can(user, action, resource).
// Never scattered role checks in components.

export type ResourceType =
  | 'post'
  | 'comment'
  | 'prayer_request'
  | 'event'
  | 'group'
  | 'organization'
  | 'member'
  | 'resource'
  | 'media'
  | 'giving_record'
  | 'audit_log'
  | 'feature_settings'

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'publish'
  | 'moderate'
  | 'invite'
  | 'manage_members'
  | 'manage_billing'
  | 'manage_settings'
  | 'view_analytics'
  | 'export_data'
  | 'manage_features'

export interface PermissionContext {
  platformRole: PlatformRole
  orgRole: OrgRole | null       // null if user is not a member of this org
  groupRole: GroupRole | null   // null if resource is not group-scoped
  isResourceOwner: boolean      // true if the user created this resource
  orgFeatures: Record<string, boolean>
}

// Returned by can() — explains why access was granted or denied
export interface PermissionResult {
  allowed: boolean
  reason: string
  grantedBy: 'platform_role' | 'org_role' | 'group_role' | 'ownership' | 'denied'
}
