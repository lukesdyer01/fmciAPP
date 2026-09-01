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
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

app.get(`${BASE}/members/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const users = await listAuthUsers();
  const u = users.find((x: any) => x.id === id);
  if (!u) return c.json({ error: "Member not found" }, 404);
  return c.json({
    id: u.id,
    name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
    title: u.user_metadata?.title ?? "",
    church: u.user_metadata?.church ?? "",
    location: u.user_metadata?.location ?? "",
    avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
    coverUrl: u.user_metadata?.cover_url ?? u.user_metadata?.coverUrl ?? "",
    bio: u.user_metadata?.bio ?? "",
    website: u.user_metadata?.website ?? "",
    verified: !!(u.user_metadata?.verified ?? u.confirmed_at),
    joinedAt: u.created_at,
  });
});

app.get(`${BASE}/posts`, async (c) => {
  const posts = await kv.get("posts") ?? SEED_POSTS;
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json(posts);
  // isFollowing is computed from real org-follow relationships, not trusted
  // from however the post was created — that's what powers the feed's
  // "Following" tab for posts made on behalf of an org.
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const followedOrgIds = new Set(
    orgs.filter((o: any) => Array.isArray(o.followerIds) && o.followerIds.includes(caller.id)).map((o: any) => o.id)
  );
  return c.json(posts.map((p: any) => p.orgId ? { ...p, isFollowing: followedOrgIds.has(p.orgId) } : p));
});

app.post(`${BASE}/posts`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  const posts = await kv.get("posts") ?? SEED_POSTS;
  // authorId is stamped from the verified caller, never trusted from the client —
  // it's what edit/delete ownership checks below rely on.
  const newPost = {
    id: `p${Date.now()}`, reactions: {}, commentCount: 0, createdAt: new Date().toISOString(), isFollowing: false,
    ...(body.type === "prayer" ? { prayerStatus: "unanswered" } : {}),
    ...body, authorId: caller.id,
  };
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
  const updated = {
    ...post,
    // Only stamp editedAt when the actual content changed — a pure status
    // toggle (e.g. marking a prayer request answered) isn't an edit.
    ...(body.content !== undefined ? { content: body.content, editedAt: new Date().toISOString() } : {}),
    ...(body.prayerStatus !== undefined ? { prayerStatus: body.prayerStatus } : {}),
  };
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
  // A wall owner may also remove posts others wrote on their own page, same as
  // Facebook timeline moderation — separate from authorship-based edit rights.
  const isWallOwner = post.wallUserId && post.wallUserId === caller.id;
  if (!canModifyPost(post, caller) && !isWallOwner) return c.json({ error: "Forbidden" }, 403);
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

function serializeOrg(o: any, callerId: string) {
  const members = Array.isArray(o.members) ? o.members : [];
  const followerIds = Array.isArray(o.followerIds) ? o.followerIds : [];
  return { ...o, members, following: followerIds.includes(callerId), followerCount: followerIds.length };
}

function orgRole(org: any, userId: string): string | undefined {
  return (Array.isArray(org.members) ? org.members : []).find((m: any) => m.userId === userId)?.role;
}

app.get(`${BASE}/orgs/my`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  // "My Organizations" surfaces every active org on the platform, not just
  // ones the caller belongs to — membership/ownership is still tracked per
  // org (for Manage Members) and following is tracked separately.
  const active = orgs.filter((o: any) => o.status === "active").map((o: any) => serializeOrg(o, caller.id));
  return c.json(active);
});

// Every user is inherently part of FMCI itself — called once per session on
// app load, idempotent, so it's safe to call repeatedly.
app.post(`${BASE}/orgs/fmci-bootstrap`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const fmci = orgs.find((o: any) => o.id === "org_fmci");
  if (!fmci) return c.json({ ok: true });
  const members = Array.isArray(fmci.members) ? fmci.members : [];
  const followerIds = Array.isArray(fmci.followerIds) ? fmci.followerIds : [];
  const needsMember = !members.some((m: any) => m.userId === caller.id);
  const needsFollow = !followerIds.includes(caller.id);
  if (!needsMember && !needsFollow) return c.json(serializeOrg(fmci, caller.id));
  const updated = {
    ...fmci,
    members: needsMember ? [...members, { userId: caller.id, role: "member", addedAt: new Date().toISOString() }] : members,
    followerIds: needsFollow ? [...followerIds, caller.id] : followerIds,
  };
  await kv.set("orgs", orgs.map((o: any) => o.id === "org_fmci" ? updated : o));
  return c.json(serializeOrg(updated, caller.id));
});

app.post(`${BASE}/orgs`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  if (!body.name || !String(body.name).trim()) return c.json({ error: "Organization name is required" }, 400);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const newOrg = {
    id: `org_${Date.now()}`,
    name: String(body.name).trim(),
    type: body.type ?? "church",
    description: body.description ?? "",
    location: body.location ?? "",
    website: body.website ?? "",
    img: body.img ?? "",
    verified: false,
    status: "active",
    features: [],
    createdAt: new Date().toISOString(),
    // Creator becomes owner immediately.
    members: [{ userId: caller.id, role: "owner", addedAt: new Date().toISOString() }],
    followerIds: [],
  };
  await kv.set("orgs", [newOrg, ...orgs]);
  return c.json(serializeOrg(newOrg, caller.id), 201);
});

app.post(`${BASE}/orgs/:id/members`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const { userId, role } = await c.req.json();
  if (!userId || !["admin", "moderator"].includes(role)) return c.json({ error: "userId and a valid role are required" }, 400);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  if (myRole !== "owner" && myRole !== "admin") return c.json({ error: "Forbidden" }, 403);
  const members = Array.isArray(org.members) ? org.members : [];
  if (members.some((m: any) => m.userId === userId)) return c.json({ error: "Already a member" }, 400);
  const updated = { ...org, members: [...members, { userId, role, addedAt: new Date().toISOString() }] };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(serializeOrg(updated, caller.id));
});

app.delete(`${BASE}/orgs/:id/members/:userId`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id, userId } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  if (myRole !== "owner" && myRole !== "admin") return c.json({ error: "Forbidden" }, 403);
  const target = (Array.isArray(org.members) ? org.members : []).find((m: any) => m.userId === userId);
  if (target?.role === "owner") return c.json({ error: "Cannot remove the owner" }, 400);
  const updated = { ...org, members: (org.members ?? []).filter((m: any) => m.userId !== userId) };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(serializeOrg(updated, caller.id));
});

app.post(`${BASE}/orgs/:id/follow`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const followerIds = Array.isArray(org.followerIds) ? org.followerIds : [];
  const updated = { ...org, followerIds: followerIds.includes(caller.id) ? followerIds : [...followerIds, caller.id] };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(serializeOrg(updated, caller.id));
});

app.post(`${BASE}/orgs/:id/unfollow`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const followerIds = (Array.isArray(org.followerIds) ? org.followerIds : []).filter((uid: string) => uid !== caller.id);
  const updated = { ...org, followerIds };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(serializeOrg(updated, caller.id));
});

function serializeEvent(e: any, callerId: string) {
  const going = Array.isArray(e.going) ? e.going : [];
  const interested = Array.isArray(e.interested) ? e.interested : [];
  return { ...e, attending: going.length, interestedCount: interested.length, isGoing: going.includes(callerId), isInterested: interested.includes(callerId) };
}

app.get(`${BASE}/events`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  const events = await kv.get("events") ?? [];
  if (!caller) return c.json(events);
  return c.json(events.map((e: any) => serializeEvent(e, caller.id)));
});

app.post(`${BASE}/events`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  if (!body.title || !String(body.title).trim()) return c.json({ error: "Event title is required" }, 400);
  // An event posted on behalf of a ministry requires being that ministry's
  // owner/admin — anyone can create a personal (non-org) event.
  if (body.orgId) {
    const orgs = await kv.get("orgs") ?? SEED_ORGS;
    const org = orgs.find((o: any) => o.id === body.orgId);
    const myRole = org ? orgRole(org, caller.id) : undefined;
    if (!org || (myRole !== "owner" && myRole !== "admin")) {
      return c.json({ error: "Only that ministry's owner or admin can post events on its behalf" }, 403);
    }
  }
  const events = await kv.get("events") ?? [];
  const newEvent = {
    id: `e${Date.now()}`,
    title: String(body.title).trim(),
    host: body.host ?? "",
    orgId: body.orgId ?? null,
    orgName: body.orgName ?? null,
    date: body.date ?? "",
    time: body.time ?? "",
    location: body.location ?? "",
    img: body.img ?? "",
    infoUrl: body.infoUrl ?? "",
    type: body.type ?? "Conference",
    access: body.access ?? "Open to all",
    price: body.price ?? "Free",
    speakers: Array.isArray(body.speakers) ? body.speakers.filter(Boolean) : [],
    official: !!body.official,
    createdBy: caller.id,
    createdAt: new Date().toISOString(),
    going: [caller.id],
    interested: [],
  };
  await kv.set("events", [newEvent, ...events]);
  return c.json(serializeEvent(newEvent, caller.id), 201);
});

app.post(`${BASE}/events/:id/rsvp`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const { status } = await c.req.json(); // "going" | "interested" | null
  const events = await kv.get("events") ?? [];
  const event = events.find((e: any) => e.id === id);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const going = (Array.isArray(event.going) ? event.going : []).filter((u: string) => u !== caller.id);
  const interested = (Array.isArray(event.interested) ? event.interested : []).filter((u: string) => u !== caller.id);
  if (status === "going") going.push(caller.id);
  else if (status === "interested") interested.push(caller.id);
  const updated = { ...event, going, interested };
  await kv.set("events", events.map((e: any) => e.id === id ? updated : e));
  return c.json(serializeEvent(updated, caller.id));
});

app.patch(`${BASE}/events/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const events = await kv.get("events") ?? [];
  const event = events.find((e: any) => e.id === id);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const isCreator = event.createdBy === caller.id;
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isCreator && !isAdmin) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  if (body.title !== undefined && !String(body.title).trim()) return c.json({ error: "Event title is required" }, 400);
  const EDITABLE_FIELDS = ["title", "date", "time", "location", "img", "infoUrl", "type", "access", "price", "speakers"];
  const patch: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) patch[f] = f === "title" ? String(body[f]).trim() : body[f];
  }
  if (isAdmin && body.official !== undefined) patch.official = !!body.official;
  const updated = { ...event, ...patch, editedAt: new Date().toISOString() };
  await kv.set("events", events.map((e: any) => e.id === id ? updated : e));
  return c.json(serializeEvent(updated, caller.id));
});

