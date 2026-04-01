'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase, Profile } from '@/lib/supabase'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

interface ReportsModuleProps { profile: Profile | null }

const GOLD = '#c9a84c'
const AZURE = '#c9a96e'  // remapped to gold
const OCEAN = '#1a4a7a'

export default function ReportsModule({ profile }: ReportsModuleProps) {
  const isMobile = useIsMobile()
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

  const PIE_COLORS = ['#c9a96e', '#e8c98a', '#a07840', '#d4af6a', '#8b6730', '#f0d898', '#6b4f28', '#c4975a']

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="animate-fade-up" style={{ padding: isMobile ? 16 : '28px 32px' }}>
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Analytics</p>
        <h1 className="page-title" style={{ fontFamily: 'var(--serif)', fontWeight: 400, color: 'var(--text)' }}>
          Performance <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Reports</em>
        </h1>
        <p className="page-sub" style={{ color: 'var(--text-3)' }}>Comprehensive KPI tracking & business insights</p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 12 : 20 }}>
        {[
          { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), sub: 'Closed deals', color: GOLD },
          { label: 'Pipeline Value', value: formatCurrency(stats.pipeline), sub: 'Open deals', color: 'var(--gold)' },
          { label: 'Deals Won', value: stats.wonDeals, sub: 'Closed won', color: '#4a8c4a' },
          { label: 'Conversion Rate', value: `${stats.wonDeals + (stats.pipeline > 0 ? 1 : 0) > 0 ? Math.round(stats.wonDeals / Math.max(stats.wonDeals + 1, 1) * 100) : 0}%`, sub: 'Win rate', color: '#9a7ac8' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="metric-card" style={{ padding: isMobile ? 14 : 20 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 400, marginBottom: 4, color }}>{value}</p>
            <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
        {[
          { label: 'Total Contacts', value: stats.totalContacts },
          { label: 'Active Listings', value: stats.activeProperties },
          { label: 'Viewings', value: stats.viewings },
          { label: 'Pending Tasks', value: stats.pendingTasks },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '12px 14px' : '16px 20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 400, color: 'var(--text)' }}>{value}</p>
            <p style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 24, marginBottom: isMobile ? 14 : 24 }}>
        {/* Pipeline by stage */}
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Deals by Stage</p>
          {dealsByStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dealsByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: 'var(--text-4)', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10 }} width={isMobile ? 80 : 100} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill={GOLD} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--text-3)' }}>No deal data</p>}
        </div>

        {/* Contacts by source */}
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Lead Sources</p>
          {contactsBySource.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <ResponsiveContainer width={isMobile ? '100%' : '50%'} height={180}>
                <PieChart>
                  <Pie data={contactsBySource} cx="50%" cy="50%" outerRadius={75} dataKey="value">
                    {contactsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, minWidth: 100 }}>
                {contactsBySource.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ textAlign: 'center', padding: '48px 0', fontSize: 12, color: 'var(--text-3)' }}>No contact data</p>}
        </div>
      </div>

      {/* Contact lifecycle funnel + Agent performance */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 24, marginBottom: isMobile ? 14 : 24 }}>
        <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Customer Lifecycle Funnel</p>
          {contactsByStage.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contactsByStage.map((item, i) => {
                const max = Math.max(...contactsByStage.map(s => s.value))
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{item.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text)' }}>{item.value}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(item.value / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>No lifecycle data</p>}
        </div>

        {/* Agent performance */}
        <div className="card" style={{ padding: isMobile ? 16 : 24, overflow: 'hidden' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Agent Performance</p>
          {agentPerformance.length > 0 ? (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Deals</th>
                    <th>Won</th>
                    <th>Pipeline</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((a, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text)' }}>{a.name}</td>
                      <td style={{ color: 'var(--text-3)' }}>{a.deals}</td>
                      <td><span style={{ color: '#4a8c4a' }}>{a.won}</span></td>
                      <td style={{ color: 'var(--gold)' }}>{formatCurrency(a.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: 'var(--text-3)' }}>No agent data</p>}
        </div>
      </div>

      {/* Key metrics summary */}
      <div className="card" style={{ padding: isMobile ? 16 : 24 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Business Summary</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 20 : 32 }}>
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
              <p style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 14 }}>{title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value}</span>
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
