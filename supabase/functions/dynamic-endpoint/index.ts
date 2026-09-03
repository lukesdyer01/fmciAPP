import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import webpush from "npm:web-push";

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

// Web Push (iOS 16.4+/Android for a home-screen-installed PWA). Subscriptions
// are stored in the KV store, never in user_metadata — anything in
// user_metadata gets embedded in every JWT the user is issued (see
// EditProfileModal.tsx's comment on the avatar-base64 incident), and a
// subscription object is the same risk profile, just via a different field.
const VAPID_PUBLIC_KEY  = () => Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = () => Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT     = () => Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@fmci.network";

async function getUserSubscriptions(userId: string): Promise<any[]> {
  const all = await kv.get("push_subscriptions") ?? {};
  return Array.isArray(all[userId]) ? all[userId] : [];
}

async function saveUserSubscriptions(userId: string, subs: any[]): Promise<void> {
  const all = await kv.get("push_subscriptions") ?? {};
  await kv.set("push_subscriptions", { ...all, [userId]: subs });
}

// Returns false only for a definitive 404/410 (subscription expired/revoked)
// so the caller can prune it — anything else (network blip, 5xx) throws and
// is treated as transient, keeping the subscription for the next attempt.
async function sendWebPush(subscription: any, payload: string): Promise<boolean> {
  webpush.setVapidDetails(VAPID_SUBJECT(), VAPID_PUBLIC_KEY(), VAPID_PRIVATE_KEY());
  try {
    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) return false;
    throw err;
  }
}

async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  const subs = await getUserSubscriptions(userId);
  if (subs.length === 0) return;
  const survivors: any[] = [];
  for (const sub of subs) {
    try {
      const ok = await sendWebPush(sub, JSON.stringify(payload));
      if (ok) survivors.push(sub);
    } catch {
      survivors.push(sub);
    }
  }
  if (survivors.length !== subs.length) await saveUserSubscriptions(userId, survivors);
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
      ministryRoles: Array.isArray(u.user_metadata?.ministryRoles) ? u.user_metadata.ministryRoles : [],
      additionalRoles: Array.isArray(u.user_metadata?.additionalRoles) ? u.user_metadata.additionalRoles : [],
      communicationPrefs: Array.isArray(u.user_metadata?.communicationPrefs) ? u.user_metadata.communicationPrefs : [],
      fmciLeadershipRole: u.user_metadata?.fmciLeadershipRole ?? "",
      memberSince: u.user_metadata?.memberSince ?? "",
      createdAt: u.created_at,
    }));
  return c.json(members);
});

// Called periodically by every signed-in client while the app is open —
// powers the "Active Now" sidebar widget. Not admin-gated: any signed-in
// member can see who else is currently active, same visibility as the
// member directory itself.
app.post(`${BASE}/heartbeat`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const res = await updateUserMeta(caller.id, { ...caller.user_metadata, lastActiveAt: new Date().toISOString() });
  if (!res.ok) return c.json({ error: await res.text() }, res.status);
  return c.json({ ok: true });
});

// Must be registered before the /members/:id route below — otherwise Hono
// matches "active" as the :id param and this route never gets hit.
app.get(`${BASE}/members/active`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const users = await listAuthUsers();
  const cutoff = Date.now() - 5 * 60 * 1000;
  const active = users
    .filter((u: any) => u.id !== caller.id)
    .map((u: any) => ({ u, lastActiveAt: u.user_metadata?.lastActiveAt }))
    .filter((x: any) => x.lastActiveAt && new Date(x.lastActiveAt).getTime() > cutoff)
    .sort((a: any, b: any) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .map(({ u, lastActiveAt }: any) => ({
      id: u.id,
      name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
      avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
      title: u.user_metadata?.title ?? "",
      church: u.user_metadata?.church ?? "",
      lastActiveAt,
    }));
  return c.json(active);
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
    bio: u.user_metadata?.bio ?? "",
    website: u.user_metadata?.website ?? "",
    email: u.email ?? "",
    phone: u.user_metadata?.phone ?? "",
    ministryRoles: Array.isArray(u.user_metadata?.ministryRoles) ? u.user_metadata.ministryRoles : [],
    additionalRoles: Array.isArray(u.user_metadata?.additionalRoles) ? u.user_metadata.additionalRoles : [],
    communicationPrefs: Array.isArray(u.user_metadata?.communicationPrefs) ? u.user_metadata.communicationPrefs : [],
    fmciLeadershipRole: u.user_metadata?.fmciLeadershipRole ?? "",
    memberSince: u.user_metadata?.memberSince ?? "",
    verified: !!u.user_metadata?.verified,
    joinedAt: u.created_at,
  });
});

