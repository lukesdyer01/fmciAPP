import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './server'
import { adaptPost, type FeedPost } from './posts'
import { useAuth } from '../providers/AuthProvider'
import type { CommentReaction } from './comments'
export interface ReactionNotification {
 id: string
 actorName: string
 actorId?: string
 kind?: 'signup' | 'reaction' | 'mention' | 'wall_post' | 'wall_comment' | 'comment' | 'reply'
 reaction: CommentReaction | null
 createdAt: string
 readAt: string | null
 commentId: string | null
 preview: string
 post: FeedPost | null
}
export function useNotifications() {
 const {currentUser}=useAuth()
 return useQuery({queryKey:['notifications',currentUser?.id],queryFn:async()=>{
  const rows=await api<ReactionNotification[]>('/notifications')
  return rows.map(row=>({...row,post:row.post ? adaptPost(row.post,0) : null}))
 },refetchInterval:15_000})
}
export function useReadNotification() {
 const qc=useQueryClient()
 return useMutation({mutationFn:({id,createdAt}:ReactionNotification)=>api(`/notifications/${encodeURIComponent(id)}/read`,{method:'POST',body:JSON.stringify({createdAt})}),onSuccess:()=>qc.invalidateQueries({queryKey:['notifications']})})
}

export function useClearNotifications() {
 const qc=useQueryClient()
 return useMutation({
  mutationFn:(items: ReactionNotification[])=>api('/notifications/clear',{method:'POST',body:JSON.stringify({items:items.map(({id,createdAt})=>({id,createdAt}))})}),
  onSettled:()=>qc.invalidateQueries({queryKey:['notifications']}),
 })
}
