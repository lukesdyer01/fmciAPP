// Org switcher — one identity, many organizations.
// Shows org hierarchy: which networks this org belongs to, and child orgs below it.

import { useState } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { ORG_REGISTRY } from '../providers/OrgThemeProvider'
import { can } from '../core/auth/permissions'
import type { PermissionContext } from '../core/types/permissions'

const ORG_HIERARCHY: Record<string, { parents: string[]; children: string[] }> = {
  org_fmci: { parents: [], children: [] },
}

interface Props {
  onClose: () => void
}

export default function OrgSwitcher({ onClose }: Props) {
  const { activeOrgId, setActiveOrg, currentMembership, currentUser } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(activeOrgId)

  const myOrgIds = ['org_fmci']

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      backgroundColor: 'var(--color-scrim)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          width: '100%', maxWidth: '480px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '20px',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-serif)' }}>
            Switch Organization
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--color-text-secondary)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>✕</button>
        </div>

        {myOrgIds.map(orgId => {
          const org = ORG_REGISTRY[orgId]
          if (!org) return null
          const hierarchy = ORG_HIERARCHY[orgId]
          const isActive = activeOrgId === orgId
          const isExpanded = expandedId === orgId

          const ctx: PermissionContext = {
            platformRole: currentUser?.platformRole ?? 'user',
            orgRole: currentMembership?.organizationId === orgId ? currentMembership.orgRole : null,
            groupRole: null,
            isResourceOwner: false,
            orgFeatures: org.features as Record<string, boolean>,
          }
          const canManage = can('manage_settings', 'organization', ctx).allowed

          return (
            <div
              key={orgId}
              style={{
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${isActive ? 'var(--color-brand-gold)' : 'var(--color-border)'}`,
                marginBottom: '10px',
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Org row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--color-brand-gold-tint)' : 'var(--color-surface)',
                }}
                onClick={() => {
                  setActiveOrg(orgId)
                  setExpandedId(isExpanded ? null : orgId)
                }}
              >
                {/* Color swatch = org brand */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                  backgroundColor: org.branding.primaryColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {org.type === 'church' ? '⛪' : org.type === 'network' ? '🌐' : org.type === 'mission_organization' ? '🌍' : '🏛️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>{org.name}</span>
                    {org.verified && <span style={{ fontSize: '14px', color: 'var(--color-brand-gold)' }}>✓</span>}
                    {isActive && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--color-brand-gold)', color: '#fff',
                      }}>Active</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                    {org.type.replace('_', ' ')} · {(org.memberCount ?? 0).toLocaleString()} members
                  </div>
                </div>
                <span style={{ fontSize: '16px', color: 'var(--color-text-muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
              </div>

              {/* Hierarchy panel */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 14px', backgroundColor: 'var(--color-bg)' }}>
                  {/* Parent orgs */}
                  {hierarchy.parents.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Member of
                      </div>
                      {hierarchy.parents.map(parentId => {
                        const parent = ORG_REGISTRY[parentId]
                        return parent ? (
                          <div key={parentId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: parent.branding.primaryColor }} />
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{parent.name}</span>
                            <span>({parent.type.replace('_', ' ')})</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}

                  {/* Child orgs */}
                  {hierarchy.children.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        Contains
                      </div>
                      {hierarchy.children.map(childId => {
                        const child = ORG_REGISTRY[childId]
                        return child ? (
                          <div key={childId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: child.branding.primaryColor }} />
                            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{child.name}</span>
                            <span>({(child.memberCount ?? 0).toLocaleString()} members)</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}

                  {/* Custom domain */}
                  {org.branding.customDomain && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                      <span>🌐</span>
                      <span style={{ fontFamily: 'monospace' }}>{org.branding.customDomain}</span>
                      {org.branding.customDomainVerified && <span style={{ color: 'var(--color-praise)' }}>✓ Verified</span>}
                    </div>
                  )}

                  {/* Org admin action */}
                  {canManage && (
                    <button style={{
                      width: '100%', marginTop: '4px', padding: '7px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)', background: 'none',
                      color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    }}>
                      ⚙️ Manage Organization
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