app.post(`${BASE}/verification-requests`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  if (caller.user_metadata?.verified) return c.json({ error: "You're already verified" }, 400);
  const requests = await kv.get("verification_requests") ?? [];
  if (requests.some((r: any) => r.userId === caller.id && r.status === "pending")) {
    return c.json({ error: "You already have a pending verification request" }, 400);
  }
  const body = await c.req.json();
  const reason = String(body.reason ?? "").trim();
  if (!reason) return c.json({ error: "Please tell us why you're requesting verification" }, 400);
  const newRequest = {
    id: `vr_${Date.now()}`,
    userId: caller.id,
    name: caller.user_metadata?.full_name ?? caller.user_metadata?.name ?? "",
    avatarUrl: caller.user_metadata?.avatar_url ?? caller.user_metadata?.avatarUrl ?? "",
    email: caller.email,
    title: String(body.title ?? "").trim(),
    church: String(body.church ?? "").trim(),
    location: caller.user_metadata?.location ?? "",
    reason,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  await kv.set("verification_requests", [...requests, newRequest]);
  return c.json(newRequest);
});

app.get(`${BASE}/verification-requests/mine`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const requests = await kv.get("verification_requests") ?? [];
  const mine = requests.filter((r: any) => r.userId === caller.id).sort((a: any, b: any) => b.submittedAt.localeCompare(a.submittedAt));
  return c.json(mine[0] ?? null);
});

app.get(`${BASE}/verification-requests`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const requests = await kv.get("verification_requests") ?? [];
  return c.json([...requests].sort((a: any, b: any) => b.submittedAt.localeCompare(a.submittedAt)));
});

