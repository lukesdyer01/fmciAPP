// Only serialize notifications whose targets and actors are still visible.
export function visibleReactionNotifications(rows:any[],posts:any[],blocked:Set<string>,users:any[]) {
 return rows.flatMap(notification=>{
  const post=posts.find(p=>p.id===notification.post_id)
  const comment=post?.commentsList?.find((cm:any)=>cm.id===notification.comment_id)
  if(!post || blocked.has(notification.actor_id) || (notification.comment_id&&!comment))return []
  const actor=users.find(u=>u.id===notification.actor_id)
  return [{id:notification.id,actorName:actor?.user_metadata?.full_name??actor?.user_metadata?.name??'A member',reaction:notification.reaction,createdAt:notification.created_at,readAt:notification.read_at,commentId:notification.comment_id,preview:comment?.text??post.body??'',post}]
 })
}
