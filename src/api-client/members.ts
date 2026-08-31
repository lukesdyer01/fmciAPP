// API client for member directory.
// In production: GET /api/v1/members?org=fmci&region=&role=&q=
// Typed response matches the server contract — swap fetch URL to go live.

import { useQuery } from '@tanstack/react-query'
import type { BadgeVariant } from '../components/Badge'

export interface Member {
  id: string
  name: string
  title: string
  church: string
  location: string
  region: string
  avatar: string
  coverColor: string
  badges: BadgeVariant[]
  callings: string[]
  connectionDegree: 1 | 2 | 3
  mutualConnections: number
}

async function fetchMembers(_params: { q?: string; region?: string; role?: string }): Promise<Member[]> {
  return []
}

export const memberKeys = {
  all: ['members'] as const,
  list: (params: { q?: string; region?: string; role?: string }) => [...memberKeys.all, params] as const,
}

export function useMembers(params: { q?: string; region?: string; role?: string } = {}) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => fetchMembers(params),
    placeholderData: prev => prev,
  })
}
