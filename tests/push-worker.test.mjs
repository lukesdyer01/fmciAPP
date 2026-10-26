import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://fmci.network'
function worker(clients) {
  const handlers = {}
  runInNewContext(source, { URL, self: { location: { origin }, clients, addEventListener: (event, handler) => { handlers[event] = handler } } })
  return handlers
}
async function tap(handler, url) {
  let pending, closed = false
  handler({ notification: { data: { url }, close: () => { closed = true } }, waitUntil: promise => { pending = promise } })
  await pending
  assert.equal(closed, true)
}
test('notification tap navigates existing window before focusing it', async () => {
  const calls = []
  const handlers = worker({ matchAll: async () => [{ navigate: async url => calls.push(['navigate', url]), focus: async () => calls.push(['focus']) }] })
  await tap(handlers.notificationclick, '/?messageFrom=user-123&message=m123')
  assert.deepEqual(calls, [['navigate', `${origin}/?messageFrom=user-123&message=m123`], ['focus']])
})
test('notification tap opens a new window when the app is closed', async () => {
  let opened
  const handlers = worker({ matchAll: async () => [], openWindow: async url => { opened = url } })
  await tap(handlers.notificationclick, '/?messageFrom=user-123&message=m123')
  assert.equal(opened, `${origin}/?messageFrom=user-123&message=m123`)
})
test('notification tap cannot navigate to another origin', async () => {
  let opened
  const handlers = worker({ matchAll: async () => [], openWindow: async url => { opened = url } })
  await tap(handlers.notificationclick, 'https://other.example/')
  assert.equal(opened, `${origin}/`)
})
