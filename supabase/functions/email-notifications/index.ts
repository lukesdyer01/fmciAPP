import { createClient } from "jsr:@supabase/supabase-js@2.49.8"
import { Webhook } from "npm:svix@1.42.0"
import { notificationEmail, preferenceFor, retryState } from "./email.ts"
import { emailDestination } from "./eligibility.ts"
const db = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
const response = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
    },
  })
const read = async (query: any) => {
  const { data, error } = await query
  if (error) throw error
  return data
}
Deno.serve(async (req) => {
  const url = new URL(req.url),
    client = db()
  try {
    if (url.searchParams.has("unsubscribe")) {
      const token = url.searchParams.get("unsubscribe") ?? ""
      if (
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          token,
        )
      )
        return response("Invalid unsubscribe link.", 400)
      if (req.method === "GET")
        return new Response(null, {
          status: 303,
          headers: {
            Location: `https://fmci.network/email-unsubscribe.html#token=${token}`,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        })
      if (req.method !== "POST") return response("Method not allowed", 405)
      await read(
        client
          .from("network_email_preferences")
          .update({ enabled: false })
          .eq("unsubscribe_token", token),
      )
      if (url.searchParams.has("browser"))
        return new Response(null, {
          status: 303,
          headers: {
            Location: "https://fmci.network/email-unsubscribe.html#done=1",
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        })
      return Response.json({ ok: true, unsubscribed: true })
    }
    if (url.searchParams.has("webhook")) {
      const secret = Deno.env.get("RESEND_WEBHOOK_SECRET")
      if (req.method !== "POST" || !secret)
        return new Response("Unavailable", { status: 503 })
      if (Number(req.headers.get("content-length")) > 100000)
        return new Response("Too large", { status: 413 })
      const body = await req.text()
      if (body.length > 100000)
        return new Response("Too large", { status: 413 })
      let event: any
      try {
        event = new Webhook(secret).verify(body, {
          "svix-id": req.headers.get("svix-id") ?? "",
          "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
          "svix-signature": req.headers.get("svix-signature") ?? "",
        })
      } catch {
        return new Response("Invalid signature", { status: 401 })
      }
      if (typeof event.data?.email_id !== "string")
        return Response.json({ ok: true })
      const jobs = await read(
        client
          .from("network_email_jobs")
          .select("recipient_id")
          .eq("provider_id", event.data.email_id),
      )
      if (
        !jobs?.length &&
        String(event.data.from ?? "").includes("notifications@fmci.network") &&
        !String(event.data.subject ?? "").includes("email setup is working")
      )
        return new Response("Delivery record pending", { status: 503 })
      await read(
        client
          .from("network_email_jobs")
          .update({ delivery_state: event.type })
          .eq("provider_id", event.data.email_id),
      )
      if (
        ["email.bounced", "email.complained", "email.suppressed"].includes(
          event.type,
        )
      ) {
        for (const job of jobs ?? []) {
          const { data, error } = await client.auth.admin.getUserById(
            job.recipient_id,
          )
          if (error) throw error
          if (
            event.data.to?.some(
              (address: string) =>
                address.toLowerCase() === data.user?.email?.toLowerCase(),
            )
          )
            await read(
              client
                .from("network_email_preferences")
                .upsert({ user_id: job.recipient_id, enabled: false }),
            )
        }
      }
      return Response.json({ ok: true })
    }
    const secret = Deno.env.get("EMAIL_WORKER_SECRET")
    if (
      req.method !== "POST" ||
      !secret ||
      req.headers.get("x-email-worker-secret") !== secret
    )
      return new Response("Unauthorized", { status: 401 })
    const apiKey = Deno.env.get("RESEND_API_KEY"),
      from = Deno.env.get("RESEND_FROM_EMAIL")
    if (!apiKey || !from)
      return Response.json({ error: "Email sender is not configured" }, {
        status: 503,
      })
    const body = await req.json().catch(() => ({}))
    const send = async (
      to: string,
      id: string,
      kind: string,
      destination: string,
      unsubscribe: string,
    ) => {
      const mail = notificationEmail(kind, destination, unsubscribe)
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `fmci-notification/${id}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          ...mail,
          headers: {
            "List-Unsubscribe": `<${unsubscribe}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      })
      if (!res.ok) throw new Error(`Resend status ${res.status}`)
      return (await res.json()).id as string
    }
    // No arbitrary-address email API: setup test is limited to the configured operator.
    if (body.test === true) {
      const to = Deno.env.get("EMAIL_TEST_RECIPIENT")
      if (!to)
        return Response.json({ error: "Test recipient is not configured" }, {
          status: 503,
        })
      const id = await send(
        to,
        "setup-test-v1",
        "test",
        "https://fmci.network/settings",
        "https://fmci.network/settings",
      )
      return Response.json({ ok: true, providerId: id })
    }
    const enabled = await read(
      client
        .from("kv_store_5bb4c08d")
        .select("value")
        .eq("key", "notification_email_enabled")
        .maybeSingle(),
    )
    if (enabled?.value !== true)
      return Response.json({ ok: true, disabled: true })
    const jobs = await read(client.rpc("claim_network_email_jobs"))
    let sent = 0,
      skipped = 0,
      failed = 0
    for (const job of jobs ?? []) {
      const finish = async (state: string, extra = {}) =>
        read(
          client
            .from("network_email_jobs")
            .update({ state, lease_until: null, ...extra })
            .eq("id", job.id)
            .eq("attempts", job.attempts),
        )
      try {
        const age = Date.now() - Date.parse(job.created_at)
        if (age >= 23 * 3600000) {
          await finish("failed")
          failed++
          continue
        }
        const { data: auth, error } = await client.auth.admin.getUserById(
          job.recipient_id,
        )
        if (error) throw error
        const user: any = auth.user,
          meta = user?.user_metadata ?? {}
        if (
          !user?.email ||
          !user.email_confirmed_at ||
          meta.status === "suspended" ||
          meta.age18_confirmed !== true ||
          meta.onboarding_complete === false ||
          (user.banned_until && Date.parse(user.banned_until) > Date.now())
        ) {
          await finish("skipped")
          skipped++
          continue
        }
        await read(
          client
            .from("network_email_preferences")
            .upsert({ user_id: job.recipient_id }, {
              onConflict: "user_id",
              ignoreDuplicates: true,
            }),
        )
        const prefs = await read(
          client
            .from("network_email_preferences")
            .select("*")
            .eq("user_id", job.recipient_id)
            .single(),
        )
        const destination =
          prefs.enabled && prefs[preferenceFor(job.kind)]
            ? await emailDestination(client, job)
            : null
        if (!destination) {
          await finish("skipped")
          skipped++
          continue
        }
        if (["direct", "group"].includes(job.kind)) {
          const newer = await read(
            client
              .from("network_email_jobs")
              .select("id")
              .eq("recipient_id", job.recipient_id)
              .eq("conversation_id", job.conversation_id)
              .eq("kind", job.kind)
              .gt("created_at", job.created_at)
              .limit(1),
          )
          if (newer?.length) {
            await finish("skipped")
            skipped++
            continue
          }
        }
        // Limit inbox noise to one notification email per member per 15 minutes.
        const recent = await read(
          client
            .from("network_email_jobs")
            .select("id")
            .eq("recipient_id", job.recipient_id)
            .eq("state", "sent")
            .gte("due_at", new Date(Date.now() - 900000).toISOString())
            .limit(1),
        )
        if (recent?.length) {
          await finish("pending", {
            attempts: job.attempts - 1,
            due_at: new Date(Date.now() + 900000).toISOString(),
          })
          continue
        }
        const unsub = `${Deno.env.get("SUPABASE_URL")}/functions/v1/email-notifications?unsubscribe=${prefs.unsubscribe_token}`
        const providerId = await send(
          user.email,
          job.id,
          job.kind,
          destination,
          unsub,
        )
        await finish("sent", {
          provider_id: providerId,
          due_at: new Date().toISOString(),
          delivery_state: "accepted",
        })
        sent++
      } catch {
        await finish(
          retryState(job.attempts, Date.now() - Date.parse(job.created_at)),
          {
            due_at: new Date(
              Date.now() + Math.min(60, 2 ** job.attempts) * 60000,
            ).toISOString(),
          },
        )
        failed++
      }
    }
    return Response.json({ ok: true, sent, skipped, failed })
  } catch {
    return Response.json(
      { error: "Email service could not complete this request" },
      { status: 500 },
    )
  }
})
