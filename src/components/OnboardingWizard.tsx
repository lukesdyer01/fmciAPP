import { useState, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import fmciLogo from '../imports/fmci-copy1280x400_orig.png'

const MINISTRY_ROLES = ['Pastor', 'Teacher', 'Evangelist', 'Apostle', 'Prophet']
const ADDITIONAL_ROLES = ['Missionary', 'Intercessor']
// Same stored values EditProfileModal.tsx uses for this field — the labels
// below are just phrased to match how the user described this step.
const COMMUNICATION_PREFS = [
  { value: 'Email', label: 'Email' },
  { value: 'Text Message', label: 'Text Message (SMS)' },
  { value: 'Phone Call', label: 'Phone Call' },
]
const CURRENT_YEAR = new Date().getFullYear()
const MEMBER_SINCE_YEARS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => String(CURRENT_YEAR - i))
const TOTAL_STEPS = 3

export default function OnboardingWizard({ session }: { session: Session }) {
  const [step, setStep] = useState(1)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [title, setTitle] = useState('')
  const [church, setChurch] = useState('')
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [communicationPrefs, setCommunicationPrefs] = useState<string[]>([])
  const [ministryRoles, setMinistryRoles] = useState<string[]>([])
  const [additionalRoles, setAdditionalRoles] = useState<string[]>([])
  const [memberSince, setMemberSince] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleIn(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function handleImageFile(file: File) {
    setUploading(true); setError('')
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true, contentType: file.type || 'image/jpeg',
      })
      if (uploadErr) throw uploadErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (e: any) {
      setError(e.message ?? 'Failed to upload image.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      // Spread the existing metadata first — full_name (set at signup) and
      // anything else already there must survive this write regardless of
      // whether updateUser merges or replaces user_metadata.
      const { error } = await supabase.auth.updateUser({
        data: {
          ...session.user.user_metadata,
          avatar_url: avatarUrl || session.user.user_metadata?.avatar_url,
          title, church, location, phone, communicationPrefs,
          ministryRoles, additionalRoles, memberSince,
          onboarding_complete: true,
        },
      })
      if (error) throw error
      // AuthGate's onAuthStateChange listener picks up the refreshed session
      // (a USER_UPDATED event) and stops rendering this wizard on its own —
      // no manual dismissal needed here.
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.')
      setSaving(false)
    }
  }

  function next() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else save()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff', fontSize: '15px',
    fontFamily: 'var(--font-sans)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px',
  }
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    fontSize: '13px', fontWeight: 700,
    border: `1.5px solid ${active ? 'var(--color-gold)' : 'rgba(255,255,255,0.15)'}`,
    backgroundColor: active ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0d1a33 0%, #1a2a4a 50%, #0d1117 100%)',
      padding: '20px', fontFamily: 'var(--font-sans)',
    }}>
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,1) 60px,rgba(255,255,255,1) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,1) 60px,rgba(255,255,255,1) 61px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' }}>
            <img src={fmciLogo} alt="FMCI" style={{ height: '40px', width: 'auto' }} />
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px', textAlign: 'left' }}>Welcome to FMCI</div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Step {step} of {TOTAL_STEPS}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '10px' }}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} style={{ width: '32px', height: '4px', borderRadius: '2px', backgroundColor: i < step ? 'var(--color-gold)' : 'rgba(255,255,255,0.15)' }} />
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px', padding: '32px', backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>Tell us about your ministry</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div onClick={() => fileRef.current?.click()} style={{
                  width: '64px', height: '64px', borderRadius: '14px', flexShrink: 0, cursor: 'pointer',
                  overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                }}>
                  {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {uploading ? 'Uploading…' : 'Add a profile photo (optional)'}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Title / Role</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Pastor" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Church / Organization</label>
                <input value={church} onChange={e => setChurch(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Preferred Contact Method <span style={{ fontWeight: 400, textTransform: 'none' }}>(select all that apply)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {COMMUNICATION_PREFS.map(pref => (
                    <label key={pref.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                      <input
                        type="checkbox"
                        checked={communicationPrefs.includes(pref.value)}
                        onChange={() => toggleIn(communicationPrefs, setCommunicationPrefs, pref.value)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                      />
                      {pref.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>What's your ministry role?</h2>
              <div>
                <label style={labelStyle}>5-fold Role <span style={{ fontWeight: 400, textTransform: 'none' }}>(select all that apply)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {MINISTRY_ROLES.map(role => (
                    <button key={role} type="button" onClick={() => toggleIn(ministryRoles, setMinistryRoles, role)} style={pillStyle(ministryRoles.includes(role))}>
                      {ministryRoles.includes(role) ? '✓ ' : ''}{role}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Additional Role <span style={{ fontWeight: 400, textTransform: 'none' }}>(select all that apply)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ADDITIONAL_ROLES.map(role => (
                    <button key={role} type="button" onClick={() => toggleIn(additionalRoles, setAdditionalRoles, role)} style={pillStyle(additionalRoles.includes(role))}>
                      {additionalRoles.includes(role) ? '✓ ' : ''}{role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>When did you join FMCI?</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>This can be well before you signed up for the app.</p>
              <div>
                <label style={labelStyle}>Member Since</label>
                <select value={memberSince} onChange={e => setMemberSince(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Not set</option>
                  {MEMBER_SINCE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '13px', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : save()}
              disabled={saving}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-sans)',
              }}
            >{step > 1 ? '← Back' : 'Skip for now'}</button>
            <button
              onClick={next}
              disabled={saving || uploading}
              style={{
                flex: 2, padding: '12px', borderRadius: '10px', border: 'none', cursor: saving ? 'default' : 'pointer',
                background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
                color: '#fff', fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 16px rgba(200,155,60,0.3)',
              }}
            >{saving ? 'Saving…' : step < TOTAL_STEPS ? 'Next →' : 'Finish'}</button>
          </div>
          {step > 1 && (
            <button
              onClick={save}
              disabled={saving}
              style={{
                width: '100%', marginTop: '10px', padding: '8px', background: 'none', border: 'none',
                cursor: saving ? 'default' : 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '12px',
                fontFamily: 'var(--font-sans)', fontWeight: 600,
              }}
            >Skip remaining steps</button>
          )}
        </div>
      </div>
    </div>
  )
}