app.delete(`${BASE}/events/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const events = await kv.get("events") ?? [];
  const event = events.find((e: any) => e.id === id);
  if (!event) return c.json({ error: "Event not found" }, 404);
  const isCreator = event.createdBy === caller.id;
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isCreator && !isAdmin) return c.json({ error: "Forbidden" }, 403);
  await kv.set("events", events.filter((e: any) => e.id !== id));
  return c.json({ ok: true });
});

app.get(`${BASE}/resources`, async (c) => {
  const resources = await kv.get("resources") ?? [];
  return c.json(resources);
});

app.post(`${BASE}/resources`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  if (!body.title || !String(body.title).trim()) return c.json({ error: "Resource title is required" }, 400);
  const resources = await kv.get("resources") ?? [];
  const newResource = {
    id: `r${Date.now()}`,
    title: String(body.title).trim(),
    author: body.author ?? "",
    type: ["Book", "Course", "Series", "Podcast", "Article"].includes(body.type) ? body.type : "Article",
    category: body.category ?? "Discipleship",
    description: body.description ?? "",
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    img: body.img ?? "",
    url: body.url ?? "",
    recommended: false,
    rating: 0,
    reviews: 0,
    reviewList: [],
    createdBy: caller.id,
    submittedByName: body.submittedByName ?? "",
    createdAt: new Date().toISOString(),
  };
  await kv.set("resources", [newResource, ...resources]);
  return c.json(newResource, 201);
});

function recomputeResourceRating(resource: any) {
  const list = Array.isArray(resource.reviewList) ? resource.reviewList : [];
  const reviews = list.length;
  const rating = reviews ? Math.round((list.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews) * 10) / 10 : 0;
  return { ...resource, reviewList: list, reviews, rating };
}

app.post(`${BASE}/resources/:id/reviews`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const resources = await kv.get("resources") ?? [];
  const resource = resources.find((r: any) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  const body = await c.req.json();
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return c.json({ error: "Rating must be between 1 and 5" }, 400);
  const reviewerName = body.reviewerName ?? "";
  const existingList = Array.isArray(resource.reviewList) ? resource.reviewList : [];
  // One review per user — re-reviewing edits the existing entry rather than piling up duplicates.
  const withoutMine = existingList.filter((r: any) => r.userId !== caller.id);
  const myReview = {
    id: `rev${Date.now()}`, userId: caller.id, reviewerName,
    rating, comment: String(body.comment ?? "").trim(), createdAt: new Date().toISOString(),
  };
  const updated = recomputeResourceRating({ ...resource, reviewList: [myReview, ...withoutMine] });
  await kv.set("resources", resources.map((r: any) => r.id === id ? updated : r));
  return c.json(updated);
});

app.delete(`${BASE}/resources/:id/reviews/:reviewId`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id, reviewId } = c.req.param();
  const resources = await kv.get("resources") ?? [];
  const resource = resources.find((r: any) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  const list = Array.isArray(resource.reviewList) ? resource.reviewList : [];
  const review = list.find((r: any) => r.id === reviewId);
  if (!review) return c.json({ error: "Review not found" }, 404);
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (review.userId !== caller.id && !isAdmin) return c.json({ error: "Forbidden" }, 403);
  const updated = recomputeResourceRating({ ...resource, reviewList: list.filter((r: any) => r.id !== reviewId) });
  await kv.set("resources", resources.map((r: any) => r.id === id ? updated : r));
  return c.json(updated);
});

app.patch(`${BASE}/resources/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const resources = await kv.get("resources") ?? [];
  const resource = resources.find((r: any) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  const isCreator = resource.createdBy === caller.id;
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isCreator && !isAdmin) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  if (body.title !== undefined && !String(body.title).trim()) return c.json({ error: "Resource title is required" }, 400);
  const EDITABLE_FIELDS = ["title", "author", "type", "category", "description", "tags", "img", "url"];
  const patch: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) patch[f] = f === "title" ? String(body[f]).trim() : body[f];
  }
  if (isAdmin && body.recommended !== undefined) patch.recommended = !!body.recommended;
  const updated = { ...resource, ...patch, editedAt: new Date().toISOString() };
  await kv.set("resources", resources.map((r: any) => r.id === id ? updated : r));
  return c.json(updated);
});

