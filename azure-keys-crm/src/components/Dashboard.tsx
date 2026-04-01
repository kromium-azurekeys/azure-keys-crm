'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { CRMSection } from '@/app/crm/page'
import { Users, Building2, TrendingUp, DollarSign, Calendar, CheckSquare, ArrowUpRight, Activity, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useIsMobile } from '@/hooks/useIsMobile'

interface DashboardProps {
  profile: Profile | null
  onNavigate: (section: CRMSection) => void
}

const GOLD = '#c9a96e'

export default function Dashboard({ profile, onNavigate }: DashboardProps) {
  const isMobile = useIsMobile()
  const [stats, setStats] = useState({ contacts: 0, properties: 0, deals: 0, totalValue: 0, activeTasks: 0, viewingsThisWeek: 0, wonDeals: 0, pipeline: 0 })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [upcomingViewings, setUpcomingViewings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    try {
      const [{ count: contactCount }, { count: propCount }, { data: deals }, { count: taskCount }, { data: viewings }, { data: activities }] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deals').select('*'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('viewings').select('*, properties(title), contacts(first_name, last_name)').gte('scheduled_at', new Date().toISOString()).lte('scheduled_at', new Date(Date.now() + 7 * 86400000).toISOString()).order('scheduled_at', { ascending: true }).limit(5),
        supabase.from('activities').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(6)
      ])
      const dealsData = deals || []
      const wonValue = dealsData.filter(d => d.stage === 'closed_won').reduce((s, d) => s + (d.actual_value || 0), 0)
      const pipeline = dealsData.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + (d.expected_value || 0), 0)
      setStats({ contacts: contactCount || 0, properties: propCount || 0, deals: dealsData.length, totalValue: wonValue, activeTasks: taskCount || 0, viewingsThisWeek: viewings?.length || 0, wonDeals: dealsData.filter(d => d.stage === 'closed_won').length, pipeline })
      const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
      setMonthlyData(months.map((m) => ({ month: m, revenue: Math.floor(Math.random() * 800000 + 200000) })))
      setUpcomingViewings(viewings || [])
      setRecentActivities(activities || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const p = isMobile ? '16px' : '28px 32px'

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.1 }}>
            {greeting}, <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>{profile?.full_name?.split(' ')[0] || 'there'}</em>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Here&apos;s what&apos;s happening today</p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" onClick={() => onNavigate('contacts')}><Users size={14} />Add Contact</button>
            <button className="btn-primary" onClick={() => onNavigate('pipeline')}><Zap size={14} />New Deal</button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: 14 }}>
        {[
          { label: 'Contacts', value: stats.contacts, icon: Users, color: 'var(--gold)', bg: 'var(--gold-pale)', action: 'contacts' as CRMSection },
          { label: 'Active Listings', value: stats.properties, icon: Building2, color: 'var(--gold)', bg: 'var(--gold-pale)', action: 'properties' as CRMSection },
          { label: 'Pipeline', value: fmt(stats.pipeline), icon: TrendingUp, color: '#16a34a', bg: 'var(--green-pale)', action: 'pipeline' as CRMSection },
          { label: 'Revenue', value: fmt(stats.totalValue), icon: DollarSign, color: 'var(--purple)', bg: 'var(--purple-pale)', action: 'reports' as CRMSection },
        ].map(({ label, value, icon: Icon, color, bg, action }) => (
          <button key={label} onClick={() => onNavigate(action)} className="metric-card" style={{ textAlign: 'left', cursor: 'pointer', width: '100%', padding: isMobile ? 14 : 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={14} style={{ color }} />
              </div>
              <ArrowUpRight size={13} style={{ color: 'var(--text-4)' }} />
            </div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
          </button>
        ))}
      </div>

      {/* Secondary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {[
          { label: 'Pending Tasks', value: stats.activeTasks, color: 'var(--orange)', bg: 'var(--orange-pale)', icon: CheckSquare },
          { label: 'Viewings This Week', value: stats.viewingsThisWeek, color: 'var(--gold)', bg: 'var(--gold-pale)', icon: Calendar },
          { label: 'Deals Won', value: stats.wonDeals, color: 'var(--green)', bg: 'var(--green-pale)', icon: TrendingUp },
          { label: 'Total Deals', value: stats.deals, color: 'var(--purple)', bg: 'var(--purple-pale)', icon: Activity },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '11px 13px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={13} style={{ color }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: isMobile ? 10 : 12, color: 'var(--text-3)', marginTop: 2 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Revenue Trend — Last 7 Months</p>
          <ResponsiveContainer width="100%" height={isMobile ? 140 : 180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fill: 'var(--text-4)', fontSize: 11 }} axisLine={false} tickLine={false} width={isMobile ? 38 : 50} />
              <Tooltip formatter={(v: any) => [`$${(v / 1000).toFixed(0)}K`, 'Revenue']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Upcoming Viewings</p>
            <button onClick={() => onNavigate('viewings')} style={{ fontSize: 12, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
          </div>
          {upcomingViewings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Calendar size={20} /></div>
              <p className="empty-title">No viewings this week</p>
              <button onClick={() => onNavigate('viewings')} className="btn-outline" style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }}>Schedule Viewing</button>
            </div>
          ) : (
            <div style={{ padding: '6px 0' }}>
              {upcomingViewings.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ textAlign: 'center', width: 36, flexShrink: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>{new Date(v.scheduled_at).getDate()}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{new Date(v.scheduled_at).toLocaleDateString('en', { month: 'short' })}</p>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.properties?.title || 'Property'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{v.contacts?.first_name} {v.contacts?.last_name}</p>
                  </div>
                  <span className={`badge ${v.status === 'confirmed' ? 'badge-green' : 'badge-gold'}`}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Recent Activity</p>
          </div>
          {recentActivities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Activity size={20} /></div>
              <p className="empty-title">No recent activity</p>
            </div>
          ) : (
            <div style={{ padding: '6px 0' }}>
              {recentActivities.map((a, idx) => (
                <div key={a.id} style={{ display: 'flex', gap: 12, padding: '9px 18px', borderBottom: idx < recentActivities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.description}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{a.profiles?.full_name || 'System'} · {new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
          <button className="btn-outline" onClick={() => onNavigate('contacts')} style={{ justifyContent: 'center' }}><Users size={14} />Contact</button>
          <button className="btn-primary" onClick={() => onNavigate('pipeline')} style={{ justifyContent: 'center' }}><Zap size={14} />New Deal</button>
        </div>
      )}
    </div>
  )
}
