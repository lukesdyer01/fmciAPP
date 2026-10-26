import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMemberLocation, formatMemberLocation, memberLocationKey, subdivisions, countries } from '../src/lib/memberLocation.ts'

test('new profiles default to US without displaying a country-only location', () => {
  const value = readMemberLocation({})
  assert.deepEqual(value, { city: '', state: '', country: 'US' })
  assert.equal(formatMemberLocation(value), '')
  assert.equal(memberLocationKey(value), '')
})

test('legacy US names and abbreviations normalize to the same location', () => {
  const value = readMemberLocation({ location: ' Dallas, Texas ' })
  assert.deepEqual(value, { city: 'Dallas', state: 'TX', country: 'US' })
  assert.equal(formatMemberLocation(value), 'Dallas, TX')
  assert.equal(memberLocationKey({ location: 'Dallas, TX' }), memberLocationKey(value))
})

test('Canada and international locations retain country information', () => {
  assert.equal(formatMemberLocation(readMemberLocation({ location: 'Toronto, Ontario' })), 'Toronto, ON, Canada')
  assert.equal(formatMemberLocation(readMemberLocation({ location: 'Lagos, Nigeria' })), 'Lagos, Nigeria')
  assert.notEqual(memberLocationKey({ city: 'London', state: '', country: 'GB' }), memberLocationKey({ city: 'London', state: 'ON', country: 'CA' }))
  assert.ok(subdivisions('CA').some(region => region.code === 'QC'))
  assert.ok(countries.some(country => country.code === 'NG'))
})

test('ambiguous legacy location text is preserved rather than assigned a country', () => {
  const legacy = 'Somewhere near the coast'
  const parsed = readMemberLocation({ location: legacy })
  assert.equal(parsed.country, '')
  assert.equal(formatMemberLocation(parsed), legacy)
})

test('explicit structured fields take precedence and whitespace is trimmed', () => {
  const value = readMemberLocation({ city: ' Austin ', state: 'Texas', country: 'US', location: 'Old location' })
  assert.equal(formatMemberLocation(value), 'Austin, TX')
})
