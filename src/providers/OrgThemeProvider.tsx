// OrgThemeProvider — white-label branding without org-specific code.
// All customization flows through OrgBranding config.
// CSS vars are injected on a scoped wrapper — never globally — so
// platform UI (topbar, auth screens) always uses platform brand tokens.
// Custom domains: resolved via Cloudflare for SaaS at the edge.

import {
  createContext, useContext, useEffect, useRef,
  useState, type ReactNode,
} from 'react'
import type { Organization, OrgBranding, OrgFeatureFlags } from '../core/types/organization'

interface OrgContextValue {
  org: Organization | null
  branding: OrgBranding | null
  features: OrgFeatureFlags
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  branding: null,
  features: DEFAULT_FEATURES(),
})

function DEFAULT_FEATURES(): OrgFeatureFlags {
  return {
    giving: true, events: true, groups: true, prayer: true,
    media: true, courses: true, messaging: true, volunteers: true,
    livestream: true, resources: true, memberDirectory: true,
  }
}

// Org registry — in production: fetched from API by slug or custom domain
export const ORG_REGISTRY: Record<string, Organization> = {
  org_fmci: {
    id: 'org_fmci',
    slug: 'fmci',
    name: 'FMCI Network',
    type: 'network',
    description: 'Federation of Ministries & Churches International — connecting the global Body of Christ.',
    verified: true,
    memberCount: 0,
    createdAt: '2023-06-01T00:00:00Z',
    branding: {
      primaryColor: '#7B2D8B',
      secondaryColor: '#4A1265',
      accentColor: '#CE93D8',
      logoUrl: null,
      bannerUrl: null,
      customDomain: 'fmci.global',
      customDomainVerified: true,
    },
    features: { ...DEFAULT_FEATURES(), volunteers: false },
  },
}

// Derive a lighter tint and hover color from a hex primary
function deriveColorVariants(hex: string): { soft: string; tint: string; hover: string } {
  // Simple luminance-based derivation — in production use a proper color library
  return {
    soft: hex + '33',   // 20% opacity version
    tint: hex + '11',   // 7% opacity version
    hover: hex + 'CC',  // 80% opacity for hover
  }
}

interface Props {
  orgId: string | null
  children: ReactNode
}

export function OrgThemeProvider({ orgId, children }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const org = orgId ? ORG_REGISTRY[orgId] ?? null : null

  // Inject CSS vars scoped to the wrapper — never globally
  useEffect(() => {
    const el = wrapperRef.current
    if (!el || !org) return
    const { primaryColor, secondaryColor } = org.branding
    const { soft, tint, hover } = deriveColorVariants(primaryColor)
    el.style.setProperty('--org-primary', primaryColor)
    el.style.setProperty('--org-primary-soft', soft)
    el.style.setProperty('--org-primary-tint', tint)
    el.style.setProperty('--org-primary-hover', hover)
    el.style.setProperty('--org-secondary', secondaryColor)
    el.setAttribute('data-org-theme', org.slug)

    return () => {
      el.removeAttribute('style')
      el.removeAttribute('data-org-theme')
    }
  }, [org])

  return (
    <OrgContext.Provider value={{
      org,
      branding: org?.branding ?? null,
      features: org?.features ?? DEFAULT_FEATURES(),
    }}>
      <div ref={wrapperRef} style={{ minHeight: '100%' }}>
        {children}
      </div>
    </OrgContext.Provider>
  )
}

export function useOrg(): OrgContextValue {
  return useContext(OrgContext)
}

// Hook for org-aware permission context — used by usePermission
export function useOrgFeature(feature: keyof OrgFeatureFlags): boolean {
  const { features } = useOrg()
  return features[feature]
}
