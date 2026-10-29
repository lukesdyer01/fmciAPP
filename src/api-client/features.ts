import { useQuery } from '@tanstack/react-query'
import { api } from './server'

export interface NetworkSettings {
  inviteOnly: boolean
  openRegistration: boolean
  groupMessagesEnabled: 0 | 1
  savedPostsEnabled: 0 | 1
  photoStoriesEnabled: boolean
}

export const networkSettingsKey = ['network-settings'] as const

export function useNetworkSettings(enabled = true) {
  return useQuery({
    queryKey: networkSettingsKey,
    queryFn: () => api<NetworkSettings>('/settings'),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
