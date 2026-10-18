import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function client(auth, fetcher) {
  let source = await readFile(new URL('../src/api-client/server.ts', import.meta.url), 'utf8')
  source = source.replace(/import .* from .*\n/g, '')
  source = `const supabase = globalThis.__apiTest.auth; const publicAnonKey = 'anonymous'; const fetch = globalThis.__apiTest.fetcher;\n${source}`
  globalThis.__apiTest = { auth: { auth }, fetcher }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}#${Math.random()}`)
}
const ok = () => Response.json({ ok: true })
const session = token => ({ data: { session: { access_token: token } } })

test('refreshes an expired session once and preserves caller headers on retry', async () => {
  const tokens = []; let refreshes = 0
  const { api } = await client({ getSession: async () => session('expired'), refreshSession: async () => { refreshes++; return session('fresh') } }, async (_, options) => {
    tokens.push(options.headers.get('Authorization'))
    assert.equal(options.headers.get('X-Test'), 'kept')
    return tokens.length === 1 ? Response.json({ error: 'Sign in' }, { status: 401 }) : ok()
  })
  assert.deepEqual(await api('/posts', { headers: { 'X-Test': 'kept' } }), { ok: true })
  assert.deepEqual(tokens, ['Bearer expired', 'Bearer fresh']); assert.equal(refreshes, 1)
})
test('failed refresh clears the unusable local session without replaying a write', async () => {
  let requests = 0; let signedOut = false
  const { api } = await client({ getSession: async () => session('expired'), refreshSession: async () => ({ data: { session: null }, error: new Error('Invalid refresh token') }), signOut: async options => { assert.equal(options.scope, 'local'); signedOut = true } }, async () => { requests++; return new Response('', { status: 401 }) })
  await assert.rejects(api('/posts', { method: 'POST', body: '{}' }), /sign in again/)
  assert.equal(requests, 1); assert.equal(signedOut, true)
})
test('signed-out private calls stay local while public registration settings load', async () => {
  let requests = 0
  const { api } = await client({ getSession: async () => ({ data: { session: null } }) }, async () => { requests++; return ok() })
  await assert.rejects(api('/posts'), /sign in again/)
  await api('/settings'); assert.equal(requests, 1)
})
test('eligibility denials remain readable and do not trigger token recovery', async () => {
  const { api } = await client({ getSession: async () => session('valid'), refreshSession: () => assert.fail('403 must not refresh') }, async () => Response.json({ error: 'Confirm you are at least 18 before continuing' }, { status: 403 }))
  await assert.rejects(api('/posts'), /Confirm you are at least 18/)
})
