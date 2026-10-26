import { test } from 'node:test'
import assert from 'node:assert/strict'
import { geocodeQueries, geocodeOnCooldown } from '../supabase/functions/dynamic-endpoint/mapLocations.ts'

test('tries address first and falls back to structured city, then legacy location', () => {
  assert.deepEqual(geocodeQueries({ address: '123 Main St', city: 'Dallas', state: 'TX', country: 'US', location: 'Old place' }), ['123 Main St', 'Dallas, TX, US'])
  assert.deepEqual(geocodeQueries({ address: 'Unrecognized address', location: 'Dallas, TX' }), ['Unrecognized address', 'Dallas, TX'])
  assert.deepEqual(geocodeQueries({ country: 'US', location: '' }), [])
  assert.deepEqual(geocodeQueries({ address: ' Dallas, TX ', location: 'Dallas, TX' }), ['Dallas, TX'])
})

test('legacy failed lookups retry; recent failures wait until cooldown expires', () => {
  const now = Date.parse('2026-10-25T12:00:00Z')
  assert.equal(geocodeOnCooldown({ geocodeFailed: true }, now), false)
  assert.equal(geocodeOnCooldown({ geocodeFailed: true, geocodeRetryAfter: 'invalid' }, now), false)
  assert.equal(geocodeOnCooldown({ geocodeFailed: true, geocodeRetryAfter: '2026-10-25T12:01:00Z' }, now), true)
  assert.equal(geocodeOnCooldown({ geocodeFailed: true, geocodeRetryAfter: '2026-10-25T11:59:00Z' }, now), false)
})
