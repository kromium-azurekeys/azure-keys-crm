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

export type CRMSection = 'dashboard' | 'contacts' | 'pipeline' | 'properties' | 'viewings' | 'offers' | 'tasks' | 'campaigns' | 'reports'

export default function CRMPage() {
  const [section, setSection] = useState<CRMSection>('dashboard')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)' }}>Loading Azure Keys CRM</p>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <Dashboard profile={profile} onNavigate={setSection} />
      case 'contacts': return <ContactsModule profile={profile} />
      case 'pipeline': return <PipelineModule profile={profile} />
      case 'properties': return <PropertiesModule profile={profile} />
      case 'viewings': return <ViewingsModule profile={profile} />
      case 'offers': return <OffersModule profile={profile} />
      case 'tasks': return <TasksModule profile={profile} />
      case 'campaigns': return <CampaignsModule profile={profile} />
      case 'reports': return <ReportsModule profile={profile} />
      default: return <Dashboard profile={profile} onNavigate={setSection} />
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--navy)' }}>
      <Sidebar
        activeSection={section}
        onNavigate={setSection}
        profile={profile}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 overflow-y-auto">
        {renderSection()}
      </main>
    </div>
  )
}
