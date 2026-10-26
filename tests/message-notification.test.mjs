import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readMessageNotificationUrl } from '../src/lib/messageNotification.ts'
const origin = 'https://fmci.network'
test('message notification links identify sender and exact message', () => {
  assert.deepEqual(readMessageNotificationUrl('/?messageFrom=user-123&message=m123', origin), { userId: 'user-123', messageId: 'm123' })
  assert.deepEqual(readMessageNotificationUrl('/?messageFrom=user-123', origin), { userId: 'user-123', messageId: null })
})
test('rejects foreign destinations, invalid identifiers, and unrelated notifications', () => {
  for (const url of ['https://evil.example/?messageFrom=user-123', '/profile/user?messageFrom=user', '/', '/?messageFrom=', '/?messageFrom=user%2F123', '/?messageFrom=user&message=%3Cscript%3E']) assert.equal(readMessageNotificationUrl(url, origin), null)
})

test('native Capacitor URLs work even when URL.origin is opaque', () => {
  assert.deepEqual(readMessageNotificationUrl('/?messageFrom=user-123&message=m123', 'capacitor://localhost/'), { userId: 'user-123', messageId: 'm123' })
  assert.equal(readMessageNotificationUrl('https://evil.example/?messageFrom=user', 'capacitor://localhost/'), null)
})
