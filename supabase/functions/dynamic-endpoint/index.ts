import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const kvClient = () => createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const kv = {
  set: async (key: string, value: any): Promise<void> => {
    const { error } = await kvClient().from("kv_store_5bb4c08d").upsert({ key, value });
    if (error) throw new Error(error.message);
  },
  get: async (key: string): Promise<any> => {
    const { data, error } = await kvClient().from("kv_store_5bb4c08d").select("value").eq("key", key).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.value;
  },
};

const app = new Hono();
const BASE = "/dynamic-endpoint";

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY  = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function getCallerUser(authHeader: string | undefined) {
  if (!authHeader) return null;
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: SERVICE_KEY() },
  });
  if (!res.ok) return null;
  return await res.json();
}

function callerRole(user: any): string {
  return user?.app_metadata?.role ?? user?.user_metadata?.role ?? "member";
}

async function listAuthUsers() {
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/admin/users?per_page=200`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY()}`, apikey: SERVICE_KEY() },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.users ?? []);
}

async function setUserRole(userId: string, role: string) {
  return await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${SERVICE_KEY()}`, apikey: SERVICE_KEY(), "Content-Type": "application/json" },
    body: JSON.stringify({ app_metadata: { role } }),
  });
}

async function updateUserMeta(userId: string, meta: Record<string, any>) {
  return await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${SERVICE_KEY()}`, apikey: SERVICE_KEY(), "Content-Type": "application/json" },
    body: JSON.stringify({ user_metadata: meta }),
  });
}

