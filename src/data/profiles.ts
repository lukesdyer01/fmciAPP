import type { BadgeVariant } from '../components/Badge'

export interface ProfileData {
  id: string
  name: string
  title: string
  church: string
  location: string
  avatar: string
  coverUrl: string
  coverColor: string
  badges: BadgeVariant[]
  bio: string
  callings: string[]
  stats: { connections: number; followers: number; posts: number; yearsInMinistry: number }
  connected: boolean
  following: boolean
  website?: string
  email?: string
  recentPosts: {
    id: number
    content: string
    type: string
    time: string
    reactions: number
    comments: number
  }[]
  groups: { name: string; role: string }[]
  education: { institution: string; degree: string; year: string }[]
}

export const PROFILES: Record<string, ProfileData> = {}

// Fallback for unknown authors — derive from post data
export function getProfileIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getProfile(id: string): ProfileData | null {
  return PROFILES[id] ?? null
}
