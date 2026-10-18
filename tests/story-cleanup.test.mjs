import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
async function worker(db) {
 let handler
 globalThis.__storyWorker = { db, serve: fn => { handler = fn } }
 let source = await readFile(new URL('../supabase/functions/story-cleanup/index.ts', import.meta.url), 'utf8')
 source = source.replace(/import .* from .*\n/, '')
 source = `const console = { log() {}, error() {} }; const createClient = () => globalThis.__storyWorker.db; const Deno = { env: { get: key => key === 'STORY_CLEANUP_SECRET' ? 'private-worker-secret' : 'test' }, serve: globalThis.__storyWorker.serve };\n${source}`
 const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
 await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${Math.random()}`)
 return handler
}
const request = secret => new Request('https://example.invalid/cleanup', { method: 'POST', headers: { 'x-story-cleanup-secret': secret } })
test('cleanup does not touch storage or records without its scheduler secret', async () => {
 const handle = await worker({ rpc: () => assert.fail('unauthorized database access') })
 assert.equal((await handle(request('wrong'))).status, 401)
})
test('storage failure leaves ledger rows intact for a later retry', async () => {
 let removed = 0
 const handle = await worker({
  rpc: async () => ({ data: [{ name: 'fixture/photo.jpg' }] }),
  storage: { from: () => ({ remove: async () => { removed++; return { error: new Error('Temporary storage outage') } } }) },
  from: () => assert.fail('must not discard records after failed byte removal'),
 })
 assert.equal((await handle(request('private-worker-secret'))).status, 500)
 assert.equal(removed, 1)
})
test('successful cleanup removes bytes before expiring records', async () => {
 const events = []; let batch = 0
 const handle = await worker({
  rpc: async () => ({ data: batch++ ? [] : [{ name: 'fixture/photo.jpg' }] }),
  storage: { from: () => ({ remove: async names => { events.push(['bytes', names]); return {} } }) },
  from: () => ({ delete: () => ({ lte: async () => { events.push(['expired']); return {} }, eq: () => ({ lt: async () => { events.push(['abandoned']); return {} } }) }) }),
 })
 const response = await handle(request('private-worker-secret'))
 assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, removed: 1 })
 assert.deepEqual(events, [['bytes', ['fixture/photo.jpg']], ['expired'], ['abandoned']])
})
