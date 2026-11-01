export function registerEmailPreferences(
  app: any,
  base: string,
  client: any,
  getCaller: any,
) {
  const defaults = {
    enabled: true,
    messages: true,
    mentions: true,
    wall: true,
    replies: true,
  }
  const fields = Object.keys(defaults).join(",")
  app.get(`${base}/me/email-preferences`, async (c: any) => {
    const caller = await getCaller(c.req.header("Authorization"))
    const { data, error } = await client()
      .from("network_email_preferences")
      .select(fields)
      .eq("user_id", caller.id)
      .maybeSingle()
    return error
      ? c.json({ error: "Unable to load email preferences" }, 500)
      : c.json(data ?? defaults)
  })
  app.put(`${base}/me/email-preferences`, async (c: any) => {
    const caller = await getCaller(c.req.header("Authorization")),
      body = await c.req.json()
    if (Object.keys(defaults).some((k) => typeof body[k] !== "boolean"))
      return c.json({ error: "Choose each email preference" }, 400)
    const values = Object.fromEntries(
      Object.keys(defaults).map((k) => [k, body[k]]),
    )
    const { data, error } = await client()
      .from("network_email_preferences")
      .upsert({ user_id: caller.id, ...values })
      .select(fields)
      .single()
    return error
      ? c.json({ error: "Unable to save email preferences" }, 500)
      : c.json(data)
  })
}
