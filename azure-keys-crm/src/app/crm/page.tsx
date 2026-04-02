'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Dashboard from '@/components/Dashboard'
import ContactsModule from '@/components/ContactsModule'
import PipelineModule from '@/components/PipelineModule'
import PropertiesModule from '@/components/PropertiesModule'
import ViewingsModule from '@/components/ViewingsModule'
import OffersModule from '@/components/OffersModule'
import TasksModule from '@/components/TasksModule'
import CampaignsModule from '@/components/CampaignsModule'
import ReportsModule from '@/components/ReportsModule'
import CBIModule from '@/components/CBIModule'
import YieldCalculator from '@/components/YieldCalculator'
import SmartMatching from '@/components/SmartMatching'
import ConciergeModule from '@/components/ConciergeModule'
import DeveloperPipeline from '@/components/DeveloperPipeline'
import ReferralNetwork from '@/components/ReferralNetwork'
import SeasonalIntel from '@/components/SeasonalIntel'
import WebsiteEnquiriesModule from '@/components/WebsiteEnquiriesModule'
import AttributionModule from '@/components/AttributionModule'
import SellerLeadsModule from '@/components/SellerLeadsModule'
import PropertyInterestModule from '@/components/PropertyInterestModule'
import NurtureModule from '@/components/NurtureModule'
import DocumentsModule from '@/components/DocumentsModule'
import ForeignBuyerModule from '@/components/ForeignBuyerModule'
import { Key, Menu } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

export type CRMSection = 
  'dashboard' | 'contacts' | 'pipeline' | 'properties' | 'viewings' | 
  'offers' | 'tasks' | 'campaigns' | 'reports' |
  'cbi' | 'yield' | 'matching' | 'concierge' | 'developer' | 'referrals' | 'seasonal' | 'website_enquiries' |
  'documents' | 'foreignbuyer' | 'attribution' | 'seller_leads' | 'property_interests' | 'nurture'

const SIDEBAR_W = 220

export default function CRMPage() {
  const isMobile = useIsMobile()
  const [section, setSection] = useState<CRMSection>('dashboard')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => { checkUser() }, [])

  // Close sidebar on resize to desktop
  useEffect(() => { if (!isMobile) setSidebarOpen(false) }, [isMobile])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleNavigate = (s: CRMSection) => {
    setSection(s)
    setSidebarOpen(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Key size={20} color="var(--gold)" />
        </div>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading Azure Keys CRM</p>
      </div>
    </div>
  )

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard profile={profile} onNavigate={handleNavigate} />
      case 'contacts': return <ContactsModule profile={profile} />
      case 'pipeline': return <PipelineModule profile={profile} />
      case 'properties': return <PropertiesModule profile={profile} />
      case 'viewings': return <ViewingsModule profile={profile} />
      case 'offers': return <OffersModule profile={profile} />
      case 'tasks': return <TasksModule profile={profile} />
      case 'campaigns': return <CampaignsModule profile={profile} />
      case 'reports': return <ReportsModule profile={profile} />
      case 'cbi': return <CBIModule profile={profile} />
      case 'yield': return <YieldCalculator profile={profile} />
      case 'matching': return <SmartMatching profile={profile} />
      case 'concierge': return <ConciergeModule profile={profile} />
      case 'developer': return <DeveloperPipeline profile={profile} />
      case 'referrals': return <ReferralNetwork profile={profile} />
      case 'seasonal': return <SeasonalIntel profile={profile} />
      case 'documents': return <DocumentsModule profile={profile} />
      case 'foreignbuyer': return <ForeignBuyerModule profile={profile} />
      case 'website_enquiries': return <WebsiteEnquiriesModule />
      case 'attribution': return <AttributionModule profile={profile} />
      case 'seller_leads': return <SellerLeadsModule profile={profile} />
      case 'property_interests': return <PropertyInterestModule profile={profile} />
      case 'nurture': return <NurtureModule profile={profile} />
      default: return <Dashboard profile={profile} onNavigate={handleNavigate} />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar — fixed on desktop, slide-in on mobile */}
      <Sidebar
        activeSection={section}
        onNavigate={handleNavigate}
        profile={profile}
        onSignOut={handleSignOut}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content wrapper */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 16px', height: 52, flexShrink: 0,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0,
              }}
            >
              <Menu size={17} />
            </button>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', fontWeight: 400, color: 'var(--text)' }}>
              Azure <span style={{ color: 'var(--gold)' }}>Keys</span>
            </p>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {section}
            </span>
          </div>
        )}

        {/* Scrollable content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {renderSection()}
        </main>
      </div>
    </div>
  )
}