const SEED_POSTS = [
  { id: "p1", authorId: "m1", author: { name: "Apostle James Whitfield", title: "Presiding Apostle", church: "FMCI International", location: "Atlanta, GA", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format" }, body: "Grateful for each of you in this network. The kingdom is advancing because of your faithfulness and commitment to excellence in ministry.", createdAt: "2026-08-30T08:15:00Z", reactions: { "🙏": 47, "❤️": 31, "🔥": 12 }, commentCount: 18, isFollowing: false },
  { id: "p2", authorId: "m3", author: { name: "Rev. Thomas Adeyemi", title: "Regional Director", church: "FMCI West Africa", location: "Lagos, Nigeria", avatarUrl: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=80&h=80&fit=crop&auto=format" }, body: "Just wrapped up our West Africa leadership summit — 340 pastors gathered, three nations represented. God is doing something extraordinary on this continent.", createdAt: "2026-08-29T14:22:00Z", reactions: { "🙏": 62, "❤️": 44, "🔥": 28 }, commentCount: 34, isFollowing: true },
  { id: "p3", authorId: "m2", author: { name: "Pastor Maria Rodriguez", title: "Senior Leader", church: "Vida Nueva Church", location: "San Antonio, TX", avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&h=80&fit=crop&auto=format" }, body: "Our bilingual young adults ministry just hit 200 members. If you're looking for resources on multicultural ministry, I'd love to connect and share what's been working.", createdAt: "2026-08-29T09:05:00Z", reactions: { "🙏": 29, "❤️": 53, "🔥": 19 }, commentCount: 11, isFollowing: true },
  { id: "p4", authorId: "m8", author: { name: "Bishop Clara Thompson", title: "Apostolic Bishop", church: "Apostolic Council", location: "Dallas, TX", avatarUrl: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&auto=format" }, body: "Reminder: FMCI Annual Convocation registration closes September 15th. Early bird pricing ends this Friday. Don't miss the pre-conference workshops on church planting and financial stewardship.", createdAt: "2026-08-28T16:48:00Z", reactions: { "🙏": 38, "❤️": 27, "🔥": 15 }, commentCount: 22, isFollowing: false },
];

const SEED_ORGS = [
  { id: "org_fmci", name: "FMCI International", type: "headquarters", status: "active", location: "Atlanta, GA", website: "fmci.global", description: "The global headquarters of the Federation of Ministers & Churches International.", verified: true, memberCount: 8, features: ["verified", "messaging", "events", "resources"] },
  { id: "org_wa", name: "FMCI West Africa", type: "region", status: "active", location: "Lagos, Nigeria", website: "fmciafrica.org", description: "Regional body covering West African nations.", verified: true, memberCount: 3, features: ["verified", "messaging", "events"] },
  { id: "org_gracefellowship", name: "Grace Fellowship", type: "local_church", status: "active", location: "Nashville, TN", website: "gracefellowship.com", description: "A Spirit-filled congregation committed to community transformation.", verified: true, memberCount: 1, features: ["messaging"] },
  { id: "org_vidanueva", name: "Vida Nueva Church", type: "local_church", status: "active", location: "San Antonio, TX", website: "vidanueva.org", description: "Bilingual multicultural church reaching the Latino community.", verified: true, memberCount: 1, features: ["messaging", "events"] },
  { id: "org_cornerstone", name: "Cornerstone Fellowship", type: "local_church", status: "active", location: "Denver, CO", website: "cornerstonedenver.org", description: "A family-centered church in the heart of Denver.", verified: true, memberCount: 1, features: ["messaging"] },
  { id: "org_apostolic", name: "Apostolic Council", type: "council", status: "active", location: "Dallas, TX", website: "apostoliccouncil.org", description: "Interdenominational apostolic oversight body.", verified: true, memberCount: 1, features: ["verified", "messaging", "events", "resources"] },
  { id: "org_newlife", name: "New Life Assembly", type: "local_church", status: "pending", location: "Accra, Ghana", website: "", description: "Pentecostal assembly seeking FMCI affiliation.", verified: false, memberCount: 1, features: [] },
  { id: "org_covenant", name: "Covenant Church Abuja", type: "local_church", status: "active", location: "Abuja, Nigeria", website: "", description: "Word-based church focused on discipleship and prayer.", verified: true, memberCount: 1, features: ["messaging"] },
];

const DEFAULT_PROFILE = {
  name: "Pastor John Harris", title: "Senior Leader", church: "Grace Fellowship", location: "Nashville, TN",
  bio: "Lead Pastor at Grace Community Church. Passionate about discipleship, community outreach, and equipping the next generation of leaders.",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format",
  coverUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=200&fit=crop&auto=format",
  website: "gracecommunitychurch.org", email: "john@gracecommunitychurch.org",
};

app.get(`${BASE}/health`, (c) => c.json({ status: "ok" }));

app.get(`${BASE}/members`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const users = await listAuthUsers();
  const members = users
    .filter((u: any) => u.id !== caller.id)
    .filter((u: any) => {
      const status = u.user_metadata?.status === "suspended" ? "suspended" : u.confirmed_at ? "active" : "pending";
      return status === "active";
    })
    .map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
      title: u.user_metadata?.title ?? "",
      church: u.user_metadata?.church ?? "",
      location: u.user_metadata?.location ?? "",
      avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
      badges: u.user_metadata?.verified ? ["verified"] : [],
      callings: [],
    }));
  return c.json(members);
});

app.get(`${BASE}/posts`, async (c) => c.json(await kv.get("posts") ?? SEED_POSTS));

app.post(`${BASE}/posts`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  const posts = await kv.get("posts") ?? SEED_POSTS;
  // authorId is stamped from the verified caller, never trusted from the client —
  // it's what edit/delete ownership checks below rely on.
  const newPost = { id: `p${Date.now()}`, reactions: {}, commentCount: 0, createdAt: new Date().toISOString(), isFollowing: false, ...body, authorId: caller.id };
  await kv.set("posts", [newPost, ...posts]);
  return c.json(newPost, 201);
});

function canModifyPost(post: any, caller: any): boolean {
  if (!caller) return false;
  if (["superadmin", "admin"].includes(callerRole(caller))) return true;
  if (post.authorId) return post.authorId === caller.id;
  // Legacy posts created before authorId was stamped — fall back to name match.
  const callerName = (caller.user_metadata?.full_name ?? caller.user_metadata?.name ?? "").trim().toLowerCase();
  const postAuthor = (typeof post.author === "string" ? post.author : (post.author?.name ?? "")).trim().toLowerCase();
  return !!callerName && callerName === postAuthor;
}

app.put(`${BASE}/posts/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const body = await c.req.json();
  const posts = await kv.get("posts") ?? SEED_POSTS;
  const post = posts.find((p: any) => p.id === id);
  if (!post) return c.json({ error: "Post not found" }, 404);
  if (!canModifyPost(post, caller)) return c.json({ error: "Forbidden" }, 403);
  const updated = { ...post, content: body.content ?? post.content, editedAt: new Date().toISOString() };
  await kv.set("posts", posts.map((p: any) => p.id === id ? updated : p));
  return c.json(updated);
});

app.delete(`${BASE}/posts/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const posts = await kv.get("posts") ?? SEED_POSTS;
  const post = posts.find((p: any) => p.id === id);
  if (!post) return c.json({ error: "Post not found" }, 404);
  if (!canModifyPost(post, caller)) return c.json({ error: "Forbidden" }, 403);
  await kv.set("posts", posts.filter((p: any) => p.id !== id));
  return c.json({ ok: true });
});

app.post(`${BASE}/posts/:id/react`, async (c) => {
  const { id } = c.req.param();
  const { emoji } = await c.req.json();
  const posts = await kv.get("posts") ?? SEED_POSTS;
  await kv.set("posts", posts.map((p: any) =>
    p.id === id ? { ...p, reactions: { ...p.reactions, [emoji]: ((p.reactions?.[emoji] ?? 0) + 1) } } : p
  ));
  return c.json({ ok: true });
});

app.get(`${BASE}/profile`, async (c) => c.json(await kv.get("profile") ?? DEFAULT_PROFILE));

app.put(`${BASE}/profile`, async (c) => {
  const body = await c.req.json();
  await kv.set("profile", body);
  return c.json(body);
});

app.get(`${BASE}/orgs`, async (c) => c.json(await kv.get("orgs") ?? SEED_ORGS));

app.get(`${BASE}/orgs/my`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  // "My Organizations" surfaces every active org on the platform, not a
  // per-user membership list — there's no real per-org membership tracked yet.
  const active = orgs.filter((o: any) => o.status === "active").map((o: any) => ({ members: [], ...o }));
  return c.json(active);
});

app.put(`${BASE}/orgs`, async (c) => {
  const body = await c.req.json();
  await kv.set("orgs", body);
  return c.json(body);
});

app.get(`${BASE}/admin/users`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const users = await listAuthUsers();
  return c.json(users.map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
    role: u.app_metadata?.role ?? u.user_metadata?.role ?? "member",
    church: u.user_metadata?.church ?? "",
    location: u.user_metadata?.location ?? "",
    title: u.user_metadata?.title ?? "",
    avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
    status: u.user_metadata?.status === "suspended" ? "suspended"
           : u.confirmed_at ? "active" : "pending",
    verified: !!(u.user_metadata?.verified ?? u.confirmed_at),
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    confirmed: !!u.confirmed_at,
  })));
});