app.delete(`${BASE}/resources/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const resources = await kv.get("resources") ?? [];
  const resource = resources.find((r: any) => r.id === id);
  if (!resource) return c.json({ error: "Resource not found" }, 404);
  const isCreator = resource.createdBy === caller.id;
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isCreator && !isAdmin) return c.json({ error: "Forbidden" }, 403);
  await kv.set("resources", resources.filter((r: any) => r.id !== id));
  return c.json({ ok: true });
});

function dmConversationId(userA: string, userB: string) {
  return `dm_${[userA, userB].sort().join("_")}`;
}

async function userSummary(userId: string) {
  const users = await listAuthUsers();
  const u = users.find((x: any) => x.id === userId);
  if (!u) return { id: userId, name: "", avatarUrl: "" };
  return {
    id: u.id,
    name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
    avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
  };
}

app.get(`${BASE}/conversations`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const conversations = await kv.get("conversations") ?? [];
  const mine = conversations.filter((conv: any) => Array.isArray(conv.participantIds) && conv.participantIds.includes(caller.id));
  const summaries = await Promise.all(mine.map(async (conv: any) => {
    const otherId = conv.participantIds.find((id: string) => id !== caller.id);
    const other = await userSummary(otherId);
    const messages = Array.isArray(conv.messages) ? conv.messages : [];
    const lastMessage = messages[messages.length - 1] ?? null;
    const lastReadAt = conv.lastReadAt?.[caller.id] ?? null;
    const unreadCount = messages.filter((m: any) => m.senderId !== caller.id && (!lastReadAt || m.createdAt > lastReadAt)).length;
    return {
      id: conv.id,
      otherUser: other,
      lastMessage: lastMessage ? { text: lastMessage.text, senderId: lastMessage.senderId, createdAt: lastMessage.createdAt } : null,
      unreadCount,
      updatedAt: conv.updatedAt,
    };
  }));
  summaries.sort((a: any, b: any) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return c.json(summaries);
});

app.post(`${BASE}/conversations`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { otherUserId } = await c.req.json();
  if (!otherUserId || otherUserId === caller.id) return c.json({ error: "A valid other user is required" }, 400);
  const conversations = await kv.get("conversations") ?? [];
  const id = dmConversationId(caller.id, otherUserId);
  let conv = conversations.find((x: any) => x.id === id);
  if (!conv) {
    conv = { id, participantIds: [caller.id, otherUserId], messages: [], lastReadAt: {}, updatedAt: new Date().toISOString() };
    await kv.set("conversations", [conv, ...conversations]);
  }
  const other = await userSummary(otherUserId);
  return c.json({ id: conv.id, otherUser: other, lastMessage: null, unreadCount: 0, updatedAt: conv.updatedAt });
});

app.get(`${BASE}/conversations/:id/messages`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const conversations = await kv.get("conversations") ?? [];
  const conv = conversations.find((x: any) => x.id === id);
  if (!conv || !conv.participantIds.includes(caller.id)) return c.json({ error: "Conversation not found" }, 404);
  const updated = { ...conv, lastReadAt: { ...(conv.lastReadAt ?? {}), [caller.id]: new Date().toISOString() } };
  await kv.set("conversations", conversations.map((x: any) => x.id === id ? updated : x));
  return c.json(Array.isArray(conv.messages) ? conv.messages : []);
});

app.post(`${BASE}/conversations/:id/messages`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const { text } = await c.req.json();
  if (!text || !String(text).trim()) return c.json({ error: "Message text is required" }, 400);
  const conversations = await kv.get("conversations") ?? [];
  const conv = conversations.find((x: any) => x.id === id);
  if (!conv || !conv.participantIds.includes(caller.id)) return c.json({ error: "Conversation not found" }, 404);
  const message = { id: `m${Date.now()}`, senderId: caller.id, text: String(text).trim(), createdAt: new Date().toISOString() };
  const messages = [...(Array.isArray(conv.messages) ? conv.messages : []), message];
  const updated = { ...conv, messages, updatedAt: message.createdAt, lastReadAt: { ...(conv.lastReadAt ?? {}), [caller.id]: message.createdAt } };
  await kv.set("conversations", conversations.map((x: any) => x.id === id ? updated : x));
  return c.json(message, 201);
});

function serializeGroup(g: any, callerId: string) {
  const memberIds = Array.isArray(g.memberIds) ? g.memberIds : [];
  return { ...g, members: memberIds.length, joined: memberIds.includes(callerId) };
}

app.get(`${BASE}/groups`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const groups = await kv.get("groups") ?? [];
  return c.json(groups.map((g: any) => serializeGroup(g, caller.id)));
});

app.post(`${BASE}/groups`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  if (!body.name || !String(body.name).trim()) return c.json({ error: "Group name is required" }, 400);
  const groups = await kv.get("groups") ?? [];
  const newGroup = {
    id: `g${Date.now()}`,
    name: String(body.name).trim(),
    description: body.description ?? "",
    about: body.about ?? body.description ?? "",
    type: ["Leadership-Only", "Private", "Public", "Invite-Only"].includes(body.type) ? body.type : "Public",
    img: body.img ?? "",
    founded: new Date().toISOString(),
    lastActivity: "just now",
    // Creator joins and becomes admin automatically.
    memberIds: [caller.id],
    admins: [caller.id],
  };
  await kv.set("groups", [newGroup, ...groups]);
  return c.json(serializeGroup(newGroup, caller.id), 201);
});

app.patch(`${BASE}/groups/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const groups = await kv.get("groups") ?? [];
  const group = groups.find((g: any) => g.id === id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const isGroupAdmin = Array.isArray(group.admins) && group.admins.includes(caller.id);
  const isPlatformAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isGroupAdmin && !isPlatformAdmin) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  if (body.name !== undefined && !String(body.name).trim()) return c.json({ error: "Group name is required" }, 400);
  const EDITABLE_FIELDS = ["name", "description", "about", "type", "img"];
  const patch: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) patch[f] = f === "name" ? String(body[f]).trim() : body[f];
  }
  if (patch.type && !["Leadership-Only", "Private", "Public", "Invite-Only"].includes(patch.type as string)) delete patch.type;
  const updated = { ...group, ...patch };
  await kv.set("groups", groups.map((g: any) => g.id === id ? updated : g));
  return c.json(serializeGroup(updated, caller.id));
});

