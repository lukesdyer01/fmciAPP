import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import { App } from "@capacitor/app"
import { api } from "../api-client/server"
export default function BetaFeedback() {
  const [kind, setKind] = useState("bug"),
    [message, setMessage] = useState("")
  const send = useMutation({
    retry: 0,
    mutationFn: async () => {
      let appVersion = import.meta.env.VITE_APP_VERSION ?? "web"
      if (Capacitor.isNativePlatform()) {
        const info = await App.getInfo()
        appVersion = `${info.version} (${info.build})`
      }
      return api("/feedback", {
        method: "POST",
        body: JSON.stringify({
          kind,
          message,
          appVersion,
          device: `${Capacitor.getPlatform()} ${navigator.userAgent}`,
          page: window.location.pathname,
        }),
      })
    },
    onSuccess: () => setMessage(""),
  })
  return (
    <section className="member-tool-section">
      <h2>Send beta feedback</h2>
      <p>
        Report a problem or suggest an improvement. App version and device
        details are included automatically.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send.mutate()
        }}
      >
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="bug">Report a problem</option>
            <option value="suggestion">Suggest an improvement</option>
          </select>
        </label>
        <label>
          What happened, or what would help?
          <textarea
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did you try? What happened? Please leave out passwords and private conversations."
          />
        </label>
        <button disabled={send.isPending}>
          {send.isPending ? "Sending…" : "Send feedback"}
        </button>
      </form>
      {send.isSuccess && (
        <p role="status">Thanks! Your feedback has been sent.</p>
      )}
      {send.isError && (
        <p role="alert">
          Unable to send. Try again or email luke@dyerplex.com.
        </p>
      )}
    </section>
  )
}
