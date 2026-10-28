// All routes run behind the application's signed-in/eligible-member middleware.
export function registerMemberTools(
  app: any,
  base: string,
  client: any,
  getCaller: any,
) {
  const user = (c: any) => getCaller(c.req.header("Authorization"))
  const defaults = { messages: true, ministry_events: true, moderation: true }
  app.get(`${base}/me/notification-preferences`, async (c: any) => {
    const caller = await user(c)
    const { data, error } = await client()
      .from("network_member_preferences")
      .select("messages,ministry_events,moderation")
      .eq("user_id", caller.id)
      .maybeSingle()
    return error
      ? c.json({ error: "Unable to load preferences" }, 500)
      : c.json(data ?? defaults)
  })
  app.put(`${base}/me/notification-preferences`, async (c: any) => {
    const caller = await user(c)
    const body = await c.req.json()
    if (Object.keys(defaults).some((k) => typeof body[k] !== "boolean"))
      return c.json({ error: "Choose each notification preference" }, 400)
    const { data, error } = await client()
      .from("network_member_preferences")
      .upsert({
        user_id: caller.id,
        messages: body.messages,
        ministry_events: body.ministry_events,
        moderation: body.moderation,
      })
      .select("messages,ministry_events,moderation")
      .single()
    return error
      ? c.json({ error: "Unable to save preferences" }, 500)
      : c.json(data)
  })
  app.get(`${base}/me/saved`, async (c: any) => {
    const caller = await user(c)
    const { data, error } = await client()
      .from("network_saved_items")
      .select("kind,item_id,created_at")
      .eq("user_id", caller.id)
      .order("created_at", { ascending: false })
    return error
      ? c.json({ error: "Unable to load saved items" }, 500)
      : c.json(data)
  })
  for (const method of ["put", "delete"])
    app[method](`${base}/me/saved/:kind/:id`, async (c: any) => {
      const caller = await user(c)
      const kind = c.req.param("kind"),
        id = c.req.param("id")
      if (!["post", "resource"].includes(kind) || !id || id.length > 200)
        return c.json({ error: "Invalid saved item" }, 400)
      const table = client().from("network_saved_items")
      const { error } =
        method === "put"
          ? await table.upsert({ user_id: caller.id, kind, item_id: id }, {
              onConflict: "user_id,kind,item_id",
              ignoreDuplicates: true,
            })
          : await table
              .delete()
              .eq("user_id", caller.id)
              .eq("kind", kind)
              .eq("item_id", id)
      return error
        ? c.json({ error: "Unable to update saved item" }, 500)
        : c.json({ ok: true })
    })
  app.post(`${base}/feedback`, async (c: any) => {
    const caller = await user(c),
      body = await c.req.json()
    if (
      !["bug", "suggestion"].includes(body.kind) ||
      typeof body.message !== "string" ||
      body.message.trim().length < 10 ||
      body.message.length > 4000
    )
      return c.json({ error: "Enter 10–4000 characters" }, 400)
    const { count, error: countError } = await client()
      .from("network_beta_feedback")
      .select("id", { count: "exact", head: true })
      .eq("user_id", caller.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString())
    if (countError) return c.json({ error: "Unable to send feedback" }, 500)
    if ((count ?? 0) >= 10)
      return c.json({ error: "Please wait before sending more feedback" }, 429)
    const { error } = await client()
      .from("network_beta_feedback")
      .insert({
        user_id: caller.id,
        kind: body.kind,
        message: body.message.trim(),
        device: String(body.device ?? "").slice(0, 300),
        app_version: String(body.appVersion ?? "").slice(0, 80),
        page: String(body.page ?? "")
          .split(/[?#]/)[0]
          .slice(0, 200),
      })
    return error
      ? c.json({ error: "Unable to send feedback" }, 500)
      : c.json({ ok: true }, 201)
  })
  const admin = async (c: any) => {
    const caller = await user(c)
    return ["admin", "superadmin"].includes(caller?.app_metadata?.role)
  }
  app.get(`${base}/admin/feedback`, async (c: any) => {
    if (!(await admin(c))) return c.json({ error: "Forbidden" }, 403)
    const { data, error } = await client()
      .from("network_beta_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
    return error
      ? c.json({ error: "Unable to load feedback" }, 500)
      : c.json(data)
  })
  app.put(`${base}/admin/feedback/:id`, async (c: any) => {
    if (!(await admin(c))) return c.json({ error: "Forbidden" }, 403)
    const { status } = await c.req.json()
    if (!["new", "reviewed", "resolved"].includes(status))
      return c.json({ error: "Invalid status" }, 400)
    const { error } = await client()
      .from("network_beta_feedback")
      .update({ status })
      .eq("id", c.req.param("id"))
    return error
      ? c.json({ error: "Unable to update feedback" }, 500)
      : c.json({ ok: true })
  })
  app.get(`${base}/admin/invitations/open`, async (c: any) => {
    if ((await user(c))?.app_metadata?.role !== "superadmin")
      return c.json({ error: "Forbidden" }, 403)
    const { data, error } = await client()
      .from("network_registration_links")
      .select("token_hash,label,expires_at,signup_count,revoked_at")
      .order("expires_at", { ascending: false })
      .limit(100)
    return error
      ? c.json({ error: "Unable to load invitations" }, 500)
      : c.json(data)
  })
  app.delete(`${base}/admin/invitations/open/:hash`, async (c: any) => {
    if ((await user(c))?.app_metadata?.role !== "superadmin")
      return c.json({ error: "Forbidden" }, 403)
    const { error } = await client()
      .from("network_registration_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", c.req.param("hash"))
    return error
      ? c.json({ error: "Unable to revoke invitation" }, 500)
      : c.json({ ok: true })
  })
}
