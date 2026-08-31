// Authorization kernel.
// Single source of truth for every permission decision on the platform.
// Never call this in a loop — memoize results in components with useMemo.

import type { Action, PermissionContext, PermissionResult, ResourceType } from '../types/permissions'

// Platform superadmins and moderators bypass org-level checks for moderation tasks.
const PLATFORM_SUPERADMIN_ACTIONS: Action[] = [
  'read', 'moderate', 'delete', 'view_analytics', 'export_data',
  'manage_members', 'manage_settings', 'manage_features',
]

const PLATFORM_MODERATOR_ACTIONS: Action[] = [
  'read', 'moderate', 'delete',
]

// What each org role can do — additive, ordered least to most privileged.
const ORG_ROLE_PERMISSIONS: Record<string, Action[]> = {
  guest:  ['read'],
  member: ['read', 'create'],
  leader: ['read', 'create', 'update', 'invite', 'view_analytics'],
  admin:  ['read', 'create', 'update', 'delete', 'publish', 'moderate', 'invite', 'manage_members', 'view_analytics', 'export_data'],
  owner:  ['read', 'create', 'update', 'delete', 'publish', 'moderate', 'invite', 'manage_members', 'manage_billing', 'manage_settings', 'view_analytics', 'export_data', 'manage_features'],
}

// Resources that require specific feature flags to be enabled on the org.
const FEATURE_GATED_RESOURCES: Partial<Record<ResourceType, string>> = {
  giving_record: 'giving',
  media: 'media',
  event: 'events',
  group: 'groups',
}

export function can(
  action: Action,
  resource: ResourceType,
  ctx: PermissionContext,
): PermissionResult {
  const deny = (reason: string): PermissionResult =>
    ({ allowed: false, reason, grantedBy: 'denied' })

  // 1. Check feature flags — even admins cannot access disabled features.
  const requiredFeature = FEATURE_GATED_RESOURCES[resource]
  if (requiredFeature && !ctx.orgFeatures[requiredFeature]) {
    return deny(`The "${requiredFeature}" feature is not enabled for this organization.`)
  }

  // 2. Platform superadmin — full access to moderation actions.
  if (ctx.platformRole === 'superadmin' && PLATFORM_SUPERADMIN_ACTIONS.includes(action)) {
    return { allowed: true, reason: 'Platform superadmin', grantedBy: 'platform_role' }
  }

  // 3. Platform moderator — limited cross-org access.
  if (ctx.platformRole === 'moderator' && PLATFORM_MODERATOR_ACTIONS.includes(action)) {
    return { allowed: true, reason: 'Platform moderator', grantedBy: 'platform_role' }
  }

  // 4. Resource owner can always read, update, or delete their own content.
  if (ctx.isResourceOwner && ['read', 'update', 'delete'].includes(action)) {
    return { allowed: true, reason: 'Resource owner', grantedBy: 'ownership' }
  }

  // 5. No org membership — public read only.
  if (!ctx.orgRole) {
    if (action === 'read') {
      return { allowed: true, reason: 'Public read access', grantedBy: 'org_role' }
    }
    return deny('You are not a member of this organization.')
  }

  // 6. Org role check.
  const allowedActions = ORG_ROLE_PERMISSIONS[ctx.orgRole] ?? []
  if (allowedActions.includes(action)) {
    return {
      allowed: true,
      reason: `Granted by org role: ${ctx.orgRole}`,
      grantedBy: 'org_role',
    }
  }

  // 7. Group role — group leaders can manage their group's content.
  if (ctx.groupRole === 'leader' && ['update', 'delete', 'moderate', 'invite'].includes(action)) {
    return { allowed: true, reason: 'Group leader', grantedBy: 'group_role' }
  }

  return deny(`Your role (${ctx.orgRole}) does not have "${action}" permission on "${resource}".`)
}

// Convenience: check multiple actions at once.
export function canAll(
  actions: Action[],
  resource: ResourceType,
  ctx: PermissionContext,
): boolean {
  return actions.every(a => can(a, resource, ctx).allowed)
}

// Convenience: check if any action is permitted.
export function canAny(
  actions: Action[],
  resource: ResourceType,
  ctx: PermissionContext,
): boolean {
  return actions.some(a => can(a, resource, ctx).allowed)
}
