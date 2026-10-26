import { memberLocationKey } from './memberLocation.ts'
export interface SuggestedMember {
  id: string
  name: string
  church: string
  location: string
  city?: string
  state?: string
  country?: string
  avatarUrl: string
  ministryRoles: string[]
  additionalRoles: string[]
  createdAt?: string
}

type SuggestionProfile = Pick<SuggestedMember, 'church' | 'location' | 'city' | 'state' | 'country' | 'ministryRoles' | 'additionalRoles'>
const normalize = (value: string) => value.trim().toLocaleLowerCase()

export function rankPeopleSuggestions(members: SuggestedMember[], profile: SuggestionProfile, currentUserId?: string) {
  const church = normalize(profile.church)
  const location = memberLocationKey(profile)
  const roles = new Set([...profile.ministryRoles, ...profile.additionalRoles].map(normalize).filter(Boolean))
  const score = (member: SuggestedMember) => [
    Number(Boolean(church) && normalize(member.church) === church),
    Number(Boolean(location) && memberLocationKey(member) === location),
    new Set([...member.ministryRoles, ...member.additionalRoles].map(normalize).filter(role => roles.has(role))).size,
    Date.parse(member.createdAt ?? '') || 0,
  ]
  return members.filter(member => member.id !== currentUserId).sort((a, b) => {
    const left = score(a), right = score(b)
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return right[i] - left[i]
    }
    return a.id.localeCompare(b.id)
  })
}

export function memberInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'
}
