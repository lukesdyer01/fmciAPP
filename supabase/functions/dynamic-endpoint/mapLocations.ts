interface MapLocation {
  address?: string
  location?: string
  city?: string
  state?: string
  country?: string
  geocodeFailed?: boolean
  geocodeRetryAfter?: string
}

export function geocodeQueries(org: MapLocation) {
  const cityLocation = org.city?.trim() ? [org.city, org.state, org.country].filter(Boolean).join(', ') : ''
  return [...new Set([org.address, cityLocation || org.location].map(value => (value ?? '').trim()).filter(Boolean))]
}

export function geocodeOnCooldown(org: MapLocation, now = Date.now()) {
  return Boolean(org.geocodeFailed && org.geocodeRetryAfter && Date.parse(org.geocodeRetryAfter) > now)
}
