// Fan-out-on-write feed architecture.
//
// When a user with 50,000 followers posts, we do NOT compute their feed on read.
// Instead, a background worker writes a feed_item row for each follower immediately.
// Feed reads are O(1) — just SELECT from feed_items WHERE recipient_id = ?
//
// In production this worker runs as a Supabase Edge Function triggered by
// a Postgres AFTER INSERT trigger on the posts table, using a job queue
// (Cloudflare Queues or BullMQ) for durability at high fan-out counts.
//
// This file defines the shapes and simulates the architecture for the frontend.

import type { FeedItem } from '../types/content'

export type FeedSource = 'following' | 'organization' | 'group' | 'suggested'

export interface FeedPage {
  items: FeedItem[]
  nextCursor: string | null
  hasMore: boolean
}

// Scoring formula — higher score = higher in feed.
// Weights are tuned for spiritual community engagement patterns.
export function scorePost(params: {
  recencyHours: number
  reactionCount: number
  commentCount: number
  shareCount: number
  isFromOrg: boolean
  isFromFriend: boolean
  hasPrayer: boolean
}): number {
  const { recencyHours, reactionCount, commentCount, shareCount, isFromOrg, isFromFriend, hasPrayer } = params

  // Time decay: posts older than 48h fall rapidly
  const decayFactor = 1 / (1 + Math.pow(recencyHours / 12, 1.5))

  const engagementScore =
    reactionCount * 1.0 +
    commentCount * 2.5 +   // Comments signal deeper engagement
    shareCount * 3.0        // Shares signal high value

  const contextBoost =
    (isFromFriend ? 1.4 : 1.0) *
    (isFromOrg ? 1.2 : 1.0) *
    (hasPrayer ? 1.3 : 1.0) // Prayer content gets a boost in a spiritual community

  return engagementScore * decayFactor * contextBoost
}

// Simulated feed data for the frontend — in production this is a
// paginated SELECT from feed_items joined with posts, users, organizations.
export const SIMULATED_FEED_LATENCY_MS = 120

export function paginateFeed(allItems: FeedItem[], cursor: string | null, pageSize = 10): FeedPage {
  const sorted = [...allItems].sort((a, b) => b.score - a.score)
  const startIndex = cursor ? sorted.findIndex(i => i.id === cursor) + 1 : 0
  const page = sorted.slice(startIndex, startIndex + pageSize)
  const nextItem = sorted[startIndex + pageSize]

  return {
    items: page,
    nextCursor: nextItem?.id ?? null,
    hasMore: nextItem != null,
  }
}