app.post(`${BASE}/admin/update-member`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const { userId, patch } = await c.req.json();
  if (!userId || !patch) return c.json({ error: "userId and patch required" }, 400);
  const userRes = await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY()}`, apikey: SERVICE_KEY() },
  });
  if (!userRes.ok) return c.json({ error: "User not found" }, 404);
  const user = await userRes.json();
  const merged = { ...user.user_metadata, ...patch };
  const res = await updateUserMeta(userId, merged);
  if (!res.ok) return c.json({ error: await res.text() }, res.status);
  return c.json({ ok: true });
});

app.post(`${BASE}/admin/set-role`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (callerRole(caller) !== "superadmin") return c.json({ error: "Only superadmins can assign roles" }, 403);
  const { userId, role } = await c.req.json();
  if (!userId || !role || !["superadmin", "admin", "member"].includes(role)) return c.json({ error: "Invalid request" }, 400);
  const res = await setUserRole(userId, role);
  if (!res.ok) return c.json({ error: await res.text() }, res.status);
  return c.json({ ok: true, userId, role });
});

app.post(`${BASE}/admin/clear-posts`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  await kv.set("posts", []);
  return c.json({ ok: true });
});

app.post(`${BASE}/admin/remove-orphaned-posts`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const users = await listAuthUsers();
  const validNames = new Set(
    users
      .map((u: any) => (u.user_metadata?.full_name ?? u.user_metadata?.name ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  const posts = await kv.get("posts") ?? [];
  const kept = posts.filter((p: any) => {
    const authorName = typeof p.author === "string" ? p.author : (p.author?.name ?? "");
    return validNames.has((authorName || "").trim().toLowerCase());
  });
  const removed = posts.length - kept.length;
  await kv.set("posts", kept);
  return c.json({ removed, message: `${removed} orphaned post${removed === 1 ? "" : "s"} removed.` });
});

app.post(`${BASE}/admin/bootstrap`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const users = await listAuthUsers();
  if (users.some((u: any) => u.app_metadata?.role === "superadmin")) {
    return c.json({ error: "A super administrator already exists. Contact them to request access." }, 409);
  }
  const res = await setUserRole(caller.id, "superadmin");
  if (!res.ok) return c.json({ error: await res.text() }, res.status);
  return c.json({ ok: true, message: "You are now a super administrator. Sign out and sign back in to activate your access." });
});

Deno.serve(app.fetch);