app.post(`${BASE}/groups/:id/join`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const groups = await kv.get("groups") ?? [];
  const group = groups.find((g: any) => g.id === id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  const updated = { ...group, memberIds: memberIds.includes(caller.id) ? memberIds : [...memberIds, caller.id] };
  await kv.set("groups", groups.map((g: any) => g.id === id ? updated : g));
  return c.json(serializeGroup(updated, caller.id));
});

app.post(`${BASE}/groups/:id/leave`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const groups = await kv.get("groups") ?? [];
  const group = groups.find((g: any) => g.id === id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const memberIds = (Array.isArray(group.memberIds) ? group.memberIds : []).filter((uid: string) => uid !== caller.id);
  const updated = { ...group, memberIds };
  await kv.set("groups", groups.map((g: any) => g.id === id ? updated : g));
  return c.json(serializeGroup(updated, caller.id));
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

const DEFAULT_SETTINGS = { openRegistration: true };

// Unauthenticated-readable (behind the anon key only) — AuthGate needs this
// before a visitor has an account, to decide whether to allow signup at all.
app.get(`${BASE}/settings`, async (c) => c.json(await kv.get("settings") ?? DEFAULT_SETTINGS));

app.put(`${BASE}/settings`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  const current = await kv.get("settings") ?? DEFAULT_SETTINGS;
  const updated = { ...current, ...body };
  await kv.set("settings", updated);
  return c.json(updated);
});

Deno.serve(app.fetch);
