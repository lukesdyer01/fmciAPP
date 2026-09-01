import { useQuery } from '@tanstack/react-query'
import { api } from './server'

export interface ActiveMember {
  id: string
  name: string
  avatarUrl: string
  title: string
  church: string
  lastActiveAt: string
}

// Pings the backend every 60s while the app is open so this user shows up
// in other members' "Active Now" widget. Runs globally (not gated to any
// one view) — being active anywhere in the app counts as active.
export function useHeartbeat() {
  useQuery({
    queryKey: ['heartbeat'],
    queryFn: () => api('/heartbeat', { method: 'POST' }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
}

export function useActiveMembers() {
  return useQuery({
    queryKey: ['members', 'active'],
    queryFn: () => api<ActiveMember[]>('/members/active'),
    refetchInterval: 30_000,
  })
}
