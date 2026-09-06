// Shared comment shape — used by both feed-post comments (src/api-client/posts.ts)
// and event comments, so both can render through the same <CommentThread />.
export interface FeedComment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string
  text: string
  createdAt: string
}
