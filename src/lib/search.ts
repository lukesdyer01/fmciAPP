// Shared search logic for the desktop dropdown (Topbar) and the mobile
// full-screen overlay. Fetches the searchable collections once and filters
// client-side — the same behavior the dropdown always had, now in one place.

import { useQueries } from '@tanstack/react-query'
import { useAuth } from '../providers/AuthProvider'
import { api } from '../api-client/server'

export interface SearchMember { id: string; name: string; title: string; church: string; avatarUrl: string }
export interface SearchEvent { id: string; title: string; startDate: string; location: string }
export interface SearchOrg { id: string; name: string; type: string; location: string; img: string }
export interface SearchGroup { id: string; name: string; type: string; img: string }
export interface SearchResource { id: string; title: string; author: string; type: string }

export interface SearchResults {
  members: SearchMember[]
  events: SearchEvent[]
  orgs: SearchOrg[]
  groups: SearchGroup[]
  resources: SearchResource[]
  loading: boolean
  error: boolean
  retry: () => void
  total: number
}

export function useSearchResults(query: string): SearchResults {
  const { currentUser } = useAuth()
  const queries = useQueries({ queries: ['members','events','orgs','groups','resources'].map(collection => ({ queryKey: ['search', currentUser?.id, collection], queryFn: () => api<unknown[]>(`/${collection}`), enabled: !!currentUser })) })
  const members = (queries[0].data ?? []) as SearchMember[]
  const events = (queries[1].data ?? []) as SearchEvent[]
  const orgs = (queries[2].data ?? []) as SearchOrg[]
  const groups = (queries[3].data ?? []) as SearchGroup[]
  const resources = (queries[4].data ?? []) as SearchResource[]
  const loading = queries.some(q => q.isPending)
  const error = queries.some(q => q.isError)
  const retry = () => { queries.filter(q => q.isError).forEach(q => { void q.refetch() }) }

  const q = query.trim().toLowerCase()
  const matchMembers = members.filter(m => m.name?.toLowerCase().includes(q) || m.church?.toLowerCase().includes(q)).slice(0, 5)
  const matchEvents = events.filter(e => e.title?.toLowerCase().includes(q)).slice(0, 5)
  const matchOrgs = orgs.filter(o => o.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchGroups = groups.filter(g => g.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchResources = resources.filter(r => r.title?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q)).slice(0, 5)
  const total = matchMembers.length + matchEvents.length + matchOrgs.length + matchGroups.length + matchResources.length

  return { members: matchMembers, events: matchEvents, orgs: matchOrgs, groups: matchGroups, resources: matchResources, total, loading, error, retry }
}