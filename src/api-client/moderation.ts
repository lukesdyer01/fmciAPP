import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './server'
import { feedKeys, type FeedPost } from './posts'
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

export type ReportStatus = 'open' | 'actioned' | 'dismissed'

export interface ReportedMember {
  id: string
  name: string
  avatarUrl: string
}

// The content a report points at, resolved server-side. Null once the post or
// comment has been deleted.
export interface ReportTargetPreview {
  kind: 'post' | 'comment'
  text: string
  createdAt: string | null
  image?: string | null
  type?: string
  postId?: string
  postText?: string
}

export interface ContentReport {
  id: string
  targetType: ReportTargetType
  targetId: string
  targetAuthorId: string | null
  reason: ReportReason
  note: string
  reporterId: string
  status: ReportStatus
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  reporter: ReportedMember | null
  targetAuthor: ReportedMember | null
  targetPreview: ReportTargetPreview | null
}

export const moderationKeys = {
  all: ['moderation'] as const,
  blocks: () => [...moderationKeys.all, 'blocks'] as const,
  reports: () => [...moderationKeys.all, 'reports'] as const,
}

export function useReportContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (report: {
      targetType: ReportTargetType
      targetId: string
      targetAuthorId?: string
      reason: ReportReason
      note?: string
    }) => api('/reports', { method: 'POST', body: JSON.stringify(report) }),
    onSuccess: (_data, report) => {
      // Reporting something hides it from the reporter for good. The server
      // filters it out of GET /posts from here on; this drops it from the cache
      // straight away so it disappears the moment the modal confirms.
      if (report.targetType === 'post') {
        qc.setQueryData<FeedPost[]>(feedKeys.posts(), old => old?.filter(p => p.id !== report.targetId) ?? [])
      } else if (report.targetType === 'comment') {
        qc.setQueryData<FeedPost[]>(feedKeys.posts(), old => old?.map(p => (
          p.commentsList?.some(cm => cm.id === report.targetId)
            ? { ...p, commentsList: p.commentsList.filter(cm => cm.id !== report.targetId), comments: Math.max(0, p.comments - 1) }
            : p
        )) ?? [])
      }
      qc.invalidateQueries({ queryKey: feedKeys.all })
      qc.invalidateQueries({ queryKey: moderationKeys.reports() })
    },
  })
}

// Admin/moderator review queue. Members never reach these two — the server
// answers 403 for anyone else.
export function useReports() {
  return useQuery({
    queryKey: moderationKeys.reports(),
    queryFn: () => api<ContentReport[]>('/reports'),
    staleTime: 1000 * 30,
  })
}

export function useUpdateReportStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      api(`/reports/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: moderationKeys.reports() }),
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
