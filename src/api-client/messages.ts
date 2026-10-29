import { useNetworkSettings } from './features'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './server'

export interface ConversationSummary {
  kind?: 'direct' | 'group'
  muted?: boolean
  participantCount?: number
  id: string
  otherUser: { id: string; name: string; avatarUrl: string }
  lastMessage: { text: string; senderId: string; createdAt: string } | null
  unreadCount: number
  updatedAt: string
}

export interface Message {
  id: string
  senderId: string
  text: string
  createdAt: string
}

export const messageKeys = {
  all: ['conversations'] as const,
  list: () => [...messageKeys.all, 'list'] as const,
  thread: (id: string) => [...messageKeys.all, 'thread', id] as const,
}

type GroupSummary = { id: string; name: string; participantCount: number; muted: boolean; archived: boolean; lastMessage: ConversationSummary['lastMessage']; unreadCount: number; updatedAt: string }
async function fetchConversationList(archived: boolean, groupsEnabled: boolean) {
  const direct = await api<ConversationSummary[]>(archived ? '/conversations?archived=1' : '/conversations')
  if (!groupsEnabled) return direct
  const groups = await api<GroupSummary[]>('/group-conversations').catch(() => [] as GroupSummary[])
  return [...direct, ...groups.filter(g => g.archived === archived).map(g => ({ ...g, id: `group:${g.id}`, kind: 'group' as const, otherUser: { id: `group:${g.id}`, name: g.name, avatarUrl: '' } }))].sort((a,b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}
export function useConversations() {
  const { data: settings } = useNetworkSettings()
  const enabled = settings?.groupMessagesEnabled === 1
  return useQuery({ queryKey: [...messageKeys.list(), enabled], queryFn: () => fetchConversationList(false, enabled), refetchInterval: 15_000 })
}
export function useArchivedConversations() {
  const { data: settings } = useNetworkSettings()
  const enabled = settings?.groupMessagesEnabled === 1
  return useQuery({ queryKey: [...messageKeys.list(), 'archived', enabled], queryFn: () => fetchConversationList(true, enabled), refetchInterval: 15_000 })
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messageKeys.thread(conversationId ?? ''),
    queryFn: () => api<Message[]>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    refetchInterval: 5_000,
  })
}

export function useStartConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (otherUserId: string) => api<ConversationSummary>('/conversations', { method: 'POST', body: JSON.stringify({ otherUserId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.list() }),
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, text }: { conversationId: string; text: string }) =>
      api<Message>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: messageKeys.thread(vars.conversationId) })
      qc.invalidateQueries({ queryKey: messageKeys.list() })
    },
  })
}

export function useArchiveConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api(`/conversations/${conversationId}/archive`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.all }),
  })
}

export function useUnarchiveConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api(`/conversations/${conversationId}/unarchive`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.all }),
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      api(`/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: messageKeys.all }),
  })
}
