'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

interface ReportsModuleProps { profile: Profile | null }

const GOLD = '#c9a84c'
const AZURE = '#1e7ec8'
const OCEAN = '#1a4a7a'

export default function ReportsModule({ profile }: ReportsModuleProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [dealsByStage, setDealsByStage] = useState<any[]>([])
  const [contactsBySource, setContactsBySource] = useState<any[]>([])
  const [contactsByStage, setContactsByStage] = useState<any[]>([])
  const [agentPerformance, setAgentPerformance] = useState<any[]>([])

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    setLoading(true)
    const [
      { data: deals },
      { data: contacts },
      { data: properties },
      { data: viewings },
      { data: offers },
      { data: tasks }
    ] = await Promise.all([
      supabase.from('deals').select('*, profiles!agent_id(full_name)'),
      supabase.from('contacts').select('source, lifecycle_stage, created_at'),
      supabase.from('properties').select('status, price'),
      supabase.from('viewings').select('status, agent_id, profiles!agent_id(full_name)'),
      supabase.from('offers').select('status, offer_amount, accepted_amount'),
      supabase.from('tasks').select('status, assigned_to, profiles!assigned_to(full_name)')
    ])

    const dealsData = deals || []
    const contactsData = contacts || []

    // Deals by stage
    const stageMap: Record<string, number> = {}
    dealsData.forEach(d => { stageMap[d.stage] = (stageMap[d.stage] || 0) + 1 })
    setDealsByStage(Object.entries(stageMap).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value
    })))

    // Contacts by source
    const sourceMap: Record<string, number> = {}
    contactsData.forEach(c => { if (c.source) sourceMap[c.source] = (sourceMap[c.source] || 0) + 1 })
    setContactsBySource(Object.entries(sourceMap).map(([name, value]) => ({
      name: name.replace(/_/g, ' '), value
    })))

    // Contacts by lifecycle stage
    const lcMap: Record<string, number> = {}
    contactsData.forEach(c => { if (c.lifecycle_stage) lcMap[c.lifecycle_stage] = (lcMap[c.lifecycle_stage] || 0) + 1 })
    setContactsByStage(Object.entries(lcMap).map(([name, value]) => ({
      name: name.replace(/_/g, ' '), value
    })))

    // Agent performance
    const agentMap: Record<string, any> = {}
    dealsData.forEach(d => {
      const name = (d as any).profiles?.full_name || 'Unknown'
      if (!agentMap[name]) agentMap[name] = { name, deals: 0, value: 0, won: 0 }
      agentMap[name].deals++
      agentMap[name].value += d.expected_value || 0
      if (d.stage === 'closed_won') agentMap[name].won++
    })
    setAgentPerformance(Object.values(agentMap))

    // Stats
    const wonDeals = dealsData.filter(d => d.stage === 'closed_won')
    const totalRevenue = wonDeals.reduce((s, d) => s + (d.actual_value || d.expected_value || 0), 0)
    const pipeline = dealsData.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).reduce((s, d) => s + (d.expected_value || 0), 0)
    const activeProps = (properties || []).filter(p => p.status === 'active')
    const totalListingValue = activeProps.reduce((s, p) => s + (p.price || 0), 0)

    setStats({
      totalRevenue, pipeline, wonDeals: wonDeals.length,
      totalContacts: contactsData.length,
      activeProperties: activeProps.length, totalListingValue,
      viewings: viewings?.length || 0,
      completedViewings: (viewings || []).filter(v => v.status === 'completed').length,
      totalOffers: offers?.length || 0,
      acceptedOffers: (offers || []).filter(o => o.status === 'accepted').length,
      pendingTasks: (tasks || []).filter(t => t.status === 'pending').length,
    })
    setLoading(false)
  }

  const formatCurrency = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`
    return `$${v}`
  }

  const PIE_COLORS = [GOLD, AZURE, '#c97a1e', OCEAN, '#4a7a4a', '#7a4a8c', '#8c4a4a', '#4a7a8c']

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Analytics</p>
        <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
          Performance <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Reports</em>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Comprehensive KPI tracking & business insights</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), sub: 'Closed deals', color: GOLD },
          { label: 'Pipeline Value', value: formatCurrency(stats.pipeline), sub: 'Open deals', color: AZURE },
          { label: 'Deals Won', value: stats.wonDeals, sub: 'Closed won', color: '#4a8c4a' },
          { label: 'Conversion Rate', value: `${stats.wonDeals + (stats.pipeline > 0 ? 1 : 0) > 0 ? Math.round(stats.wonDeals / Math.max(stats.wonDeals + 1, 1) * 100) : 0}%`, sub: 'Win rate', color: '#9a7ac8' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="metric-card">
            <p className="serif text-3xl font-light mb-1" style={{ color }}>{value}</p>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>{label}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contacts', value: stats.totalContacts },
          { label: 'Active Listings', value: stats.activeProperties },
          { label: 'Viewings', value: stats.viewings },
          { label: 'Pending Tasks', value: stats.pendingTasks },
        ].map(({ label, value }) => (
          <div key={label} className="crm-card p-4 text-center">
            <p className="serif text-3xl font-light" style={{ color: 'var(--white)' }}>{value}</p>
            <p className="text-xs tracking-wider uppercase mt-1" style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pipeline by stage */}
        <div className="crm-card p-6">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Deals by Stage</p>
          {dealsByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dealsByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: 'rgba(248,245,240,0.4)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(248,245,240,0.5)', fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 0 }} />
                <Bar dataKey="value" fill={GOLD} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center py-16 text-xs" style={{ color: 'var(--muted)' }}>No deal data</p>}
        </div>

        {/* Contacts by source */}
        <div className="crm-card p-6">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Lead Sources</p>
          {contactsBySource.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={contactsBySource} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {contactsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--navy-mid)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 0 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {contactsBySource.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{item.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--white)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-center py-16 text-xs" style={{ color: 'var(--muted)' }}>No contact data</p>}
        </div>
      </div>

      {/* Contact lifecycle funnel */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="crm-card p-6">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Customer Lifecycle Funnel</p>
          {contactsByStage.length > 0 ? (
            <div className="space-y-3">
              {contactsByStage.map((item, i) => {
                const max = Math.max(...contactsByStage.map(s => s.value))
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{item.name}</span>
                      <span className="text-xs" style={{ color: 'var(--white)' }}>{item.value}</span>
                    </div>
                    <div className="h-2 w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full transition-all" style={{
                        width: `${(item.value / max) * 100}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length]
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>No lifecycle data</p>}
        </div>

        {/* Agent performance */}
        <div className="crm-card p-6">
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Agent Performance</p>
          {agentPerformance.length > 0 ? (
            <div className="crm-table w-full">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left pb-2">Agent</th>
                    <th className="text-center pb-2">Deals</th>
                    <th className="text-center pb-2">Won</th>
                    <th className="text-right pb-2">Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--white)', fontSize: '0.85rem' }}>{a.name}</td>
                      <td className="text-center" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{a.deals}</td>
                      <td className="text-center">
                        <span style={{ color: '#4a8c4a', fontSize: '0.85rem' }}>{a.won}</span>
                      </td>
                      <td className="text-right" style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>{formatCurrency(a.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>No agent data</p>}
        </div>
      </div>

      {/* Key metrics summary */}
      <div className="crm-card p-6">
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.65rem' }}>Business Summary</p>
        <div className="grid grid-cols-3 gap-8">
          {[
            {
              title: 'Sales Performance',
              items: [
                { label: 'Closed Deals', value: stats.wonDeals },
                { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue) },
                { label: 'Active Pipeline', value: formatCurrency(stats.pipeline) },
              ]
            },
            {
              title: 'Property Metrics',
              items: [
                { label: 'Active Listings', value: stats.activeProperties },
                { label: 'Total Listing Value', value: formatCurrency(stats.totalListingValue) },
                { label: 'Viewings Completed', value: stats.completedViewings },
              ]
            },
            {
              title: 'Lead Management',
              items: [
                { label: 'Total Contacts', value: stats.totalContacts },
                { label: 'Offers Made', value: stats.totalOffers },
                { label: 'Offers Accepted', value: stats.acceptedOffers },
              ]
            }
          ].map(({ title, items }) => (
            <div key={title}>
              <p className="text-xs tracking-wider uppercase mb-4" style={{ color: 'var(--gold)', fontSize: '0.7rem', borderBottom: '1px solid rgba(201,168,76,0.1)', paddingBottom: 8 }}>{title}</p>
              <div className="space-y-3">
                {items.map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--white)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
