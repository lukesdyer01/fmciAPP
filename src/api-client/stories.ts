import { useQuery } from '@tanstack/react-query'
import { api } from './server'
export type StoryReaction = 'heart' | 'amen' | 'pray'
export interface Story {
  id: string; authorId: string; authorName: string; authorAvatar: string
  caption: string; createdAt: string; expiresAt: string; seen: boolean; reaction: StoryReaction | null
}
export interface StoryViewer { id: string; name: string; reaction: StoryReaction | null }
export const storyKeys = { all: ['stories'] as const }
export function useStories(userId: string | undefined) {
  return useQuery({ queryKey: [...storyKeys.all, userId], queryFn: () => api<Story[]>('/stories'), enabled: !!userId, refetchInterval: 30_000 })
}
export async function publishStory(id: string, photo: Blob, caption: string) {
  await api('/stories/uploads', { method: 'POST', body: JSON.stringify({ id }) })
  return api(`/stories/${id}/photo`, { method: 'PUT', body: photo, headers: { 'Content-Type': 'image/jpeg', 'X-Story-Caption': encodeURIComponent(caption) } })
}