app.post(`${BASE}/verification-requests/:id/approve`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const { id } = c.req.param();
  const requests = await kv.get("verification_requests") ?? [];
  const target = requests.find((r: any) => r.id === id);
  if (!target) return c.json({ error: "Request not found" }, 404);
  const userRes = await fetch(`${SUPABASE_URL()}/auth/v1/admin/users/${target.userId}`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY()}`, apikey: SERVICE_KEY() },
  });
  if (userRes.ok) {
    const user = await userRes.json();
    await updateUserMeta(target.userId, { ...user.user_metadata, verified: true });
  }
  const updated = requests.map((r: any) => r.id === id ? { ...r, status: "approved" } : r);
  await kv.set("verification_requests", updated);
  return c.json({ ok: true });
});

app.post(`${BASE}/verification-requests/:id/deny`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const { id } = c.req.param();
  const requests = await kv.get("verification_requests") ?? [];
  if (!requests.some((r: any) => r.id === id)) return c.json({ error: "Request not found" }, 404);
  const updated = requests.map((r: any) => r.id === id ? { ...r, status: "denied" } : r);
  await kv.set("verification_requests", updated);
  return c.json({ ok: true });
});

// `pinned` is never trusted as a stored flag — it's derived from pinnedUntil
// every time posts are read, so a 7-day pin expires on its own with no cron
// cleanup needed.
function withComputedPinned(p: any) {
  return { ...p, pinned: !!p.pinnedUntil && new Date(p.pinnedUntil).getTime() > Date.now() };
}

app.get(`${BASE}/posts`, async (c) => {
  const posts = await kv.get("posts") ?? SEED_POSTS;
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json(posts.filter((p: any) => p.visibility !== "private").map(withComputedPinned));
  // isFollowing is computed from real org-follow relationships, not trusted
  // from however the post was created — that's what powers the feed's
  // "Following" tab for posts made on behalf of an org.
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const followedOrgIds = new Set(
    orgs.filter((o: any) => Array.isArray(o.followerIds) && o.followerIds.includes(caller.id)).map((o: any) => o.id)
  );
  // Private posts are members-only — only visible to a caller who belongs to
  // (any role in) the post's org. Everyone else never receives them at all,
  // not even a filtered-out placeholder.
  const memberOrgIds = new Set(orgs.filter((o: any) => orgRole(o, caller.id)).map((o: any) => o.id));
  const visible = posts.filter((p: any) => p.visibility !== "private" || memberOrgIds.has(p.orgId));
  return c.json(visible.map((p: any) => withComputedPinned(p.orgId ? { ...p, isFollowing: followedOrgIds.has(p.orgId) } : p)));
});

app.post(`${BASE}/posts`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const body = await c.req.json();
  // orgName is the "posted on behalf of" claim — only that ministry's owner
  // or admin may make it (mirrors the same check on POST /events). Posting
  // orgId alone (into a ministry's feed as yourself, no badge) stays open
  // to any member, matching existing behavior.
  if (body.orgName) {
    const orgs = await kv.get("orgs") ?? SEED_ORGS;
    const org = body.orgId ? orgs.find((o: any) => o.id === body.orgId) : null;
    const myRole = org ? orgRole(org, caller.id) : undefined;
    if (!org || (myRole !== "owner" && myRole !== "admin")) {
      return c.json({ error: "Only that ministry's owner or admin can post on its behalf" }, 403);
    }
    // Pinning ("sticky for 7 days") is restricted to FMCI's own official
    // announcements — org.type "headquarters" is unique to FMCI itself, not
    // any individual ministry — same owner/admin check as posting on its
    // behalf, already verified above.
    if (body.pinned && org.type === "headquarters") {
      body.pinnedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  }
  delete body.pinned;
  if (body.visibility && !["public", "private"].includes(body.visibility)) {
    return c.json({ error: "Invalid visibility" }, 400);
  }
  // A private (members-only) post requires the caller to actually belong to
  // that ministry — any role, not just owner/admin, unlike posting *as* the
  // ministry above, which is a much higher-trust action.
  if (body.visibility === "private") {
    const orgs = await kv.get("orgs") ?? SEED_ORGS;
    const org = body.orgId ? orgs.find((o: any) => o.id === body.orgId) : null;
    if (!org || !orgRole(org, caller.id)) {
      return c.json({ error: "Only that ministry's members can post privately to it" }, 403);
    }
  }
  // Writing on another member's wall is intentionally open to anyone (like a
  // classic profile wall) — the author identity is never spoofed, only which
  // profile the post additionally appears on — so this only guards against a
  // fabricated/nonexistent id, not who's allowed to use a real one.
  if (body.wallUserId) {
    const users = await listAuthUsers();
    if (!users.some((u: any) => u.id === body.wallUserId)) {
      return c.json({ error: "wallUserId does not refer to a real user" }, 400);
    }
  }
  const posts = await kv.get("posts") ?? SEED_POSTS;
  // authorId is stamped from the verified caller, never trusted from the client —
  // it's what edit/delete ownership checks below rely on.
  const newPost = {
    id: `p${Date.now()}`, reactions: {}, commentCount: 0, createdAt: new Date().toISOString(), isFollowing: false,
    ...(body.type === "prayer" ? { prayerStatus: "unanswered" } : {}),
    ...body, authorId: caller.id,
  };
  await kv.set("posts", [newPost, ...posts]);
  return c.json(withComputedPinned(newPost), 201);
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

// Used by the admin Ministries screen — unauthenticated like the rest of
// that admin data-fetching (see PUT /orgs below), but still needs member
// enrichment so the admin's member list shows real names/avatars too, not
// just the front-end's (which goes through GET /orgs/my instead).
app.get(`${BASE}/orgs`, async (c) => {
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const users = await listAuthUsers();
  const enriched = await Promise.all(orgs.map((o: any) => serializeOrg(o, "", users)));
  return c.json(enriched);
});

// Geocodes each active org's address (or city/state) once via Nominatim and
// caches lat/lng permanently on the org record — later calls just read the
// cache, so this only ever hits the geocoder for a genuinely new location.
app.get(`${BASE}/orgs/locations`, async (c) => {
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const active = orgs.filter((o: any) => o.status === "active");
  let changed = false;
  const results = [];
  for (const o of active) {
    const summary = { id: o.id, name: o.name, type: o.type, location: o.location, address: o.address, img: o.img, verified: o.verified };
    if (o.lat != null && o.lng != null) {
      results.push({ ...summary, lat: o.lat, lng: o.lng });
      continue;
    }
    if (o.geocodeFailed) {
      results.push({ ...summary, lat: null, lng: null });
      continue;
    }
    const query = (o.address ?? "").trim() || (o.location ?? "").trim();
    if (!query) { results.push({ ...summary, lat: null, lng: null }); continue; }
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "FMCI-Network-App/1.0" },
      });
      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData[0]) {
        o.lat = parseFloat(geoData[0].lat);
        o.lng = parseFloat(geoData[0].lon);
        changed = true;
        results.push({ ...summary, lat: o.lat, lng: o.lng });
      } else {
        o.geocodeFailed = true;
        changed = true;
        results.push({ ...summary, lat: null, lng: null });
      }
    } catch {
      // Network hiccup — don't cache a failure, just skip it for this request and retry next time.
      results.push({ ...summary, lat: null, lng: null });
    }
    // Be a good citizen of Nominatim's free tier (~1 req/sec) when geocoding more than one org.
    await new Promise(r => setTimeout(r, 250));
  }
  if (changed) await kv.set("orgs", orgs);
  return c.json(results);
});

// org.members only ever stores {userId, role, addedAt} — name/email/avatarUrl
// are resolved here from the real auth user record, same convention as
// GET /members and GET /orgs/:id/join-requests. `users` can be pre-fetched
// once by a caller that's serializing many orgs (GET /orgs/my) to avoid a
// redundant listAuthUsers() call per org; otherwise it's fetched here.
async function serializeOrg(o: any, callerId: string, users?: any[]) {
  const resolvedUsers = users ?? await listAuthUsers();
  const members = (Array.isArray(o.members) ? o.members : []).map((m: any) => {
    const u = resolvedUsers.find((x: any) => x.id === m.userId);
    return {
      ...m,
      name: u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "",
      email: u?.email ?? "",
      avatarUrl: u?.user_metadata?.avatar_url ?? u?.user_metadata?.avatarUrl ?? "",
    };
  });
  const followerIds = Array.isArray(o.followerIds) ? o.followerIds : [];
  const joinRequests = Array.isArray(o.joinRequests) ? o.joinRequests : [];
  return {
    ...o, members,
    following: followerIds.includes(callerId), followerCount: followerIds.length,
    // Only whether *this caller* has a pending request, plus a bare count —
    // the full requester list (names) is deliberately not exposed here, that
    // would leak who's requesting to every viewer. Owner/admin fetch the
    // full list via GET /orgs/:id/join-requests instead.
    hasPendingRequest: joinRequests.some((r: any) => r.userId === callerId),
    pendingRequestCount: joinRequests.length,
  };
}

function orgRole(org: any, userId: string): string | undefined {
  return (Array.isArray(org.members) ? org.members : []).find((m: any) => m.userId === userId)?.role;
}

app.get(`${BASE}/orgs/my`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const users = await listAuthUsers();
  // "My Organizations" surfaces every active org on the platform, not just
  // ones the caller belongs to — membership/ownership is still tracked per
  // org (for Manage Members) and following is tracked separately.
  const active = await Promise.all(
    orgs.filter((o: any) => o.status === "active").map((o: any) => serializeOrg(o, caller.id, users))
  );
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
  if (!needsMember && !needsFollow) return c.json(await serializeOrg(fmci, caller.id));
  const updated = {
    ...fmci,
    members: needsMember ? [...members, { userId: caller.id, role: "member", addedAt: new Date().toISOString() }] : members,
    followerIds: needsFollow ? [...followerIds, caller.id] : followerIds,
  };
  await kv.set("orgs", orgs.map((o: any) => o.id === "org_fmci" ? updated : o));
  return c.json(await serializeOrg(updated, caller.id));
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
    address: body.address ?? "",
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
  return c.json(await serializeOrg(newOrg, caller.id), 201);
});

app.patch(`${BASE}/orgs/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  const isPlatformAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (myRole !== "owner" && myRole !== "admin" && !isPlatformAdmin) return c.json({ error: "Forbidden" }, 403);
  const body = await c.req.json();
  if (!body.name || !String(body.name).trim()) return c.json({ error: "Organization name is required" }, 400);
  const locationChanged = body.location !== org.location || body.address !== org.address;
  const updated = {
    ...org,
    name: String(body.name).trim(),
    type: body.type ?? org.type,
    description: body.description ?? "",
    location: body.location ?? "",
    address: body.address ?? "",
    website: body.website ?? "",
    img: body.img ?? "",
  };
  if (locationChanged) { delete updated.lat; delete updated.lng; delete updated.geocodeFailed; }
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(await serializeOrg(updated, caller.id));
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
  return c.json(await serializeOrg(updated, caller.id));
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
  return c.json(await serializeOrg(updated, caller.id));
});

