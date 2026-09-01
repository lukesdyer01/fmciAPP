import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { SupabaseRoleProvider } from '../contexts/SupabaseRoleContext'
import { api } from '../api-client/server'
import fmciLogo from '../imports/fmci-copy1280x400_orig.png'

type AuthMode = 'login' | 'signup' | 'forgot'

function AuthForm({ onSession }: { onSession: (s: Session) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.session) onSession(data.session)
      } else if (mode === 'signup') {
        const settings = await api<{ openRegistration: boolean }>('/settings').catch(() => ({ openRegistration: true }))
        if (!settings.openRegistration) {
          setError('Registration is currently closed. Contact an administrator for an invitation.')
          setLoading(false)
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        if (data.session) {
          onSession(data.session)
        } else {
          setInfo('Check your email to confirm your account, then sign in.')
          setMode('login')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setInfo('Password reset email sent. Check your inbox.')
        setMode('login')
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    color: '#fff', fontSize: '15px',
    fontFamily: 'var(--font-sans)', outline: 'none',
    transition: 'border-color 0.15s',
  }

  const titles: Record<AuthMode, string> = {
    login: 'Welcome back',
    signup: 'Join the Network',
    forgot: 'Reset Password',
  }

  const subtitles: Record<AuthMode, string> = {
    login: 'Sign in to access the FMCI Network',
    signup: 'Create your FMCI Network account',
    forgot: "We'll send a reset link to your email",
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0d1a33 0%, #1a2a4a 50%, #0d1117 100%)',
      padding: '20px', fontFamily: 'var(--font-sans)',
    }}>
      {/* Background cross pattern */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,1) 60px,rgba(255,255,255,1) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,1) 60px,rgba(255,255,255,1) 61px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '10px' }}>
            <img src={fmciLogo} alt="FMCI" style={{ height: '48px', width: 'auto' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', letterSpacing: '0.5px' }}>FMCI</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.4 }}>
                THE FEDERATION OF<br />MINISTERS &amp; CHURCHES INTERNATIONAL
              </div>
            </div>
          </div>
          <div style={{ width: '48px', height: '2px', backgroundColor: 'var(--color-gold)', margin: '14px auto 0', borderRadius: '2px' }} />
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px', padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#fff' }}>{titles[mode]}</h1>
          <p style={{ margin: '0 0 28px', fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>{subtitles[mode]}</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" required
                  style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-gold)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourchurch.org" required
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-gold)' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-gold)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-gold)' }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '13px', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            {info && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', fontSize: '13px', color: '#86efac' }}>
                {info}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
              background: loading ? 'rgba(200,155,60,0.5)' : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
              color: '#fff', fontSize: '15px', fontWeight: 800,
              cursor: loading ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
              marginTop: '4px', transition: 'opacity 0.15s',
              boxShadow: '0 4px 16px rgba(200,155,60,0.3)',
            }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {/* Toggle mode */}
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setInfo('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold)', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-sans)' }}>
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setInfo('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold)', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-sans)' }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          © 2026 Federation of Ministers &amp; Churches International
        </p>
      </div>
    </div>
  )
}

interface AuthGateProps {
  children: React.ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately, which replaces the need for getSession()
    // Using only one path avoids a race where getSession() resolves after onSession() and clears the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthGate] auth event:', event, 'session:', session ? `valid (${session.user?.email})` : 'null')
      setSession(prev => {
        // Only clear a valid session on an explicit SIGNED_OUT — never on a spurious null
        if (prev && !session && event !== 'SIGNED_OUT') {
          console.log('[AuthGate] ignoring spurious null for event:', event)
          return prev
        }
        return session
      })
    })
    return () => subscription.unsubscribe()
  }, [])

  // Still loading
  if (session === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #0d1a33 0%, #1a2a4a 50%, #0d1117 100%)',
      }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(200,155,60,0.3)', borderTopColor: 'var(--color-gold)', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <AuthForm onSession={setSession} />
  }

  return (
    <SupabaseRoleProvider initialSession={session}>
      {children}
    </SupabaseRoleProvider>
  )
}
