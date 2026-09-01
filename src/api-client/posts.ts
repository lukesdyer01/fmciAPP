import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scorePost } from '../core/feed/fanout'
import { api } from './server'
import type { BadgeVariant } from '../components/Badge'

export interface FeedPost {
  id: string
  authorId?: string
  author: string
  title: string
  church: string
  location: string
  avatar: string
  badges: BadgeVariant[]
  time: string
  recencyHours: number
  type: 'post' | 'testimony' | 'prayer' | 'announcement' | 'resource'
  content: string
  image: string | null
  imageAlt: string | null
  videoId?: string
  reactions: { amen: number; pray: number; heart: number }
  comments: number
  shares: number
  scripture?: string
  pinned?: boolean
  isFollowing?: boolean
  orgId?: string
  orgName?: string
  wallUserId?: string
  wallUserName?: string
  editedAt?: string
  prayerStatus?: 'unanswered' | 'answered'
  isAnonymous?: boolean
  testimonyCategory?: 'healing' | 'provision' | 'salvation' | 'deliverance' | 'other'
  taggedUsers?: { id: string; name: string }[]
}

function adaptPost(raw: any, index: number): FeedPost {
  if (!raw || typeof raw !== 'object') {
    return {
      id: String(index), author: 'Unknown', title: '', church: '', location: '', avatar: '',
      badges: [], time: '', recencyHours: 0, type: 'post', content: '',
      image: null, imageAlt: null, reactions: { amen: 0, pray: 0, heart: 0 },
      comments: 0, shares: 0, pinned: false, isFollowing: false,
    }
  }
  const createdAt = raw.createdAt ? new Date(raw.createdAt).getTime() : Date.now()
  const recencyHours = (Date.now() - createdAt) / 3_600_000
  const authorObj = typeof raw.author === 'object' && raw.author !== null ? raw.author : {}
  const rxn = raw.reactions && typeof raw.reactions === 'object' ? raw.reactions : {}
  return {
    id: raw.id != null ? String(raw.id) : String(index),
    authorId: raw.authorId,
    author: typeof raw.author === 'string' ? raw.author
      : (authorObj.name ?? authorObj.full_name ?? authorObj.displayName ?? authorObj.username ?? authorObj.email ?? ''),
    title: raw.title ?? authorObj.title ?? '',
    church: raw.church ?? authorObj.church ?? '',
    location: raw.location ?? authorObj.location ?? '',
    avatar: raw.avatar ?? authorObj.avatarUrl ?? '',
    badges: Array.isArray(raw.badges) ? raw.badges : [],
    time: raw.time ?? (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : ''),
    recencyHours,
    type: raw.type ?? 'post',
    content: typeof raw.content === 'string' ? raw.content : (typeof raw.body === 'string' ? raw.body : ''),
    image: raw.image ?? null,
    imageAlt: raw.imageAlt ?? null,
    videoId: raw.videoId,
    reactions: {
      amen: Number(rxn.amen ?? rxn['🙏'] ?? 0) || 0,
      pray: Number(rxn.pray ?? rxn['🙏'] ?? 0) || 0,
      heart: Number(rxn.heart ?? rxn['❤️'] ?? 0) || 0,
    },
    comments: Number(raw.comments ?? raw.commentCount ?? 0) || 0,
    shares: Number(raw.shares ?? 0) || 0,
    scripture: raw.scripture,
    pinned: raw.pinned ?? false,
    isFollowing: raw.isFollowing ?? false,
    orgId: raw.orgId,
    orgName: raw.orgName,
    wallUserId: raw.wallUserId,
    wallUserName: raw.wallUserName,
    editedAt: raw.editedAt,
    prayerStatus: raw.prayerStatus,
    isAnonymous: raw.isAnonymous,
    testimonyCategory: raw.testimonyCategory,
    taggedUsers: Array.isArray(raw.taggedUsers) ? raw.taggedUsers : [],
  }
}