app.post(`${BASE}/orgs/:id/request-join`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  if (orgRole(org, caller.id)) return c.json({ error: "Already a member" }, 400);
  const joinRequests = Array.isArray(org.joinRequests) ? org.joinRequests : [];
  if (joinRequests.some((r: any) => r.userId === caller.id)) return c.json(await serializeOrg(org, caller.id));
  const updated = { ...org, joinRequests: [...joinRequests, { userId: caller.id, requestedAt: new Date().toISOString() }] };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(await serializeOrg(updated, caller.id));
});

app.get(`${BASE}/orgs/:id/join-requests`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  if (myRole !== "owner" && myRole !== "admin") return c.json({ error: "Forbidden" }, 403);
  const joinRequests = Array.isArray(org.joinRequests) ? org.joinRequests : [];
  const users = await listAuthUsers();
  const resolved = joinRequests.map((r: any) => {
    const u = users.find((x: any) => x.id === r.userId);
    return {
      userId: r.userId,
      requestedAt: r.requestedAt,
      name: u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "",
      avatarUrl: u?.user_metadata?.avatar_url ?? u?.user_metadata?.avatarUrl ?? "",
    };
  });
  return c.json(resolved);
});

app.post(`${BASE}/orgs/:id/join-requests/:userId/approve`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id, userId } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  if (myRole !== "owner" && myRole !== "admin") return c.json({ error: "Forbidden" }, 403);
  const joinRequests = (Array.isArray(org.joinRequests) ? org.joinRequests : []).filter((r: any) => r.userId !== userId);
  const members = Array.isArray(org.members) ? org.members : [];
  const updated = {
    ...org, joinRequests,
    members: members.some((m: any) => m.userId === userId) ? members : [...members, { userId, role: "member", addedAt: new Date().toISOString() }],
  };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(await serializeOrg(updated, caller.id));
});

