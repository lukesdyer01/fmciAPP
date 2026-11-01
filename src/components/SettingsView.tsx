import EmailPreferences from "./EmailPreferences"
import NotificationPreferences from "./NotificationPreferences"

export default function SettingsView() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: 24,
          margin: "0 0 20px",
          color: "var(--color-text-1)",
        }}
      >
        Settings
      </h1>
      <NotificationPreferences />
      <EmailPreferences />
    </div>
  )
}