async function fetchFeedPosts(filter: 'network' | 'following'): Promise<FeedPost[]> {
  const raw = await api<any[]>('/posts')
  const posts = (Array.isArray(raw) ? raw : []).map(adaptPost)
  const pool = filter === 'following' ? posts.filter(p => p.isFollowing) : posts
  return [...pool].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return scorePost({
      recencyHours: b.recencyHours, reactionCount: b.reactions.amen + b.reactions.pray + b.reactions.heart,
      commentCount: b.comments, shareCount: b.shares, isFromOrg: true, isFromFriend: false, hasPrayer: b.type === 'prayer',
    }) - scorePost({
      recencyHours: a.recencyHours, reactionCount: a.reactions.amen + a.reactions.pray + a.reactions.heart,
      commentCount: a.comments, shareCount: a.shares, isFromOrg: true, isFromFriend: false, hasPrayer: a.type === 'prayer',
    })
  })
}

export const feedKeys = {
  all: ['feed'] as const,
  posts: (filter: 'network' | 'following') => [...feedKeys.all, 'posts', filter] as const,
}

export function useFeedPosts(filter: 'network' | 'following' = 'network') {
  return useQuery({
    queryKey: feedKeys.posts(filter),
    queryFn: () => fetchFeedPosts(filter),
    staleTime: 1000 * 30,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (post: Pick<FeedPost, 'author' | 'avatar' | 'title' | 'church' | 'location' | 'badges' | 'type' | 'content' | 'isFollowing'> & { orgId?: string; orgName?: string; wallUserId?: string; wallUserName?: string; image?: string; imageAlt?: string; videoId?: string; isAnonymous?: boolean; testimonyCategory?: string; prayerStatus?: 'unanswered' | 'answered'; taggedUsers?: { id: string; name: string }[] }) =>
      api<FeedPost>('/posts', { method: 'POST', body: JSON.stringify(post) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

export function useEditPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      api<FeedPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

export function useSetPrayerStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: 'unanswered' | 'answered' }) =>
      api<FeedPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ prayerStatus: status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => api(`/posts/${postId}`, { method: 'DELETE' }),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: feedKeys.all })
      const prev = {
        network: qc.getQueryData<FeedPost[]>(feedKeys.posts('network')),
        following: qc.getQueryData<FeedPost[]>(feedKeys.posts('following')),
      }
      for (const filter of ['network', 'following'] as const) {
        qc.setQueryData<FeedPost[]>(feedKeys.posts(filter), old => old?.filter(p => p.id !== postId) ?? [])
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev.network) qc.setQueryData(feedKeys.posts('network'), ctx.prev.network)
      if (ctx?.prev.following) qc.setQueryData(feedKeys.posts('following'), ctx.prev.following)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: feedKeys.all })
    },
  })
}

export function useReactToPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, reaction, delta }: { postId: string; reaction: 'amen' | 'pray' | 'heart'; delta: 1 | -1 }) =>
      api(`/posts/${postId}/react`, { method: 'POST', body: JSON.stringify({ reaction, delta }) }),
    onMutate: async ({ postId, reaction, delta }) => {
      await qc.cancelQueries({ queryKey: feedKeys.all })
      const prev = {
        network: qc.getQueryData<FeedPost[]>(feedKeys.posts('network')),
        following: qc.getQueryData<FeedPost[]>(feedKeys.posts('following')),
      }
      for (const filter of ['network', 'following'] as const) {
        qc.setQueryData<FeedPost[]>(feedKeys.posts(filter), old =>
          old?.map(p => p.id === postId
            ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction] + delta } }
            : p) ?? []
        )
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev.network) qc.setQueryData(feedKeys.posts('network'), ctx.prev.network)
      if (ctx?.prev.following) qc.setQueryData(feedKeys.posts('following'), ctx.prev.following)
    },
  })
}
