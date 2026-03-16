'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Key, Mail, Lock, User } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/crm')
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setMode('login'); setError('Account created! Please sign in.')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          background: var(--bg);
        }
        .login-brand {
          width: 42%;
          background: var(--navy);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .login-form-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }
        .login-form-inner {
          width: 100%;
          max-width: 400px;
        }
        @media (max-width: 768px) {
          .login-wrap {
            flex-direction: column;
          }
          .login-brand {
            width: 100%;
            padding: 24px 20px;
            min-height: unset;
            justify-content: flex-start;
            gap: 0;
          }
          .login-brand-features {
            display: none;
          }
          .login-brand-headline {
            font-size: 1.6rem !important;
            margin-bottom: 0 !important;
          }
          .login-brand-sub {
            display: none;
          }
          .login-form-wrap {
            padding: 28px 20px 40px;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="login-wrap">
        {/* Left panel — branding */}
        <div className="login-brand">
          {/* Grid bg */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(184,149,63,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(184,149,63,0.06) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            pointerEvents: 'none',
          }}/>
          <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,111,181,0.15) 0%, transparent 70%)', pointerEvents: 'none' }}/>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(184,149,63,0.15)', border: '1px solid rgba(184,149,63,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Key size={15} color="var(--gold)" />
              </div>
              <span style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: '#f8f5f0' }}>
                Azure <span style={{ color: 'var(--gold)' }}>Keys</span>
              </span>
            </div>

            <h2 className="login-brand-headline" style={{ fontFamily: 'var(--serif)', fontSize: '2.3rem', fontWeight: 300, color: '#f8f5f0', lineHeight: 1.2, marginBottom: 14 }}>
              Luxury Caribbean<br/><em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Real Estate CRM</em>
            </h2>
            <p className="login-brand-sub" style={{ fontSize: 13, color: 'rgba(248,245,240,0.5)', lineHeight: 1.7, maxWidth: 300 }}>
              Manage your entire real estate operation — contacts, pipeline, listings, viewings, and deals.
            </p>
          </div>

          <div className="login-brand-features" style={{ position: 'relative' }}>
            {[
              'Lead & Contact Management',
              'Sales Pipeline & Deals',
              'Property Listings & Viewings',
              'Caribbean Intelligence Suite',
              'Reports & Analytics',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }}/>
                <span style={{ fontSize: 13, color: 'rgba(248,245,240,0.6)' }}>{f}</span>
              </div>
            ))}
            <p style={{ fontSize: 11, color: 'rgba(248,245,240,0.2)', marginTop: 24 }}>Azure Keys · Barbados</p>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-form-wrap">
          <div className="login-form-inner">
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.75rem', fontWeight: 400, color: 'var(--text)', marginBottom: 6 }}>
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28 }}>
              {mode === 'login' ? 'Sign in to your CRM account' : 'Get started with Azure Keys CRM'}
            </p>

            <form onSubmit={handleAuth}>
              {mode === 'signup' && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}/>
                    <input type="text" value={name} onChange={e=>setName(e.target.value)} className="crm-input" style={{ paddingLeft: 36 }} placeholder="Your name" required />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}/>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="crm-input" style={{ paddingLeft: 36 }} placeholder="your@email.com" required />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }}/>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="crm-input" style={{ paddingLeft: 36 }} placeholder="••••••••" required minLength={6}/>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                  background: error.includes('created') ? 'var(--green-pale)' : 'var(--red-pale)',
                  color: error.includes('created') ? 'var(--green)' : 'var(--red)',
                  border: `1px solid ${error.includes('created') ? 'var(--green-border)' : 'var(--red-border)'}`,
                }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }} disabled={loading}>
                {loading ? <><span className="spinner" style={{width:16,height:16}}/> Processing...</> : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </span>
              <button onClick={() => { setMode(mode==='login'?'signup':'login'); setError('') }}
                style={{ fontSize: 13, color: 'var(--azure)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
