import { test } from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8")
  return import(
    `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`
  )
}
const { notificationEmail, preferenceFor, retryState } = await load(
  "../supabase/functions/email-notifications/email.ts",
)
const { emailDestination } = await load(
  "../supabase/functions/email-notifications/eligibility.ts",
)
function database(values = {}, rows = {}) {
  return {
    from(table) {
      const filters = {}
      const q = new Proxy({}, {
        get(_, method) {
          if (method === "then")
            return (resolve) =>
              resolve({
                data:
                  table === "kv_store_5bb4c08d"
                    ? { value: values[filters.key] }
                    : (rows[table] ?? null),
                error: null,
              })
          return (...args) => {
            if (method === "eq") filters[args[0]] = args[1]
            return q
          }
        },
      })
      return q
    },
  }
}
test("notification email includes destinations and unsubscribe without private message content", () => {
  const email = notificationEmail(
    "direct",
    "https://fmci.network/?messageFrom=sender",
    "https://example.com/unsubscribe",
  )
  assert.match(email.subject, /unread direct message/)
  assert.match(email.html, /View notification/)
  assert.match(email.text, /unsubscribe/)
  assert.equal(preferenceFor("group"), "messages")
  assert.equal(preferenceFor("mention"), "mentions")
  assert.equal(preferenceFor("reply"), "replies")
  assert.equal(retryState(8, 0), "failed")
  assert.equal(retryState(1, 24 * 3600000), "failed")
  assert.equal(retryState(2, 100), "pending")
})
const direct = {
  kind: "direct",
  recipient_id: "member",
  actor_id: "actor",
  conversation_id: "conversation",
  message_id: "message",
}
const conv = {
  id: "conversation",
  participantIds: ["member", "actor"],
  messages: [{ id: "message", createdAt: "2026-11-01T01:00:00Z" }],
}
test("message reminders require unread, visible conversations and respect blocking both ways", async () => {
  assert.match(
    await emailDestination(database({ conversations: [conv] }), direct),
    /messageFrom=actor/,
  )
  for (const c of [
    { ...conv, lastReadAt: { member: "2026-11-01T02:00:00Z" } },
    { ...conv, deletedBy: { member: true } },
    { ...conv, messages: [] },
  ])
    assert.equal(
      await emailDestination(database({ conversations: [c] }), direct),
      null,
    )
  assert.equal(
    await emailDestination(
      database({ conversations: [conv], user_blocks: { actor: ["member"] } }),
      direct,
    ),
    null,
  )
})
test("activity reminders suppress read, deleted, reported and private inaccessible targets", async () => {
  const job = {
    kind: "mention",
    recipient_id: "member",
    actor_id: "actor",
    notification_id: "notice",
  }
  const notice = { id: "notice", post_id: "post", read_at: null }
  const post = { id: "post", authorId: "actor" }
  const db = (p = post, n = notice, extra = {}) =>
    database({ posts: p ? [p] : [], ...extra }, {
      network_reaction_notifications: n,
    })
  assert.match(await emailDestination(db(), job), /notification=notice/)
  assert.equal(await emailDestination(db(null), job), null)
  assert.equal(
    await emailDestination(db(post, { ...notice, read_at: "now" }), job),
    null,
  )
  assert.equal(
    await emailDestination(
      db({ ...post, visibility: "private", orgId: "org" }),
      job,
    ),
    null,
  )
  assert.equal(
    await emailDestination(
      db(post, notice, {
        content_reports: [
          { reporterId: "member", targetType: "post", targetId: "post" },
        ],
      }),
      job,
    ),
    null,
  )
})
test("worker rejects unauthenticated calls and unsubscribe GET never changes preferences", async () => {
  let handler,
    writes = 0
  const source = await readFile(
    new URL(
      "../supabase/functions/email-notifications/index.ts",
      import.meta.url,
    ),
    "utf8",
  )
  const js = ts.transpileModule(source.replace(/^import .*\n/gm, ""), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText
  new Function(
    "createClient",
    "Webhook",
    "notificationEmail",
    "preferenceFor",
    "retryState",
    "emailDestination",
    "Deno",
    js,
  )(
    () => ({
      from() {
        writes++
        throw Error("unexpected write")
      },
    }),
    class {},
    notificationEmail,
    preferenceFor,
    retryState,
    emailDestination,
    {
      env: {
        get: (k) => (k === "EMAIL_WORKER_SECRET" ? "private" : undefined),
      },
      serve: (fn) => (handler = fn),
    },
  )
  assert.equal(
    (await handler(new Request("https://example.com", { method: "POST" })))
      .status,
    401,
  )
  const page = await handler(
    new Request(
      "https://example.com?unsubscribe=00000000-0000-0000-0000-000000000001",
    ),
  )
  assert.equal(page.status, 303)
  assert.match(page.headers.get("location"), /email-unsubscribe.html#token=/)
  assert.equal(writes, 0)
  assert.equal(
    (
      await handler(
        new Request("https://example.com?webhook=1", { method: "POST" }),
      )
    ).status,
    503,
  )
})
test("group email eligibility honors feature flag, membership, mute and read boundary", async () => {
  const job = {
    kind: "group",
    recipient_id: "member",
    actor_id: "actor",
    conversation_id: "group",
    message_id: "12",
  }
  const member = { last_read_id: 10, history_after: 0, muted: false }
  const db = (me = member, flag = 1) =>
    database({ group_messages_enabled: flag }, {
      network_group_members: me,
      network_group_messages: { id: 12 },
    })
  assert.match(await emailDestination(db(), job), /groupConversation=group/)
  assert.equal(await emailDestination(db(null), job), null)
  assert.equal(
    await emailDestination(db({ ...member, muted: true }), job),
    null,
  )
  assert.equal(
    await emailDestination(db({ ...member, last_read_id: 12 }), job),
    null,
  )
  assert.equal(
    await emailDestination(db({ ...member, history_after: 12 }), job),
    null,
  )
  assert.equal(await emailDestination(db(member, 0), job), null)
})
const { registerEmailPreferences } = await load(
  "../supabase/functions/dynamic-endpoint/emailPreferences.ts",
)
test("email preferences remain caller scoped and never accept unsubscribe tokens from clients", async () => {
  const routes = {},
    calls = []
  const chain = new Proxy({}, {
    get(_, method) {
      if (method === "then")
        return (resolve) => resolve({ data: { enabled: false }, error: null })
      return (...args) => {
        calls.push([method, ...args])
        return chain
      }
    },
  })
  registerEmailPreferences(
    {
      get: (p, h) => (routes["get" + p] = h),
      put: (p, h) => (routes["put" + p] = h),
    },
    "/api",
    () => ({ from: () => chain }),
    async () => ({ id: "member" }),
  )
  const ctx = (body) => ({
    req: { header: () => "", json: async () => body },
    json: (body, status = 200) => ({ body, status }),
  })
  assert.equal(
    (await routes["put/api/me/email-preferences"](ctx({ enabled: true })))
      .status,
    400,
  )
  const result = await routes["put/api/me/email-preferences"](
    ctx({
      enabled: false,
      messages: true,
      mentions: true,
      wall: true,
      replies: true,
      user_id: "other",
      unsubscribe_token: "spoof",
    }),
  )
  assert.equal(result.status, 200)
  assert.deepEqual(calls.find((c) => c[0] === "upsert")[1], {
    user_id: "member",
    enabled: false,
    messages: true,
    mentions: true,
    wall: true,
    replies: true,
  })
})
