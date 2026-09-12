// Shared search logic for the desktop dropdown (Topbar) and the mobile
// full-screen overlay. Fetches the searchable collections once and filters
// client-side — the same behavior the dropdown always had, now in one place.

import { useEffect, useState } from 'react'
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
  total: number
}

export function useSearchResults(query: string): SearchResults {
  const [members, setMembers] = useState<SearchMember[]>([])
  const [events, setEvents] = useState<SearchEvent[]>([])
  const [orgs, setOrgs] = useState<SearchOrg[]>([])
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [resources, setResources] = useState<SearchResource[]>([])

  useEffect(() => {
    api<SearchMember[]>('/members').then(setMembers).catch(() => {})
    api<SearchEvent[]>('/events').then(setEvents).catch(() => {})
    api<SearchOrg[]>('/orgs').then(setOrgs).catch(() => {})
    api<SearchGroup[]>('/groups').then(setGroups).catch(() => {})
    api<SearchResource[]>('/resources').then(setResources).catch(() => {})
  }, [])

  const q = query.trim().toLowerCase()
  const matchMembers = members.filter(m => m.name?.toLowerCase().includes(q) || m.church?.toLowerCase().includes(q)).slice(0, 5)
  const matchEvents = events.filter(e => e.title?.toLowerCase().includes(q)).slice(0, 5)
  const matchOrgs = orgs.filter(o => o.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchGroups = groups.filter(g => g.name?.toLowerCase().includes(q)).slice(0, 5)
  const matchResources = resources.filter(r => r.title?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q)).slice(0, 5)
  const total = matchMembers.length + matchEvents.length + matchOrgs.length + matchGroups.length + matchResources.length

  return { members: matchMembers, events: matchEvents, orgs: matchOrgs, groups: matchGroups, resources: matchResources, total }
}