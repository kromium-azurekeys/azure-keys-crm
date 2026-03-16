'use client'

import { useState, useEffect } from 'react'
import { CRMSection } from '@/app/crm/page'
import {
  LayoutDashboard, Users, GitBranch, Building2, Calendar,
  FileText, CheckSquare, Mail, BarChart3, LogOut, Key,
  Globe, Calculator, Zap, Sparkles, Network, Sun, Home, X, Menu,
  FolderOpen, DollarSign, Moon
} from 'lucide-react'

interface SidebarProps {
  activeSection: CRMSection
  onNavigate: (section: CRMSection) => void
  profile: any
  onSignOut: () => void
  isOpen?: boolean
  onClose?: () => void
}

const navGroups = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard' as CRMSection, label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Sales',
    items: [
      { id: 'contacts' as CRMSection, label: 'Contacts', icon: Users },
      { id: 'pipeline' as CRMSection, label: 'Pipeline', icon: GitBranch },
      { id: 'offers' as CRMSection, label: 'Offers', icon: FileText },
    ]
  },
  {
    label: 'Properties',
    items: [
      { id: 'properties' as CRMSection, label: 'Listings', icon: Building2 },
      { id: 'viewings' as CRMSection, label: 'Viewings', icon: Calendar },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'tasks' as CRMSection, label: 'Tasks', icon: CheckSquare },
      { id: 'campaigns' as CRMSection, label: 'Campaigns', icon: Mail },
      { id: 'documents' as CRMSection, label: 'Documents', icon: FolderOpen },
      { id: 'reports' as CRMSection, label: 'Reports', icon: BarChart3 },
    ]
  },
  {
    label: 'Caribbean Intel',
    items: [
      { id: 'cbi' as CRMSection, label: 'CBI / SERP', icon: Globe },
      { id: 'foreignbuyer' as CRMSection, label: 'Foreign Buyer FX', icon: DollarSign },
      { id: 'yield' as CRMSection, label: 'Yield Calculator', icon: Calculator },
      { id: 'matching' as CRMSection, label: 'Smart Matching', icon: Zap },
      { id: 'concierge' as CRMSection, label: 'Concierge', icon: Sparkles },
      { id: 'developer' as CRMSection, label: 'Dev Pipeline', icon: Home },
      { id: 'referrals' as CRMSection, label: 'Referral Network', icon: Network },
      { id: 'seasonal' as CRMSection, label: 'Seasonal Intel', icon: Sun },
    ]
  },
]

export default function Sidebar({ activeSection, onNavigate, profile, onSignOut, isOpen, onClose }: SidebarProps) {
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  // Dark mode state — read from localStorage / html attribute
  const [isDark, setIsDark] = useState(false)

  // Sync on mount
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme')
    setIsDark(theme === 'dark')
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('ak-theme', next ? 'dark' : 'light') } catch(e) {}
  }

  const handleNav = (section: CRMSection) => {
    onNavigate(section)
    onClose?.()
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 39,
          display: 'none',
        }}
        className={isOpen ? 'sidebar-overlay-visible' : ''}
      />

      <aside
        className={`crm-sidebar${isOpen ? ' sidebar-open' : ''}`}
        style={{
          width: 220,
          height: '100vh',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 40,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Key size={13} color="var(--gold)" />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1 }}>
                Azure <span style={{ color: 'var(--gold)' }}>Keys</span>
              </p>
              <p style={{ fontSize: '9px', color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CRM</p>
            </div>
          </div>
          {/* Close button — only visible on mobile */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'none', padding: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="section-label" style={{ padding: '0 16px' }}>{group.label}</p>
              {group.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleNav(id)}
                  className={`nav-item${activeSection === id ? ' active' : ''}`}
                  style={{ width: 'calc(100% - 12px)', margin: '1px 6px', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Icon size={14} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User + theme */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 8, marginBottom: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s',
            }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            {isDark ? <Sun size={14} color="var(--gold)" /> : <Moon size={14} />}
            <span style={{ fontSize: 12, fontFamily: 'var(--sans)' }}>
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--sans)' }}>{profile?.full_name || 'User'}</p>
              <p style={{ fontSize: '10px', color: 'var(--gold)', textTransform: 'capitalize', fontFamily: 'var(--sans)' }}>{profile?.role || 'agent'}</p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 3, borderRadius: 4, display: 'flex' }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--text-4)')}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
