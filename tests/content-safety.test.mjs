import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentSafetyIssue } from '../supabase/functions/dynamic-endpoint/contentSafety.ts'

test('rejects targeted threats in posts and nested article/comment text', () => {
  assert.equal(contentSafetyIssue({ content: 'I will kill you' }), true)
  assert.equal(contentSafetyIssue({ blocks: [{ type: 'paragraph', text: 'kill\u200byourself' }] }), true)
  assert.equal(contentSafetyIssue({ blocks: [{ type: 'paragraph', text: 'kill\u200b yourself' }] }), true)
  assert.equal(contentSafetyIssue({ comments: [{ text: 'I will   kill\nyou' }] }), true)
})
test('does not block ordinary Christian vocabulary or safe community posts', () => {
  for (const content of ['Prayer and teaching about hell, salvation, and redemption.', 'Please pray for my family.', 'Join our conference this Sunday.']) assert.equal(contentSafetyIssue({ content }), false)
})
test('filters normalized obfuscation and HTML text without inspecting identifiers', () => {
  assert.equal(contentSafetyIssue({ text: 'Ｉ will kill you' }), true)
  assert.equal(contentSafetyIssue({ text: '<p>I will kill you</p>' }), true)
  assert.equal(contentSafetyIssue({ id: 'fuck', url: 'https://example.org' }), false)
})