app.post(`${BASE}/orgs/:id/join-requests/:userId/deny`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id, userId } = c.req.param();
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const org = orgs.find((o: any) => o.id === id);
  if (!org) return c.json({ error: "Organization not found" }, 404);
  const myRole = orgRole(org, caller.id);
  if (myRole !== "owner" && myRole !== "admin") return c.json({ error: "Forbidden" }, 403);
  const updated = { ...org, joinRequests: (Array.isArray(org.joinRequests) ? org.joinRequests : []).filter((r: any) => r.userId !== userId) };
  await kv.set("orgs", orgs.map((o: any) => o.id === id ? updated : o));
  return c.json(await serializeOrg(updated, caller.id));
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
  return c.json(await serializeOrg(updated, caller.id));
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
  return c.json(await serializeOrg(updated, caller.id));
});

function serializeEvent(e: any, callerId: string) {
  const going = Array.isArray(e.going) ? e.going : [];
  const interested = Array.isArray(e.interested) ? e.interested : [];
  return { ...e, attending: going.length, interestedCount: interested.length, isGoing: going.includes(callerId), isInterested: interested.includes(callerId) };
}

app.get(`${BASE}/events`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  const events = await kv.get("events") ?? [];
  if (!caller) return c.json(events.filter((e: any) => e.visibility !== "private"));
  const orgs = await kv.get("orgs") ?? SEED_ORGS;
  const memberOrgIds = new Set(orgs.filter((o: any) => orgRole(o, caller.id)).map((o: any) => o.id));
  const visible = events.filter((e: any) => e.visibility !== "private" || memberOrgIds.has(e.orgId));
  return c.json(visible.map((e: any) => serializeEvent(e, caller.id)));
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
  if (body.visibility && !["public", "private"].includes(body.visibility)) {
    return c.json({ error: "Invalid visibility" }, 400);
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
    isRemote: !!body.isRemote,
    zoomLink: body.zoomLink ?? "",
    zoomPassword: body.zoomPassword ?? "",
    img: body.img ?? "",
    infoUrl: body.infoUrl ?? "",
    type: body.type ?? "Conference",
    access: body.access ?? "Open to all",
    price: body.price ?? "Free",
    speakers: Array.isArray(body.speakers) ? body.speakers.filter(Boolean) : [],
    official: !!body.official,
    visibility: body.orgId && body.visibility === "private" ? "private" : "public",
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
  const EDITABLE_FIELDS = ["title", "date", "time", "location", "isRemote", "zoomLink", "zoomPassword", "img", "infoUrl", "type", "access", "price", "speakers"];
  const patch: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) patch[f] = f === "title" ? String(body[f]).trim() : f === "isRemote" ? !!body[f] : body[f];
  }
  if (isAdmin && body.official !== undefined) patch.official = !!body.official;
  if (body.visibility !== undefined) {
    if (!["public", "private"].includes(body.visibility)) return c.json({ error: "Invalid visibility" }, 400);
    if (body.visibility === "private" && !event.orgId) return c.json({ error: "Only a ministry event can be members-only" }, 400);
    patch.visibility = body.visibility;
  }
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
  const isAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  // Admins can publish a resource on behalf of FMCI itself rather than
  // their own account — no individual owner, only admins can edit/delete it.
  const unattributed = isAdmin && body.unattributed === true;
  const resources = await kv.get("resources") ?? [];
  const newResource = {
    id: `r${Date.now()}`,
    title: String(body.title).trim(),
    author: body.author ?? "",
    type: ["Book", "Video", "Podcast"].includes(body.type) ? body.type : "Book",
    category: body.category ?? "Discipleship",
    description: body.description ?? "",
    tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
    img: body.img ?? "",
    url: body.url ?? "",
    recommended: false,
    rating: 0,
    reviews: 0,
    reviewList: [],
    createdBy: unattributed ? null : caller.id,
    submittedByName: unattributed ? "" : (body.submittedByName ?? ""),
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
  const EDITABLE_FIELDS = ["title", "author", "type", "category", "description", "tags", "img", "url", "submittedByName"];
  const patch: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) patch[f] = f === "title" ? String(body[f]).trim() : body[f];
  }
  if (isAdmin && body.recommended !== undefined) patch.recommended = !!body.recommended;
  // Admin-only: reassign ownership to/from FMCI itself (no individual owner).
  if (isAdmin && body.unattributed === true) { patch.createdBy = null; patch.submittedByName = ""; }
  if (isAdmin && body.unattributed === false && !resource.createdBy) { patch.createdBy = caller.id; }
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
  // Fire-and-forget — a slow/failed push must never delay or fail the
  // message send itself. Only the OTHER participant(s) get notified.
  const senderName = caller.user_metadata?.full_name ?? caller.user_metadata?.name ?? "New message";
  for (const uid of conv.participantIds.filter((u: string) => u !== caller.id)) {
    sendPushToUser(uid, {
      title: senderName,
      body: message.text.length > 120 ? message.text.slice(0, 117) + "…" : message.text,
      url: "/",
      tag: `dm-${id}`,
    }).catch(() => {});
  }
  return c.json(message, 201);
});

