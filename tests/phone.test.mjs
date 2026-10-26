import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatPhoneNumber } from '../src/lib/phone.ts'

test('formats existing ten-digit phone variants with hyphens', () => {
  for (const phone of ['5551234567', '(555) 123-4567', '555.123.4567', '555 123 4567', '555-123-4567']) {
    assert.equal(formatPhoneNumber(phone), '555-123-4567')
  }
})
test('preserves explicit country codes, international numbers, extensions and partial entry', () => {
  assert.equal(formatPhoneNumber('+1 (555) 123-4567'), '+1 555-123-4567')
  for (const phone of ['+44 20 7946 0958', '+3312345678', '5551234567 ext 123', '555-12']) assert.equal(formatPhoneNumber(phone), phone)
  assert.equal(formatPhoneNumber(null), '')
  assert.equal(formatPhoneNumber(''), '')
})
