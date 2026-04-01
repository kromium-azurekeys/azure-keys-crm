'use client'

import { useState, useEffect } from 'react'
import { CRMSection } from '@/app/crm/page'
import {
  LayoutDashboard, Users, GitBranch, Building2, Calendar,
  FileText, CheckSquare, Mail, BarChart3, LogOut, Key,
  Globe, Calculator, Zap, Sparkles, Network, Sun, Home, X, Globe2,
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
    label: 'Website',
    items: [
      { id: 'website_enquiries' as CRMSection, label: 'Website Enquiries', icon: Globe2 },
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

  const [isDark, setIsDark] = useState(false)

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

  const SIDEBAR_BG   = '#0a0d12'
  const BORDER_COLOR = 'rgba(201,169,110,0.15)'
  const GOLD         = '#c9a96e'
  const TEXT_DIM     = 'rgba(232,224,208,0.5)'
  const TEXT_MID     = 'rgba(232,224,208,0.75)'
  const TEXT_BRIGHT  = '#e8e0d0'
  const ACTIVE_BG    = 'rgba(201,169,110,0.1)'

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
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
          background: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER_COLOR}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0,
          zIndex: 40,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px',
          borderBottom: `1px solid ${BORDER_COLOR}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 6,
              background: 'rgba(201,169,110,0.12)',
              border: `1px solid rgba(201,169,110,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Key size={13} color={GOLD} />
            </div>
            <div>
              <p style={{
                fontFamily: 'var(--serif)', fontSize: '1rem',
                fontWeight: 400, color: TEXT_BRIGHT, lineHeight: 1.15,
              }}>
                Azure <span style={{ color: GOLD, fontStyle: 'italic' }}>Keys</span>
              </p>
              <p style={{
                fontSize: '8.5px', color: TEXT_DIM,
                letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 1,
              }}>
                CRM Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER_COLOR}`,
              cursor: 'pointer', color: TEXT_DIM,
              display: 'none', padding: 5, borderRadius: 6,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <p style={{
                fontSize: '9.5px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: TEXT_DIM,
                fontWeight: 600, padding: '12px 16px 4px',
                fontFamily: 'var(--sans)',
              }}>
                {group.label}
              </p>
              {group.items.map(({ id, label, icon: Icon }) => {
                const isActive = activeSection === id
                return (
                  <button
                    key={id}
                    onClick={() => handleNav(id)}
                    style={{
                      width: 'calc(100% - 12px)',
                      margin: '1px 6px',
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '7px 10px',
                      borderRadius: 6,
                      background: isActive ? ACTIVE_BG : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: isActive ? GOLD : TEXT_MID,
                      fontFamily: 'var(--sans)',
                      fontSize: 12.5,
                      fontWeight: isActive ? 500 : 400,
                      transition: 'all 0.13s ease',
                      textAlign: 'left',
                    }}
                    onMouseOver={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = TEXT_BRIGHT
                      }
                    }}
                    onMouseOut={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = TEXT_MID
                      }
                    }}
                  >
                    <Icon
                      size={13}
                      style={{ flexShrink: 0, color: isActive ? GOLD : 'inherit' }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    {isActive && (
                      <div style={{
                        marginLeft: 'auto', width: 4, height: 4,
                        borderRadius: '50%', background: GOLD, flexShrink: 0,
                      }} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User + theme */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER_COLOR}`, flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 7, marginBottom: 8,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${BORDER_COLOR}`,
              cursor: 'pointer', color: TEXT_DIM,
              transition: 'all 0.15s',
              fontFamily: 'var(--sans)',
            }}
            onMouseOver={e => (e.currentTarget.style.color = TEXT_BRIGHT)}
            onMouseOut={e => (e.currentTarget.style.color = TEXT_DIM)}
          >
            {isDark
              ? <Sun size={13} color={GOLD} />
              : <Moon size={13} color={TEXT_DIM} />}
            <span style={{ fontSize: 11.5, color: 'inherit' }}>
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* User card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 10px', borderRadius: 7,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${BORDER_COLOR}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(201,169,110,0.15)',
              border: `1.5px solid rgba(201,169,110,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: GOLD, fontSize: '10px', fontWeight: 600, flexShrink: 0,
              fontFamily: 'var(--sans)',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '12px', fontWeight: 500, color: TEXT_BRIGHT,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'var(--sans)',
              }}>
                {profile?.full_name || 'User'}
              </p>
              <p style={{
                fontSize: '10px', color: GOLD,
                textTransform: 'capitalize', fontFamily: 'var(--sans)',
              }}>
                {profile?.role || 'agent'}
              </p>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: TEXT_DIM, padding: 4, borderRadius: 4, display: 'flex',
                transition: 'color 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#f87171')}
              onMouseOut={e => (e.currentTarget.style.color = TEXT_DIM)}
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
