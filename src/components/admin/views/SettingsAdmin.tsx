import { useState } from 'react'

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#161b22', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', padding: '22px', marginBottom: '16px' }}>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{description}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', padding: '2px',
          backgroundColor: value ? 'var(--color-gold)' : 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s', flexShrink: 0, position: 'relative',
        }}
      >
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
          transform: value ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '10px 14px', backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e6edf3', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )
}

export default function SettingsAdmin() {
  const [platformName, setPlatformName] = useState('FMCI Network')
  const [platformTagline, setPlatformTagline] = useState('Advancing the Kingdom Together')
  const [supportEmail, setSupportEmail] = useState('support@fmci.global')

  const [openReg, setOpenReg] = useState(false)
  const [requireVerif, setRequireVerif] = useState(true)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [autoVerifRefer, setAutoVerifRefer] = useState(false)
  const [globalMessaging, setGlobalMessaging] = useState(true)
  const [publicDirectory, setPublicDirectory] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [twoFactor, setTwoFactor] = useState(false)

  const [saved, setSaved] = useState(false)
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div style={{ maxWidth: '760px' }}>
      <Section title="Platform Identity" description="Core branding and contact information for the FMCI Network platform.">
        <TextInput label="Platform Name" value={platformName} onChange={setPlatformName} />
        <TextInput label="Tagline" value={platformTagline} onChange={setPlatformTagline} />
        <TextInput label="Support Email" value={supportEmail} onChange={setSupportEmail} placeholder="support@yournetwork.org" />
      </Section>

      <Section title="Registration & Access" description="Control how new members join the platform and what verification is required.">
        <Toggle label="Open Registration" description="Allow anyone to create an account without an invitation" value={openReg} onChange={setOpenReg} />
        <Toggle label="Require Verification for Posting" description="Unverified members can browse but cannot post or comment" value={requireVerif} onChange={setRequireVerif} />
        <Toggle label="Auto-Verify Referred Members" description="Members referred by a verified leader are auto-verified at signup" value={autoVerifRefer} onChange={setAutoVerifRefer} />
      </Section>

      <Section title="Platform Features" description="Toggle global features on or off for the entire platform (overrides per-org settings).">
        <Toggle label="Global Messaging" description="Allow direct messages between any members across organizations" value={globalMessaging} onChange={setGlobalMessaging} />
        <Toggle label="Public Member Directory" description="Non-members can search and view member profiles" value={publicDirectory} onChange={setPublicDirectory} />
        <Toggle label="Email Notifications" description="Send platform email notifications to all members" value={emailNotifs} onChange={setEmailNotifs} />
      </Section>

      <Section title="Security" description="Authentication and access security settings.">
        <Toggle label="Require Two-Factor Authentication" description="All admin-level accounts must use 2FA (enforced on next login)" value={twoFactor} onChange={setTwoFactor} />
        <Toggle
          label="Maintenance Mode"
          description="Take the platform offline for all non-admin members. Use during migrations."
          value={maintenanceMode}
          onChange={setMaintenanceMode}
        />
        {maintenanceMode && (
          <div style={{ marginTop: '10px', padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '13px', color: '#f87171', fontWeight: 600 }}>
            ⚠ Maintenance mode is ON — the platform is inaccessible to members.
          </div>
        )}
      </Section>

      <Section title="Admin Users" description="Platform super admins and moderators who can access this control panel.">
        <div style={{ padding: '16px 0', fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
          Admin users are managed through the Members panel. Assign or revoke admin roles there.
        </div>
        <button style={{ marginTop: '6px', padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(200,155,60,0.3)', backgroundColor: 'rgba(200,155,60,0.08)', color: 'var(--color-gold)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>+ Invite Admin</button>
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button style={{ padding: '10px 22px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Discard Changes</button>
        <button onClick={handleSave} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', backgroundColor: saved ? '#22c55e' : 'var(--color-gold)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.2s' }}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
