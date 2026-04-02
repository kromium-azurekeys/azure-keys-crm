'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, DollarSign, Target, Zap, Plus, X, Globe, Instagram, Mail, Users } from 'lucide-react'
import Modal from '@/components/Modal'

interface AttributionModuleProps { profile: Profile | null }

const PLATFORM_ICONS: Record<string, any> = {
  google: Globe, meta: Users, instagram: Instagram,
  email: Mail, linkedin: Users, referral: Users, organic: Globe, other: Globe,
}

const PLATFORM_COLORS: Record<string, string> = {
  google: '#4285f4', meta: '#1877f2', instagram: '#c9a96e',
  linkedin: '#0077b5', email: '#c9a96e', referral: '#4a8c7a',
  organic: '#6a4a8c', other: '#888',
}

const fmt = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M`
  : n >= 1000   ? `$${(n / 1000).toFixed(0)}K`
  : `$${n.toFixed(0)}`

const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : '0%'

export default function AttributionModule({ profile }: AttributionModuleProps) {
  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [attribution, setAttribution] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [form, setForm] = useState<any>({ platform: 'google', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview'|'campaigns'|'funnel'|'closed'>('overview')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from('ad_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('revenue_attribution').select('*, deals(title,actual_value,stage), contacts(first_name,last_name), profiles!agent_id(full_name)').order('created_at', { ascending: false }).limit(50),
    ])
    setCampaigns(c || [])
    setAttribution(a || [])
    setLoading(false)
  }

  async function saveCampaign() {
    setSaving(true)
    try {
      if (selectedCampaign) {
        await supabase.from('ad_campaigns').update(form).eq('id', selectedCampaign.id)
      } else {
        await supabase.from('ad_campaigns').insert({ ...form, created_at: new Date().toISOString() })
      }
      setShowModal(false); load()
    } finally { setSaving(false) }
  }

  // Aggregated totals
  const totals = campaigns.reduce((acc, c) => ({
    spend:      acc.spend + (c.total_spend || 0),
    leads:      acc.leads + (c.leads || 0),
    qualified:  acc.qualified + (c.qualified_leads || 0),
    showings:   acc.showings + (c.showings || 0),
    closed:     acc.closed + (c.closed_deals || 0),
    commission: acc.commission + (c.commission_attributed || 0),
  }), { spend: 0, leads: 0, qualified: 0, showings: 0, closed: 0, commission: 0 })

  const overallROI = totals.spend > 0
    ? (((totals.commission - totals.spend) / totals.spend) * 100).toFixed(0)
    : '0'

  // Per-platform aggregation for chart
  const byPlatform: Record<string, any> = {}
  campaigns.forEach(c => {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = { platform: c.platform, leads: 0, commission: 0, spend: 0, closed: 0 }
    byPlatform[c.platform].leads += c.leads || 0
    byPlatform[c.platform].commission += (c.commission_attributed || 0) / 1000000
    byPlatform[c.platform].spend += c.total_spend || 0
    byPlatform[c.platform].closed += c.closed_deals || 0
  })
  const platformData = Object.values(byPlatform)

  // Funnel data
  const funnelSteps = [
    { label: 'Leads', value: totals.leads, pct: '100%', color: 'var(--gold)' },
    { label: 'Qualified', value: totals.qualified, pct: pct(totals.qualified, totals.leads), color: 'var(--gold)' },
    { label: 'Showings', value: totals.showings, pct: pct(totals.showings, totals.qualified), color: 'var(--gold)' },
    { label: 'Closed', value: totals.closed, pct: pct(totals.closed, totals.showings), color: 'var(--green)' },
  ]

  const p = isMobile ? '16px' : '28px 32px'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Marketing ROI</p>
          <h1 className="page-title">Lead <em>Attribution</em></h1>
          <p className="page-sub">{campaigns.length} campaigns · {totals.leads} total leads · {fmt(totals.commission)} commission attributed</p>
        </div>
        <button onClick={() => { setForm({ platform: 'google', status: 'active' }); setSelectedCampaign(null); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={15} /> Add Campaign
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {[
          { label: 'Ad Spend', value: fmt(totals.spend), icon: DollarSign, color: 'var(--text-3)', bg: 'var(--surface-2)' },
          { label: 'Total Leads', value: totals.leads, icon: Target, color: 'var(--gold)', bg: 'var(--gold-pale)' },
          { label: 'Commission', value: fmt(totals.commission), icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-pale)' },
          { label: 'Closed Deals', value: totals.closed, icon: Zap, color: 'var(--gold)', bg: 'var(--gold-pale)' },
          { label: 'Overall ROI', value: `${Number(overallROI).toLocaleString()}%`, icon: TrendingUp, color: Number(overallROI) > 1000 ? 'var(--green)' : 'var(--gold)', bg: 'var(--gold-pale)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: 20 }}>
        {(['overview','campaigns','funnel','closed'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`filter-tab${activeTab === t ? ' active' : ''}`} style={{ textTransform: 'capitalize' }}>
            {t === 'closed' ? 'Closed Sales' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {/* Commission by platform chart */}
          <div className="card" style={{ padding: isMobile ? 14 : 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Commission by Platform ($M)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={platformData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="platform" tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'var(--sans)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-4)', fontFamily: 'var(--sans)' }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`$${Number(v).toFixed(2)}M`, 'Commission']} />
                <Bar dataKey="commission" fill="var(--gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Leads by platform */}
          <div className="card" style={{ padding: isMobile ? 14 : 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Leads by Platform</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platformData.sort((a, b) => b.leads - a.leads).map(pd => {
                const Icon = PLATFORM_ICONS[pd.platform] || Globe
                const pColor = PLATFORM_COLORS[pd.platform] || 'var(--gold)'
                const maxLeads = Math.max(...platformData.map(x => x.leads)) || 1
                const cpl = pd.leads > 0 ? (pd.spend / pd.leads).toFixed(0) : '—'
                return (
                  <div key={pd.platform} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: `${pColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={12} style={{ color: pColor }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text)', textTransform: 'capitalize', fontWeight: 500 }}>{pd.platform}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{pd.leads} leads · ${cpl}/lead</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(pd.leads / maxLeads) * 100}%`, background: pColor }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CAMPAIGNS ── */}
      {activeTab === 'campaigns' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th>Spend</th>
                  <th>Leads</th>
                  <th>Qual.</th>
                  <th>Showings</th>
                  <th>Closed</th>
                  <th>Commission</th>
                  <th>ROI</th>
                  <th>CPL</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const PIcon = PLATFORM_ICONS[c.platform] || Globe
                  const pColor = PLATFORM_COLORS[c.platform] || 'var(--gold)'
                  const roi = c.total_spend > 0
                    ? (((c.commission_attributed - c.total_spend) / c.total_spend) * 100).toFixed(0)
                    : '—'
                  const cpl = c.leads > 0 ? `$${(c.total_spend / c.leads).toFixed(0)}` : '—'
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setForm(c); setSelectedCampaign(c); setShowModal(true) }}>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 13 }}>{c.name}</p>
                        {c.target_market && <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{c.target_market} · {c.target_audience}</p>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PIcon size={12} style={{ color: pColor }} />
                          <span style={{ fontSize: 12.5, textTransform: 'capitalize', color: 'var(--text-2)' }}>{c.platform}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-2)' }}>{fmt(c.total_spend || 0)}</td>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>{c.leads || 0}</td>
                      <td style={{ color: 'var(--text-3)' }}>{c.qualified_leads || 0}</td>
                      <td style={{ color: 'var(--text-3)' }}>{c.showings || 0}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>{c.closed_deals || 0}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 500 }}>{c.commission_attributed > 0 ? fmt(c.commission_attributed) : '—'}</td>
                      <td style={{ color: Number(roi) > 1000 ? 'var(--green)' : 'var(--gold)', fontWeight: 600 }}>
                        {roi !== '—' ? `${Number(roi).toLocaleString()}%` : '—'}
                      </td>
                      <td style={{ color: 'var(--text-3)' }}>{cpl}</td>
                      <td>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 3,
                          background: c.status === 'active' ? 'var(--green-pale)' : c.status === 'paused' ? 'var(--orange-pale)' : 'var(--surface-2)',
                          color: c.status === 'active' ? 'var(--green)' : c.status === 'paused' ? 'var(--orange)' : 'var(--text-3)',
                          border: `1px solid ${c.status === 'active' ? 'var(--green-border)' : c.status === 'paused' ? 'var(--orange-border)' : 'var(--border)'}`,
                          textTransform: 'capitalize',
                        }}>{c.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: FUNNEL ── */}
      {activeTab === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          {/* Funnel visualization */}
          <div className="card" style={{ padding: isMobile ? 14 : 24 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 24 }}>Sales Funnel — All Campaigns</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {funnelSteps.map((step, i) => {
                const width = 100 - (i * 14)
                return (
                  <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: `${width}%`, background: `rgba(201,169,110,${0.9 - i * 0.18})`, borderRadius: 4, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 auto', minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0d12' }}>{step.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0d12' }}>{step.value.toLocaleString()}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0, minWidth: 40 }}>{step.pct}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Overall Conversion</p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', color: 'var(--text)', fontWeight: 400 }}>
                {pct(totals.closed, totals.leads)}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Lead to closed sale · Industry avg 3–4%</p>
            </div>
          </div>

          {/* Funnel benchmarks */}
          <div className="card" style={{ padding: isMobile ? 14 : 24 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 16 }}>Stage Conversion Rates</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Lead → Qualified', actual: pct(totals.qualified, totals.leads), target: '65%', value: totals.qualified / (totals.leads || 1) },
                { label: 'Qualified → Showing', actual: pct(totals.showings, totals.qualified), target: '45%', value: totals.showings / (totals.qualified || 1) },
                { label: 'Showing → Offer', actual: pct(totals.closed * 2, totals.showings), target: '30%', value: (totals.closed * 2) / (totals.showings || 1) },
                { label: 'Offer → Close', actual: pct(totals.closed, totals.closed * 2 || 1), target: '75%', value: 0.75 },
              ].map(({ label, actual, target, value }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{actual}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-4)' }}>tgt {target}</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(value * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Cost Per Lead', value: totals.leads > 0 ? fmt(totals.spend / totals.leads) : '—' },
                { label: 'Cost Per Close', value: totals.closed > 0 ? fmt(totals.spend / totals.closed) : '—' },
                { label: 'Avg Commission', value: totals.closed > 0 ? fmt(totals.commission / totals.closed) : '—' },
                { label: 'Commission ROI', value: `${Number(overallROI).toLocaleString()}%` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', color: 'var(--gold)', fontWeight: 400 }}>{value}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CLOSED SALES ── */}
      {activeTab === 'closed' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {attribution.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><TrendingUp size={18} /></div>
              <p className="empty-title">No closed sales attributed yet</p>
              <p className="empty-sub">Close a deal and link it to a campaign to see attribution here</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>First Touch</th>
                    <th>Sale Price</th>
                    <th>Commission</th>
                    <th>Ad Spend</th>
                    <th>ROI</th>
                    <th>Days to Close</th>
                    <th>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {attribution.map(a => (
                    <tr key={a.id}>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text)' }}>
                          {a.contacts?.first_name} {a.contacts?.last_name}
                        </p>
                        {a.deals?.title && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.deals.title}</p>}
                      </td>
                      <td>
                        <p style={{ fontSize: 12.5, color: 'var(--text-2)', textTransform: 'capitalize' }}>{a.first_touch_source || '—'}</p>
                        {a.utm_campaign && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.utm_campaign}</p>}
                      </td>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>{a.sale_price ? fmt(a.sale_price) : '—'}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{a.commission_amount ? fmt(a.commission_amount) : '—'}</td>
                      <td style={{ color: 'var(--text-3)' }}>{a.ad_spend_allocated ? fmt(a.ad_spend_allocated) : '—'}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>
                        {a.roi ? `${Number(a.roi).toLocaleString()}%` : '—'}
                      </td>
                      <td style={{ color: 'var(--text-3)' }}>{a.days_to_close || '—'}</td>
                      <td style={{ color: 'var(--text-3)' }}>{(a as any).profiles?.full_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Campaign Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
                  {selectedCampaign ? 'Edit' : 'New'} Campaign
                </p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selectedCampaign ? 'Update Campaign' : 'Add Campaign'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="form-label">Campaign Name *</label>
                <input className="crm-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Luxury Beachfront — Google" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Platform</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.platform || 'google'} onChange={e => setForm({ ...form, platform: e.target.value })}>
                      {['google','meta','instagram','linkedin','email','referral','organic','other'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status || 'active'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['active','paused','completed','draft'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Target Market</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.target_market || ''} onChange={e => setForm({ ...form, target_market: e.target.value })}>
                      <option value="">All Markets</option>
                      {['cayman','bahamas','jamaica','barbados'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Daily Budget ($)</label>
                  <input type="number" className="crm-input" value={form.daily_budget || ''} onChange={e => setForm({ ...form, daily_budget: Number(e.target.value) })} placeholder="350" />
                </div>
              </div>
              <div><label className="form-label">Target Audience</label>
                <input className="crm-input" value={form.target_audience || ''} onChange={e => setForm({ ...form, target_audience: e.target.value })} placeholder="e.g. US/UK HNW buyers $2M+" />
              </div>
              <div><label className="form-label">Objective</label>
                <input className="crm-input" value={form.objective || ''} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Luxury Buyer Leads" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Start Date</label>
                  <input type="date" className="crm-input" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div><label className="form-label">Total Spend to Date ($)</label>
                  <input type="number" className="crm-input" value={form.total_spend || ''} onChange={e => setForm({ ...form, total_spend: Number(e.target.value) })} placeholder="8400" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { key: 'leads', label: 'Total Leads' },
                  { key: 'qualified_leads', label: 'Qualified' },
                  { key: 'showings', label: 'Showings' },
                  { key: 'closed_deals', label: 'Closed' },
                  { key: 'commission_attributed', label: 'Commission ($)' },
                ].map(({ key, label }) => (
                  <div key={key}><label className="form-label">{label}</label>
                    <input type="number" className="crm-input" value={(form as any)[key] || ''} onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} placeholder="0" />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveCampaign} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedCampaign ? 'Update' : 'Add Campaign'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
