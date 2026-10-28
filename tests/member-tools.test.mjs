import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
const source = await readFile(
  new URL(
    "../supabase/functions/dynamic-endpoint/memberTools.ts",
    import.meta.url,
  ),
  "utf8",
)
const { registerMemberTools } = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
)
function setup(role = "member", result = { data: [], count: 0, error: null }) {
  const routes = {},
    calls = []
  const db = {
    from(table) {
      calls.push(["table", table])
      return new Proxy({}, {
        get(_, method) {
          if (method === "then") return (resolve) => resolve(result)
          return (...args) => {
            calls.push([method, ...args])
            return db.fromChain
          }
        },
      })
    },
  }
  db.fromChain = new Proxy({}, {
    get(_, method) {
      if (method === "then") return (resolve) => resolve(result)
      return (...args) => {
        calls.push([method, ...args])
        return db.fromChain
      }
    },
  })
  const app = Object.fromEntries(
    ["get", "put", "post", "delete"].map((m) => [
      m,
      (path, handler) => {
        routes[m + " " + path] = handler
      },
    ]),
  )
  registerMemberTools(
    app,
    "/api",
    () => db,
    async () => ({ id: "caller", app_metadata: { role } }),
  )
  const context = (body = {}, params = {}) => ({
    req: { header: () => "", json: async () => body, param: (k) => params[k] },
    json: (body, status = 200) => ({ body, status }),
  })
  return { routes, calls, context }
}
test("member reads and changes only their own saved rows", async () => {
  const s = setup()
  await s.routes["get /api/me/saved"](s.context())
  assert.ok(
    s.calls.some(
      (c) => c[0] === "eq" && c[1] === "user_id" && c[2] === "caller",
    ),
  )
  s.calls.length = 0
  const r = await s.routes["put /api/me/saved/:kind/:id"](
    s.context({}, { kind: "post", id: "p1" }),
  )
  assert.equal(r.status, 200)
  assert.equal(s.calls.find((c) => c[0] === "upsert")[1].user_id, "caller")
  assert.equal(
    (
      await s.routes["put /api/me/saved/:kind/:id"](
        s.context({}, { kind: "invalid", id: "p1" }),
      )
    ).status,
    400,
  )
})
test("members cannot read feedback queues, revoke codes, or list invitations", async () => {
  const s = setup()
  for (const key of [
    "get /api/admin/feedback",
    "get /api/admin/invitations/open",
    "delete /api/admin/invitations/open/:hash",
  ])
    assert.equal((await s.routes[key](s.context())).status, 403)
  assert.equal(s.calls.length, 0)
})
test("preference writes reject incomplete values and ignore caller supplied user identity", async () => {
  const s = setup()
  assert.equal(
    (
      await s.routes["put /api/me/notification-preferences"](
        s.context({ messages: false }),
      )
    ).status,
    400,
  )
  await s.routes["put /api/me/notification-preferences"](
    s.context({
      messages: false,
      ministry_events: true,
      moderation: true,
      user_id: "victim",
    }),
  )
  assert.equal(s.calls.find((c) => c[0] === "upsert")[1].user_id, "caller")
})
test("feedback validates content, limits volume and strips URL queries", async () => {
  const s = setup()
  assert.equal(
    (
      await s.routes["post /api/feedback"](
        s.context({ kind: "bug", message: "short" }),
      )
    ).status,
    400,
  )
  await s.routes["post /api/feedback"](
    s.context({
      kind: "bug",
      message: "The button does not open",
      page: "/resources?invite=secret#token",
    }),
  )
  const data = s.calls.find((c) => c[0] === "insert")[1]
  assert.equal(data.page, "/resources")
  assert.equal(data.user_id, "caller")
  const full = setup("member", { count: 10 })
  assert.equal(
    (
      await full.routes["post /api/feedback"](
        full.context({ kind: "bug", message: "The button does not open" }),
      )
    ).status,
    429,
  )
})
