'use client'

import { CRMSection } from '@/app/crm/page'
import { Profile } from '@/lib/supabase'
import {
  LayoutDashboard, Users, GitBranch, Building2, Calendar,
  FileText, CheckSquare, Mail, BarChart3, LogOut, Key, Settings
} from 'lucide-react'

interface SidebarProps {
  activeSection: CRMSection
  onNavigate: (section: CRMSection) => void
  profile: Profile | null
  onSignOut: () => void
}

const navItems: { id: CRMSection; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'viewings', label: 'Viewings', icon: Calendar },
  { id: 'offers', label: 'Offers', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'campaigns', label: 'Campaigns', icon: Mail },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar({ activeSection, onNavigate, profile, onSignOut }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 h-full border-r" style={{
      background: 'var(--navy-mid)',
      borderColor: 'rgba(201,168,76,0.1)',
      minWidth: '14rem'
    }}>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Key size={16} style={{ color: 'var(--gold)' }} />
          <span className="serif text-xl font-light" style={{ color: 'var(--white)' }}>
            Azure <span style={{ color: 'var(--gold)' }}>Keys</span>
          </span>
        </div>
        <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(248,245,240,0.25)', fontSize: '0.6rem' }}>
          CRM Platform
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-3">
          <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(248,245,240,0.2)', fontSize: '0.6rem' }}>
            Navigation
          </p>
        </div>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`nav-item w-full text-left ${activeSection === id ? 'active' : ''}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Profile */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 flex items-center justify-center text-xs font-medium" style={{
            background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%'
          }}>
            {profile?.full_name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: 'var(--white)' }}>
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs tracking-wider capitalize" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>
              {profile?.role || 'agent'}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="nav-item w-full text-left"
          style={{ color: 'rgba(248,245,240,0.35)' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
