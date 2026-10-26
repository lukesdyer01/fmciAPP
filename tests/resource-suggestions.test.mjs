import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectResourceSuggestions, feedCarouselPosition, resourcePlaceholder } from '../src/lib/resourceSuggestions.ts'

test('recommended resources come first while preserving endpoint order and input', () => {
  const resources = [{ id: 'a', recommended: false }, { id: 'b', recommended: true }, { id: 'c', recommended: true }, { id: 'd', recommended: false }]
  assert.deepEqual(selectResourceSuggestions(resources).map(r => r.id), ['b', 'c', 'a', 'd'])
  assert.equal(resources[0].id, 'a')
})

test('limits to eight and refills dismissed cards, including empty and all-dismissed lists', () => {
  const resources = Array.from({ length: 10 }, (_, i) => ({ id: String(i), recommended: false }))
  assert.equal(selectResourceSuggestions(resources).length, 8)
  assert.deepEqual(selectResourceSuggestions(resources, new Set(['0', '1'])).map(r => r.id), ['2', '3', '4', '5', '6', '7', '8', '9'])
  assert.deepEqual(selectResourceSuggestions(resources, new Set(resources.map(r => r.id))), [])
  assert.deepEqual(selectResourceSuggestions([]), [])
})

test('carousels follow third and sixth items or the end of shorter feeds', () => {
  for (const count of [0, 1, 3, 6, 10]) {
    assert.equal(feedCarouselPosition(count, 3), Math.min(count, 3))
    assert.equal(feedCarouselPosition(count, 6), Math.min(count, 6))
  }
})

test('cover placeholders reflect resource type with an unknown-type fallback', () => {
  assert.equal(resourcePlaceholder('Book'), '📖')
  assert.equal(resourcePlaceholder('Video'), '▶')
  assert.equal(resourcePlaceholder('Podcast'), '🎙')
  assert.equal(resourcePlaceholder('unknown'), '📚')
})
