'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { CRMSection } from '@/app/crm/page'
import { Users, Building2, TrendingUp, DollarSign, Calendar, CheckSquare, ArrowUpRight, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface DashboardProps {
  profile: Profile | null
  onNavigate: (section: CRMSection) => void
}

const GOLD = '#c9a84c'
const AZURE = '#1e7ec8'
const OCEAN = '#1a4a7a'

export default function Dashboard({ profile, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    contacts: 0, properties: 0, deals: 0, totalValue: 0,
    activeTasks: 0, viewingsThisWeek: 0, wonDeals: 0, pipeline: 0
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [dealsByStage, setDealsByStage] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [upcomingViewings, setUpcomingViewings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [
        { count: contactCount },
        { count: propCount },
        { data: deals },
        { count: taskCount },
        { data: viewings },
        { data: activities }
      ] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('deals').select('*'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('viewings').select('*, properties(title), contacts(first_name, last_name)')
          .gte('scheduled_at', new Date().toISOString())
          .lte('scheduled_at', new Date(Date.now() + 7 * 86400000).toISOString())
          .order('scheduled_at', { ascending: true }).limit(5),
        supabase.from('activities').select('*, profiles(full_name)')
          .order('created_at', { ascending: false }).limit(8)
      ])

      const dealsData = deals || []
      const totalValue = dealsData.reduce((sum, d) => sum + (d.expected_value || 0), 0)
      const wonValue = dealsData.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + (d.actual_value || 0), 0)
      const pipeline = dealsData.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
        .reduce((sum, d) => sum + (d.expected_value || 0), 0)

      setStats({
        contacts: contactCount || 0,
        properties: propCount || 0,
        deals: dealsData.length,
        totalValue: wonValue,
        activeTasks: taskCount || 0,
        viewingsThisWeek: viewings?.length || 0,
        wonDeals: dealsData.filter(d => d.stage === 'closed_won').length,
        pipeline
      })

      // Stage breakdown
      const stageMap: Record<string, number> = {}
      dealsData.forEach(d => {
        stageMap[d.stage] = (stageMap[d.stage] || 0) + 1
      })
      setDealsByStage(Object.entries(stageMap).map(([stage, count]) => ({
        name: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count
      })))

      // Monthly revenue mock data (in real app, query by month)
      const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
      setMonthlyData(months.map((m, i) => ({
        month: m,
        revenue: Math.floor(Math.random() * 800000 + 200000),
        leads: Math.floor(Math.random() * 30 + 5)
      })))

      setUpcomingViewings(viewings || [])
      setRecentActivities(activities || [])
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
  }

  const PIE_COLORS = [GOLD, AZURE, '#c97a1e', OCEAN, '#4a7a1a', '#7a1a4a', '#1a7a6a', '#7a4a1a']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Overview</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>
              {profile?.full_name?.split(' ')[0] || 'Agent'}
            </em>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-gold" onClick={() => onNavigate('contacts')}>
            + Add Contact
          </button>
          <button className="btn-gold" onClick={() => onNavigate('pipeline')}>
            + New Deal
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contacts', value: stats.contacts, icon: Users, sub: 'In database', action: 'contacts' as CRMSection },
          { label: 'Active Listings', value: stats.properties, icon: Building2, sub: 'Properties', action: 'properties' as CRMSection },
          { label: 'Pipeline Value', value: formatCurrency(stats.pipeline), icon: TrendingUp, sub: 'Open deals', action: 'pipeline' as CRMSection },
          { label: 'Closed Revenue', value: formatCurrency(stats.totalValue), icon: DollarSign, sub: 'This period', action: 'reports' as CRMSection },
        ].map(({ label, value, icon: Icon, sub, action }) => (
          <button
            key={label}
            onClick={() => onNavigate(action)}
            className="metric-card text-left w-full transition-all hover:scale-[1.01]"
          >
            <div className="flex items-start justify-between mb-3">
              <Icon size={18} style={{ color: 'var(--gold)' }} />
              <ArrowUpRight size={14} style={{ color: 'rgba(248,245,240,0.2)' }} />
            </div>
            <p className="serif text-3xl font-light mb-1" style={{ color: 'var(--white)' }}>{value}</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>{label}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</p>
          </button>
        ))}
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pending Tasks', value: stats.activeTasks, icon: CheckSquare, color: '#e87a1e' },
          { label: 'Viewings This Week', value: stats.viewingsThisWeek, icon: Calendar, color: AZURE },
          { label: 'Deals Won', value: stats.wonDeals, icon: TrendingUp, color: '#4a8c4a' },
          { label: 'Active Deals', value: stats.deals, icon: Activity, color: GOLD },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="crm-card p-5 flex items-center gap-4">
            <div className="p-2" style={{ background: `${color}20`, borderRadius: 4 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl serif font-light" style={{ color: 'var(--white)' }}>{value}</p>
              <p className="text-xs tracking-wider" style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Revenue chart */}
        <div className="crm-card p-6 col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Revenue Trend</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Last 7 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(248,245,240,0.4)', fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fill: 'rgba(248,245,240,0.4)', fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => [`$${(v/1000).toFixed(0)}K`, 'Revenue']}
                contentStyle={{ background: 'var(--navy-mid)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 0 }}
                labelStyle={{ color: 'var(--gold)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline by stage */}
        <div className="crm-card p-6">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Pipeline Stages</p>
          {dealsByStage.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={dealsByStage} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                    {dealsByStage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {dealsByStage.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{item.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--white)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No deals yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming viewings */}
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Upcoming Viewings</p>
            <button onClick={() => onNavigate('viewings')} className="text-xs" style={{ color: 'var(--muted)' }}>View all →</button>
          </div>
          {upcomingViewings.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar size={24} style={{ color: 'rgba(248,245,240,0.15)', margin: '0 auto 8px' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No viewings scheduled this week</p>
              <button onClick={() => onNavigate('viewings')} className="btn-outline-gold mt-4" style={{ fontSize: '0.7rem', padding: '6px 16px' }}>
                Schedule Viewing
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingViewings.map(v => (
                <div key={v.id} className="flex items-start gap-3 p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.06)' }}>
                  <div className="text-center px-2 py-1" style={{ background: 'var(--gold)', color: 'var(--navy)', minWidth: 40 }}>
                    <p className="text-xs font-bold">{new Date(v.scheduled_at).getDate()}</p>
                    <p style={{ fontSize: '0.55rem', textTransform: 'uppercase' }}>{new Date(v.scheduled_at).toLocaleDateString('en', { month: 'short' })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--white)' }}>
                      {v.properties?.title || 'Property'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {v.contacts?.first_name} {v.contacts?.last_name} · {new Date(v.scheduled_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1" style={{
                    background: v.status === 'confirmed' ? 'rgba(74,140,74,0.2)' : 'rgba(201,168,76,0.1)',
                    color: v.status === 'confirmed' ? '#4a8c4a' : 'var(--gold)',
                    border: `1px solid ${v.status === 'confirmed' ? 'rgba(74,140,74,0.3)' : 'rgba(201,168,76,0.2)'}`
                  }}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="crm-card p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Recent Activity</p>
          </div>
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center">
              <Activity size={24} style={{ color: 'rgba(248,245,240,0.15)', margin: '0 auto 8px' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--gold)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--white)' }}>{a.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {a.profiles?.full_name || 'System'} · {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