app.post(`${BASE}/push/subscribe`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const subscription = await c.req.json();
  if (!subscription?.endpoint) return c.json({ error: "A valid push subscription is required" }, 400);
  const existing = await getUserSubscriptions(caller.id);
  const withoutThis = existing.filter((s: any) => s.endpoint !== subscription.endpoint);
  await saveUserSubscriptions(caller.id, [...withoutThis, subscription]);
  return c.json({ ok: true });
});

app.post(`${BASE}/push/unsubscribe`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { endpoint } = await c.req.json();
  if (!endpoint) return c.json({ error: "endpoint is required" }, 400);
  const existing = await getUserSubscriptions(caller.id);
  await saveUserSubscriptions(caller.id, existing.filter((s: any) => s.endpoint !== endpoint));
  return c.json({ ok: true });
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

app.delete(`${BASE}/groups/:id`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const groups = await kv.get("groups") ?? [];
  const group = groups.find((g: any) => g.id === id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const isGroupAdmin = Array.isArray(group.admins) && group.admins.includes(caller.id);
  const isPlatformAdmin = ["superadmin", "admin"].includes(callerRole(caller));
  if (!isGroupAdmin && !isPlatformAdmin) return c.json({ error: "Forbidden" }, 403);
  await kv.set("groups", groups.filter((g: any) => g.id !== id));
  return c.json({ ok: true });
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

// Any signed-in member can see a group's roster, not just its own members —
// membership itself, and Leadership-Only/Private/Invite-Only access, still
// gate joining and posting, but the member list is public within the network.
app.get(`${BASE}/groups/:id/members`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  const { id } = c.req.param();
  const groups = await kv.get("groups") ?? [];
  const group = groups.find((g: any) => g.id === id);
  if (!group) return c.json({ error: "Group not found" }, 404);
  const memberIds = new Set(Array.isArray(group.memberIds) ? group.memberIds : []);
  const admins = new Set(Array.isArray(group.admins) ? group.admins : []);
  const users = await listAuthUsers();
  const members = users
    .filter((u: any) => memberIds.has(u.id))
    .map((u: any) => ({
      id: u.id,
      name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? "",
      title: u.user_metadata?.title ?? "",
      church: u.user_metadata?.church ?? "",
      avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.avatarUrl ?? "",
      isAdmin: admins.has(u.id),
    }))
    .sort((a: any, b: any) => Number(b.isAdmin) - Number(a.isAdmin));
  return c.json(members);
});

app.put(`${BASE}/orgs`, async (c) => {
  const body = await c.req.json();
  const previous = await kv.get("orgs") ?? SEED_ORGS;
  // If an admin edit changed an org's location/address, its cached geocode is
  // stale — clear it so /orgs/locations re-geocodes on the next request.
  const updated = body.map((o: any) => {
    const prev = previous.find((p: any) => p.id === o.id);
    if (prev && (prev.location !== o.location || prev.address !== o.address)) {
      const { lat, lng, geocodeFailed, ...rest } = o;
      return rest;
    }
    return o;
  });
  await kv.set("orgs", updated);
  return c.json(updated);
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
    verified: !!u.user_metadata?.verified,
    fmciLeadershipRole: u.user_metadata?.fmciLeadershipRole ?? "",
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
    confirmed: !!u.confirmed_at,
  })));
});

const FMCI_LEADERSHIP_ROLES = ["Apostolic Leadership Team", "Apostolic Council", "Apostolic Team Leader"];

app.post(`${BASE}/admin/update-member`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);
  const { userId, patch } = await c.req.json();
  if (!userId || !patch) return c.json({ error: "userId and patch required" }, 400);
  // FMCI Leadership Role is superadmin-only — a plain admin's request silently
  // drops the field rather than erroring, same convention as the RPC's
  // unknown-field handling elsewhere in this admin flow.
  if ("fmciLeadershipRole" in patch) {
    if (callerRole(caller) !== "superadmin") {
      delete patch.fmciLeadershipRole;
    } else if (patch.fmciLeadershipRole && !FMCI_LEADERSHIP_ROLES.includes(patch.fmciLeadershipRole)) {
      return c.json({ error: "Invalid FMCI Leadership Role" }, 400);
    }
  }
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

