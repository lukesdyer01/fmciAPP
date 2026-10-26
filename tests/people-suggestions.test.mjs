import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankPeopleSuggestions, memberInitials } from '../src/lib/peopleSuggestions.ts'

const profile = { church: ' Grace Church ', location: 'Dallas, TX', ministryRoles: ['Pastor'], additionalRoles: ['Teacher'] }
const member = (id, patch = {}) => ({ id, name: id, church: '', location: '', avatarUrl: '', ministryRoles: [], additionalRoles: [], createdAt: '2025-01-01', ...patch })

test('church precedes location, then shared roles, then newest join date; excludes self', () => {
  const members = [
    member('newest', { createdAt: '2026-01-01' }),
    member('role', { ministryRoles: ['pastor'] }),
    member('location', { location: ' dallas, tx ' }),
    member('church', { church: 'grace church' }),
    member('self', { church: 'Grace Church', location: 'Dallas, TX' }),
    member('two-roles', { ministryRoles: ['Pastor'], additionalRoles: ['Teacher'] }),
    member('oldest'),
  ]
  assert.deepEqual(rankPeopleSuggestions(members, profile, 'self').map(m => m.id), ['church', 'location', 'two-roles', 'role', 'newest', 'oldest'])
  assert.equal(members[0].id, 'newest')
})

test('empty fields do not match, duplicate roles count once, invalid dates sort last', () => {
  const empty = { church: '', location: '', ministryRoles: [], additionalRoles: [] }
  assert.deepEqual(rankPeopleSuggestions([member('invalid', { createdAt: 'invalid' }), member('valid')], empty).map(m => m.id), ['valid', 'invalid'])
  const duplicate = member('duplicate', { ministryRoles: ['Pastor', 'Pastor'], additionalRoles: ['Pastor'] })
  const both = member('both', { ministryRoles: ['Pastor'], additionalRoles: ['Teacher'] })
  assert.equal(rankPeopleSuggestions([duplicate, both], profile)[0].id, 'both')
})

test('initials handle missing names and multiple words', () => {
  assert.equal(memberInitials('  Jane   Doe '), 'JD')
  assert.equal(memberInitials('Jane'), 'J')
  assert.equal(memberInitials(''), '?')
})
