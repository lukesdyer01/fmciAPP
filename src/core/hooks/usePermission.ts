// React hook that wraps the authorization kernel.
// Memoized so permission checks don't re-run on every render.

import { useMemo } from 'react'
import { can, canAll, canAny } from '../auth/permissions'
import type { Action, PermissionContext, ResourceType } from '../types/permissions'
import { useAuth } from '../../providers/AuthProvider'
import { useOrg } from '../../providers/OrgThemeProvider'

export function usePermission(action: Action, resource: ResourceType) {
  const { currentUser, currentMembership } = useAuth()
  const { org } = useOrg()

  return useMemo(() => {
    if (!currentUser) return { allowed: false, reason: 'Not authenticated', grantedBy: 'denied' as const }

    const ctx: PermissionContext = {
      platformRole: currentUser.platformRole,
      orgRole: currentMembership?.orgRole ?? null,
      groupRole: null,
      isResourceOwner: false,
      orgFeatures: (org?.features ?? {}) as Record<string, boolean>,
    }

    return can(action, resource, ctx)
  }, [currentUser, currentMembership, org, action, resource])
}

export function useCanCreate(resource: ResourceType) {
  return usePermission('create', resource)
}

export function useCanModerate(resource: ResourceType) {
  return usePermission('moderate', resource)
}

export function useIsOrgAdmin() {
  const { currentMembership } = useAuth()
  return useMemo(() => {
    const role = currentMembership?.orgRole
    return role === 'admin' || role === 'owner'
  }, [currentMembership])
}

export function useIsOrgOwner() {
  const { currentMembership } = useAuth()
  return useMemo(() => currentMembership?.orgRole === 'owner', [currentMembership])
}

// Check multiple actions at once — returns true only if all pass
export function useCanAll(actions: Action[], resource: ResourceType) {
  const { currentUser, currentMembership } = useAuth()
  const { org } = useOrg()

  return useMemo(() => {
    if (!currentUser) return false
    const ctx: PermissionContext = {
      platformRole: currentUser.platformRole,
      orgRole: currentMembership?.orgRole ?? null,
      groupRole: null,
      isResourceOwner: false,
      orgFeatures: (org?.features ?? {}) as Record<string, boolean>,
    }
    return canAll(actions, resource, ctx)
  }, [currentUser, currentMembership, org, actions, resource])
}
