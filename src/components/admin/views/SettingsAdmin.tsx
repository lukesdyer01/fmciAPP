import { useState, useEffect } from 'react'
import { api } from '../../../api-client/server'

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

export default function SettingsAdmin() {
  const [openReg, setOpenReg] = useState(false)
  const [openRegSaving, setOpenRegSaving] = useState(false)

  useEffect(() => {
    api<{ openRegistration: boolean }>('/settings')
      .then(s => setOpenReg(s.openRegistration))
      .catch(() => {})
  }, [])

  async function handleOpenRegChange(next: boolean) {
    const prev = openReg
    setOpenReg(next) // optimistic
    setOpenRegSaving(true)
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify({ openRegistration: next }) })
    } catch {
      setOpenReg(prev) // revert on failure
    } finally {
      setOpenRegSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '760px' }}>
      <Section title="Registration & Access" description="Control how new members join the platform.">
        <Toggle
          label={`Open Registration${openRegSaving ? ' (saving…)' : ''}`}
          description="Allow anyone to create an account without an invitation — takes effect immediately"
          value={openReg}
          onChange={handleOpenRegChange}
        />
      </Section>

      <Section title="Admin Users" description="Platform super admins and moderators who can access this control panel.">
        <div style={{ padding: '16px 0', fontSize: '13px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
          Admin users are managed through the Members panel. Assign or revoke admin roles there.
        </div>
      </Section>
    </div>
  )
}
