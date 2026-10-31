// Shared comment shape — used by both feed-post comments (src/api-client/posts.ts)
// and event comments, so both can render through the same <CommentThread />.
export type CommentReaction = "amen" | "pray" | "heart" | "praise"

export interface FeedComment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string
  text: string
  parentId?: string | null
  replyToId?: string | null
  reactions?: { amen: number; pray: number; heart: number; praise?: number }
  myReaction?: CommentReaction | null
  createdAt: string
}
