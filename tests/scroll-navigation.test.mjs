import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advanceScrollNavigation as advance, scrollPosition } from '../src/lib/scrollNavigation.ts'
const initial = y => ({ y, direction: 0, distance: 0, hidden: false })
test('small movements accumulate; downward hide and upward reveal have distinct thresholds', () => {
 let state = initial(100)
 state = advance(state, 108, 1000); assert.equal(state.hidden, false)
 state = advance(state, 116, 1000); assert.equal(state.hidden, true)
 state = advance(state, 112, 1000); assert.equal(state.hidden, true)
 state = advance(state, 108, 1000); assert.equal(state.hidden, false)
})
test('direction changes discard previous travel to avoid jitter', () => {
 let state = advance(initial(100), 110, 1000)
 state = advance(state, 107, 1000)
 state = advance(state, 115, 1000); assert.equal(state.hidden, false)
 state = advance(state, 123, 1000); assert.equal(state.hidden, true)
})
test('top, short pages, and negative pull-to-refresh positions keep navigation visible', () => {
 const hidden = { ...initial(100), hidden: true }
 for (const y of [24, 0, -80]) assert.equal(advance(hidden, y, 1000).hidden, false)
 assert.equal(advance(hidden, 200, 0).hidden, false)
})
test('bottom elastic overscroll cannot falsely reveal navigation', () => {
 let state = advance(initial(970), 1050, 1000); assert.equal(state.hidden, true)
 state = advance(state, 1030, 1000); assert.equal(state.hidden, true)
 state = advance(state, 1000, 1000); assert.equal(state.hidden, true)
 state = advance(state, 992, 1000); assert.equal(state.hidden, false)
 assert.equal(scrollPosition(-10, -1), 0)
})
