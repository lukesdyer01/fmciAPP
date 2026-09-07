import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './server'
import { feedKeys } from './posts'
import { messageKeys } from './messages'

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'sexual', label: 'Sexual content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'misinformation', label: 'False information' },
  { value: 'other', label: 'Something else' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']
export type ReportTargetType = 'post' | 'comment' | 'user' | 'message'

export interface BlockedMember {
  id: string
  name: string
  avatarUrl: string
}

export const moderationKeys = {
  all: ['moderation'] as const,
  blocks: () => [...moderationKeys.all, 'blocks'] as const,
}

export function useReportContent() {
  return useMutation({
    mutationFn: (report: {
      targetType: ReportTargetType
      targetId: string
      targetAuthorId?: string
      reason: ReportReason
      note?: string
    }) => api('/reports', { method: 'POST', body: JSON.stringify(report) }),
  })
}

export function useBlockedMembers() {
  return useQuery({
    queryKey: moderationKeys.blocks(),
    queryFn: () => api<BlockedMember[]>('/blocks'),
    staleTime: 1000 * 60,
  })
}

export function useBlockMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api('/blocks', { method: 'POST', body: JSON.stringify({ userId }) }),
    onSuccess: () => {
      // The feed and message list are filtered server-side, so both have to be
      // refetched for the block to actually take effect on screen.
      qc.invalidateQueries({ queryKey: moderationKeys.all })
      qc.invalidateQueries({ queryKey: feedKeys.all })
      qc.invalidateQueries({ queryKey: messageKeys.all })
    },
  })
}

export function useUnblockMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api(`/blocks/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: moderationKeys.all })
      qc.invalidateQueries({ queryKey: feedKeys.all })
      qc.invalidateQueries({ queryKey: messageKeys.all })
    },
  })
}
