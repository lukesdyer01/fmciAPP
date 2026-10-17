import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invitationLink, readInvitationLink } from '../src/lib/invitations.ts'

test('invitation links preserve email addresses and tokens and use the site root', () => {
  const invitation = { email: 'person+fmci@example.org', token: 'secret/with+symbols=&' }
  const link = new URL(invitationLink(invitation))
  assert.equal(link.origin, 'https://fmci.network')
  assert.equal(link.pathname, '/')
  assert.equal(link.search, '')
  assert.deepEqual(readInvitationLink(link.hash), invitation)
})

test('incomplete and unrelated authentication fragments do not open invitation signup', () => {
  for (const hash of ['', '#invite=token', '#email=test@example.org', '#invite=&email=test@example.org', '#access_token=secret&type=recovery']) {
    assert.equal(readInvitationLink(hash), null)
  }
})
