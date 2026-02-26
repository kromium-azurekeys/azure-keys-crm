'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    setLoading(true)
    setError('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/crm')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setMode('login')
        setError('Account created! Please sign in.')
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)'
    }}>
      {/* Background grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="serif text-4xl font-light mb-2" style={{ color: 'var(--white)' }}>
            Azure <span style={{ color: 'var(--gold)' }}>Keys</span>
          </h1>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>
            CRM Platform
          </p>
          <div className="mt-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--gold), transparent)' }} />
        </div>

        {/* Form card */}
        <div className="crm-card p-8">
          <h2 className="text-sm tracking-widest uppercase mb-8" style={{ color: 'var(--gold)' }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="crm-input"
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="crm-input"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="crm-input"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs py-2 px-3" style={{
                color: error.includes('created') ? 'var(--gold)' : '#ff6b6b',
                background: error.includes('created') ? 'rgba(201,168,76,0.1)' : 'rgba(255,107,107,0.1)',
                border: `1px solid ${error.includes('created') ? 'rgba(201,168,76,0.2)' : 'rgba(255,107,107,0.2)'}`
              }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn-gold w-full justify-center mt-6" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing...</> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-xs tracking-wider"
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span style={{ color: 'var(--gold)' }}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>
        </div>

        <p className="text-center mt-8 text-xs" style={{ color: 'rgba(248,245,240,0.2)' }}>
          Azure Keys · Luxury Caribbean Real Estate · Barbados
        </p>
      </div>
    </div>
  )
}