// ── Analytics ────────────────────────────────────────────────────────────
// From-scratch usage tracking: sessions + pageviews as flat KV blobs
// (same pattern as posts/orgs), pruned to a rolling 90 days on every write
// so they stay bounded with no cron job. Admin/superadmin activity is
// excluded — the client never calls these routes while signed in as one
// (see src/lib/analytics.ts), and these routes double-check server-side.

const ANALYTICS_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

// Sessions are keyed off lastSeenAt (most recent activity) and pageviews off
// ts — a single {ts} assumption here previously caused every session record
// to read as instantly expired (missing field -> Invalid Date -> NaN, which
// always fails > cutoff), wiping analytics_sessions down to nothing on every
// write.
function pruneAnalytics<T>(events: T[], getTs: (e: T) => string): T[] {
  const cutoff = Date.now() - ANALYTICS_WINDOW_MS;
  return events.filter(e => new Date(getTs(e)).getTime() > cutoff);
}

async function isExcludedFromAnalytics(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader) return false;
  const caller = await getCallerUser(authHeader);
  return !!caller && ["superadmin", "admin"].includes(callerRole(caller));
}

async function geolocateIp(ip: string | null): Promise<string> {
  if (!ip) return "Unknown";
  const cache = await kv.get("analytics_geo_cache") ?? {};
  const cached = cache[ip];
  if (cached && Date.now() - new Date(cached.ts).getTime() < 24 * 60 * 60 * 1000) {
    return cached.country;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`);
    const data = await res.json();
    const country = data.status === "success" && data.country ? data.country : "Unknown";
    cache[ip] = { country, ts: new Date().toISOString() };
    await kv.set("analytics_geo_cache", cache);
    return country;
  } catch {
    return "Unknown";
  }
}

function clientIp(c: any): string | null {
  const fwd = c.req.header("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return c.req.header("x-real-ip") ?? null;
}

app.post(`${BASE}/analytics/session`, async (c) => {
  if (await isExcludedFromAnalytics(c.req.header("Authorization"))) return c.json({ ok: true });
  const caller = await getCallerUser(c.req.header("Authorization"));
  const body = await c.req.json();
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return c.json({ error: "sessionId is required" }, 400);
  const country = await geolocateIp(clientIp(c));
  const sessions = pruneAnalytics(await kv.get("analytics_sessions") ?? [], (s: any) => s.lastSeenAt);
  const now = new Date().toISOString();
  const existing = sessions.find((s: any) => s.sessionId === sessionId);
  const record = {
    sessionId,
    userId: caller?.id ?? null,
    startedAt: existing?.startedAt ?? now,
    lastSeenAt: now,
    deviceType: ["mobile", "tablet", "desktop"].includes(body.deviceType) ? body.deviceType : "desktop",
    os: String(body.os ?? "Other"),
    browser: String(body.browser ?? "Other"),
    country,
    pageViews: existing?.pageViews ?? 0,
  };
  await kv.set("analytics_sessions", [record, ...sessions.filter((s: any) => s.sessionId !== sessionId)]);
  return c.json({ ok: true });
});

app.post(`${BASE}/analytics/pageview`, async (c) => {
  if (await isExcludedFromAnalytics(c.req.header("Authorization"))) return c.json({ ok: true });
  const body = await c.req.json();
  const sessionId = String(body.sessionId ?? "").trim();
  const view = String(body.view ?? "").trim();
  if (!sessionId || !view) return c.json({ ok: true });
  const now = new Date().toISOString();
  const sessions = pruneAnalytics(await kv.get("analytics_sessions") ?? [], (s: any) => s.lastSeenAt);
  const sessionExists = sessions.some((s: any) => s.sessionId === sessionId);
  if (sessionExists) {
    await kv.set("analytics_sessions", sessions.map((s: any) =>
      s.sessionId === sessionId ? { ...s, lastSeenAt: now, pageViews: (s.pageViews ?? 0) + 1 } : s
    ));
  }
  const pageviews = pruneAnalytics(await kv.get("analytics_pageviews") ?? [], (p: any) => p.ts);
  await kv.set("analytics_pageviews", [{ sessionId, view, ts: now }, ...pageviews]);
  return c.json({ ok: true });
});

app.post(`${BASE}/analytics/heartbeat`, async (c) => {
  if (await isExcludedFromAnalytics(c.req.header("Authorization"))) return c.json({ ok: true });
  const body = await c.req.json();
  const sessionId = String(body.sessionId ?? "").trim();
  if (!sessionId) return c.json({ ok: true });
  const sessions = pruneAnalytics(await kv.get("analytics_sessions") ?? [], (s: any) => s.lastSeenAt);
  await kv.set("analytics_sessions", sessions.map((s: any) =>
    s.sessionId === sessionId ? { ...s, lastSeenAt: new Date().toISOString() } : s
  ));
  return c.json({ ok: true });
});

// Shared by GET /analytics/summary (network-wide, or scoped to one user via
// ?userId=) — factored out so per-user analytics reuses the exact same
// aggregation instead of a parallel implementation drifting out of sync.
function buildAnalyticsSummary(sessions: any[], pageviews: any[]) {
  const totalMinutes = sessions.reduce((sum: number, s: any) => {
    const mins = (new Date(s.lastSeenAt).getTime() - new Date(s.startedAt).getTime()) / 60000;
    return sum + Math.max(0, mins);
  }, 0);

  function countBy(items: any[], key: string): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const k = item[key] || "Unknown";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  const byDevice = { desktop: 0, mobile: 0, tablet: 0 };
  for (const s of sessions) {
    if (s.deviceType === "mobile") byDevice.mobile++;
    else if (s.deviceType === "tablet") byDevice.tablet++;
    else byDevice.desktop++;
  }

  const topPagesCounts = new Map<string, number>();
  for (const p of pageviews) {
    topPagesCounts.set(p.view, (topPagesCounts.get(p.view) ?? 0) + 1);
  }
  const topPages = [...topPagesCounts.entries()].map(([view, count]) => ({ view, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  const dailyMap = new Map<string, { sessions: Set<string>; pageViews: number }>();
  for (let i = 0; i < 90; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    dailyMap.set(d, { sessions: new Set(), pageViews: 0 });
  }
  for (const s of sessions) {
    const d = s.startedAt.slice(0, 10);
    if (dailyMap.has(d)) dailyMap.get(d)!.sessions.add(s.sessionId);
  }
  for (const p of pageviews) {
    const d = p.ts.slice(0, 10);
    if (dailyMap.has(d)) dailyMap.get(d)!.pageViews++;
  }
  const dailyTrend = [...dailyMap.entries()]
    .map(([date, v]) => ({ date, sessions: v.sessions.size, pageViews: v.pageViews }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const uniqueVisitors = new Set(sessions.map((s: any) => s.userId ?? s.sessionId)).size;

  return {
    totals: {
      sessions: sessions.length,
      pageViews: pageviews.length,
      uniqueVisitors,
      avgSessionMinutes: sessions.length > 0 ? Math.round((totalMinutes / sessions.length) * 10) / 10 : 0,
    },
    byDevice,
    byBrowser: countBy(sessions, "browser").slice(0, 8),
    byOS: countBy(sessions, "os").slice(0, 8),
    byCountry: countBy(sessions, "country").slice(0, 10),
    topPages,
    dailyTrend,
  };
}

app.get(`${BASE}/analytics/summary`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);

  const userId = c.req.query("userId");
  let sessions = pruneAnalytics(await kv.get("analytics_sessions") ?? [], (s: any) => s.lastSeenAt);
  let pageviews = pruneAnalytics(await kv.get("analytics_pageviews") ?? [], (p: any) => p.ts);
  if (userId) {
    sessions = sessions.filter((s: any) => s.userId === userId);
    const sessionIds = new Set(sessions.map((s: any) => s.sessionId));
    pageviews = pageviews.filter((p: any) => sessionIds.has(p.sessionId));
  }

  return c.json(buildAnalyticsSummary(sessions, pageviews));
});

// Ranked list of signed-in users by activity — anonymous/signed-out
// sessions have no userId and are excluded here (they still count toward
// the network-wide totals above, just can't be attributed to a person).
app.get(`${BASE}/analytics/users`, async (c) => {
  const caller = await getCallerUser(c.req.header("Authorization"));
  if (!caller) return c.json({ error: "Must be signed in" }, 401);
  if (!["superadmin", "admin"].includes(callerRole(caller))) return c.json({ error: "Forbidden" }, 403);

  const sessions = pruneAnalytics(await kv.get("analytics_sessions") ?? [], (s: any) => s.lastSeenAt).filter((s: any) => s.userId);
  const byUser = new Map<string, { sessions: number; pageViews: number; lastSeenAt: string }>();
  for (const s of sessions) {
    const entry = byUser.get(s.userId) ?? { sessions: 0, pageViews: 0, lastSeenAt: s.lastSeenAt };
    entry.sessions += 1;
    entry.pageViews += s.pageViews ?? 0;
    if (s.lastSeenAt > entry.lastSeenAt) entry.lastSeenAt = s.lastSeenAt;
    byUser.set(s.userId, entry);
  }

  const users = await listAuthUsers();
  const rows = [...byUser.entries()].map(([userId, stats]) => {
    const u = users.find((x: any) => x.id === userId);
    return {
      userId,
      name: u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "Unknown",
      avatarUrl: u?.user_metadata?.avatar_url ?? u?.user_metadata?.avatarUrl ?? "",
      ...stats,
    };
  }).sort((a, b) => b.pageViews - a.pageViews);

  return c.json(rows);
});

Deno.serve(app.fetch);
