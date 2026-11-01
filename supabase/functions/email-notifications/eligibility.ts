// Recheck live visibility and unread state immediately before handing mail to Resend.
export async function emailDestination(
  db: any,
  job: any,
): Promise<string | null> {
  const kv = async (key: string) => {
    const { data, error } = await db
      .from("kv_store_5bb4c08d")
      .select("value")
      .eq("key", key)
      .maybeSingle()
    if (error) throw error
    return data?.value
  }
  const blocks = (await kv("user_blocks")) ?? {}
  const blocked = (a: string, b: string) =>
    (blocks[a] ?? []).includes(b) || (blocks[b] ?? []).includes(a)
  if (blocked(job.recipient_id, job.actor_id)) return null
  if (job.kind === "group") {
    if ((await kv("group_messages_enabled")) !== 1) return null
    const { data: me, error } = await db
      .from("network_group_members")
      .select("*")
      .eq("conversation_id", job.conversation_id)
      .eq("user_id", job.recipient_id)
      .maybeSingle()
    if (error) throw error
    if (
      !me ||
      me.muted ||
      BigInt(me.last_read_id) >= BigInt(job.message_id) ||
      BigInt(me.history_after) >= BigInt(job.message_id) ||
      (me.hidden_after != null &&
        BigInt(me.hidden_after) >= BigInt(job.message_id))
    )
      return null
    const { data: msg, error: err } = await db
      .from("network_group_messages")
      .select("id")
      .eq("id", job.message_id)
      .eq("conversation_id", job.conversation_id)
      .maybeSingle()
    if (err) throw err
    return msg
      ? `https://fmci.network/?groupConversation=${encodeURIComponent(job.conversation_id)}&message=${job.message_id}`
      : null
  }
  if (job.kind === "direct") {
    const conv = ((await kv("conversations")) ?? []).find(
      (c: any) => c.id === job.conversation_id,
    )
    const msg = conv?.messages?.find((m: any) => m.id === job.message_id)
    if (
      !msg ||
      !conv.participantIds?.includes(job.recipient_id) ||
      conv.deletedBy?.[job.recipient_id] ||
      conv.mutedBy?.[job.recipient_id] ||
      conv.lastReadAt?.[job.recipient_id] >= msg.createdAt
    )
      return null
    return `https://fmci.network/?messageFrom=${encodeURIComponent(job.actor_id)}&message=${encodeURIComponent(job.message_id)}`
  }
  const { data: notice, error } = await db
    .from("network_reaction_notifications")
    .select("*")
    .eq("id", job.notification_id)
    .eq("recipient_id", job.recipient_id)
    .maybeSingle()
  if (error) throw error
  if (!notice || notice.read_at) return null
  const post = ((await kv("posts")) ?? []).find(
    (p: any) => p.id === notice.post_id,
  )
  if (!post || blocked(job.recipient_id, post.authorId)) return null
  const comment = post.comments?.find((c: any) => c.id === notice.comment_id)
  if (
    notice.comment_id &&
    (!comment || blocked(job.recipient_id, comment.authorId))
  )
    return null
  const reports = (await kv("content_reports")) ?? []
  if (
    reports.some(
      (r: any) =>
        r.reporterId === job.recipient_id &&
        ((r.targetType === "post" && r.targetId === post.id) ||
          (r.targetType === "comment" && r.targetId === notice.comment_id)),
    )
  )
    return null
  if (post.visibility === "private") {
    const org = ((await kv("orgs")) ?? []).find((o: any) => o.id === post.orgId)
    if (!org?.members?.some((m: any) => m.userId === job.recipient_id))
      return null
  }
  return `https://fmci.network/?notification=${encodeURIComponent(notice.id)}`
}
