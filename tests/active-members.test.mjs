import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
const source = await readFile(
  new URL(
    "../supabase/functions/dynamic-endpoint/activeMembers.ts",
    import.meta.url,
  ),
  "utf8",
)
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const { visibleActiveMembers } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
)
const now = Date.parse("2026-11-01T04:30:00Z")
const member = (id, age = 1000, extra = {}) => ({
  id,
  confirmed_at: "2026-10-01",
  user_metadata: {
    full_name: id,
    lastActiveAt: new Date(now - age).toISOString(),
    onboarding_complete: true,
    ...extra,
  },
})
test("active roster excludes self, expired/future activity and unavailable accounts", () => {
  const users = [
    member("self"),
    member("active"),
    member("expired", 300000),
    member("future", -1000),
    member("incomplete", 1000, { onboarding_complete: false }),
    member("suspended", 1000, { status: "suspended" }),
    { ...member("pending"), confirmed_at: null },
    { ...member("banned"), banned_until: new Date(now + 60000).toISOString() },
    { ...member("anonymous"), is_anonymous: true },
  ]
  assert.deepEqual(
    visibleActiveMembers(users, "self", {}, now).map((m) => m.id),
    ["active"],
  )
})
test("active roster filters blocks in both directions and sorts recent first", () => {
  const users = [
    member("older", 120000),
    member("newer", 1000),
    member("blocked"),
    member("blocked-me"),
  ]
  const results = visibleActiveMembers(
    users,
    "self",
    { self: ["blocked"], "blocked-me": ["self"] },
    now,
  )
  assert.deepEqual(
    results.map((m) => m.id),
    ["newer", "older"],
  )
  assert.equal(results[0].name, "newer")
  assert.equal(results[0].avatarUrl, "")
})
