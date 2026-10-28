import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
const source = await readFile(
  new URL(
    "../supabase/functions/dynamic-endpoint/feedPage.ts",
    import.meta.url,
  ),
  "utf8",
)
const { paginateFeed } = await import(
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
)
const make = (id, extra = {}) => ({
  id: String(id),
  kind: "post",
  createdAt: "2026-01-01T00:00:00Z",
  pinned: false,
  value: { orgId: "one", content: "#prayer for today" },
  ...extra,
})
test("equal timestamps and mixed kinds paginate without overlap and pinned entries lead", () => {
  const items = Array.from({ length: 45 }, (_, i) =>
    make(i, { kind: ["post", "event", "blogPost"][i % 3] }),
  )
  items.push(
    make("pinned", { pinned: true, createdAt: "2020-01-01T00:00:00Z" }),
  )
  let page = paginateFeed(items, {}),
    all = [...page.items]
  assert.equal(all[0].id, "pinned")
  while (page.nextCursor) {
    page = paginateFeed(items, { cursor: page.nextCursor })
    all.push(...page.items)
  }
  assert.equal(all.length, 46)
  assert.equal(new Set(all.map((i) => i.kind + ":" + i.id)).size, 46)
})
test("filters run before slicing and invalid requests are rejected", () => {
  const items = [
    make("hidden", { value: { orgId: "two", content: "#other" } }),
    make("visible"),
  ]
  assert.deepEqual(
    paginateFeed(items, {
      orgId: "one",
      hashtag: "prayer",
      limit: "1",
    }).items.map((i) => i.id),
    ["visible"],
  )
  for (const limit of ["0", "51", "NaN", "1.5"])
    assert.throws(() => paginateFeed(items, { limit }))
  assert.throws(() => paginateFeed(items, { cursor: "invalid" }))
})
test("new arrivals after the first page wait for a refresh", () => {
  const items = Array.from({ length: 21 }, (_, i) => make(i))
  const first = paginateFeed(items, {})
  const future = make("new", {
    createdAt: new Date(Date.now() + 1000).toISOString(),
  })
  const next = paginateFeed([future, ...items], { cursor: first.nextCursor })
  assert.equal(next.items.length, 1)
})
