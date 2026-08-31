// All content types optionally reference Scripture.
// Every object is a potential Kingdom Graph node.

export type ReactionType = 'amen' | 'pray' | 'heart' | 'praise'

export type ContentPrivacy = 'public' | 'organization' | 'friends' | 'private'

export interface ScriptureRef {
  book: string
  chapter: number
  verseStart: number
  verseEnd: number | null
  // e.g. "Jeremiah 29:11"
  displayText: string
  translation: 'ESV' | 'NIV' | 'KJV' | 'NKJV' | 'NLT' | 'CSB'
}

export interface MediaAttachment {
  id: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  thumbnailUrl: string | null
  altText: string | null
  durationSeconds: number | null
}

export interface Post {
  id: string
  authorId: string
  organizationId: string | null
  content: string
  privacy: ContentPrivacy
  scriptureRef: ScriptureRef | null
  // Every post is a graph node — these are denormalized for feed performance
  attachments: MediaAttachment[]
  reactions: Record<ReactionType, number>
  commentCount: number
  shareCount: number
  createdAt: string
  // Fan-out: this post has been written to N feed_items rows
  // The post record itself is the source of truth
}

export interface Comment {
  id: string
  postId: string
  parentCommentId: string | null // Nested replies
  authorId: string
  content: string
  reactions: Record<ReactionType, number>
  replyCount: number
  createdAt: string
}

// Feed item — pre-computed by fan-out worker, not computed at read time
export interface FeedItem {
  id: string
  recipientUserId: string
  sourceType: 'post' | 'prayer' | 'event' | 'resource_share' | 'group_update'
  sourceId: string
  // Denormalized for zero-query rendering
  score: number // Algorithmic rank score
  insertedAt: string
  expiresAt: string | null
}

export interface PrayerRequest {
  id: string
  authorId: string
  organizationId: string | null
  isAnonymous: boolean
  type: 'request' | 'praise'
  content: string
  category: string
  scriptureRef: ScriptureRef | null
  prayerCount: number
  isAnswered: boolean
  privacy: ContentPrivacy
  createdAt: string
}
