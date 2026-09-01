import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './server'

export interface ConversationSummary {
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

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.list(),
    queryFn: () => api<ConversationSummary[]>('/conversations'),
    refetchInterval: 15_000,
  })
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
