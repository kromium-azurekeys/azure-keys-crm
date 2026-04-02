'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Plus, X, Home, Calendar, FileText, CheckCircle, Clock, TrendingUp, AlertCircle, MapPin } from 'lucide-react'
import Modal from '@/components/Modal'

interface SellerLeadsProps { profile: Profile | null }

const STAGES = [
  { key: 'new',                   label: 'New',                color: 'var(--text-3)',  bg: 'var(--surface-2)' },
  { key: 'contacted',             label: 'Contacted',          color: 'var(--gold)',    bg: 'var(--gold-pale)' },
  { key: 'walkthrough_scheduled', label: 'Walkthrough Booked', color: 'var(--orange)',  bg: 'var(--orange-pale)' },
  { key: 'walkthrough_completed', label: 'Walkthrough Done',   color: 'var(--purple)',  bg: 'var(--purple-pale)' },
  { key: 'cma_sent',              label: 'CMA Sent',           color: 'var(--azure)',   bg: 'var(--surface-2)' },
  { key: 'listed',                label: 'Listed',             color: 'var(--green)',   bg: 'var(--green-pale)' },
  { key: 'under_contract',        label: 'Under Contract',     color: 'var(--gold)',    bg: 'var(--gold-pale)' },
  { key: 'closed',                label: 'Closed',             color: 'var(--green)',   bg: 'var(--green-pale)' },
  { key: 'lost',                  label: 'Lost',               color: 'var(--red)',     bg: 'var(--red-pale)' },
]

const TIER_COLORS: Record<string, string> = { hot: '#ff6b6b', warm: 'var(--gold)', cold: 'var(--text-3)', unqualified: 'var(--text-4)' }

const fmt = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(2)}M`
  : n >= 1000   ? `$${(n / 1000).toFixed(0)}K`
  : `$${n}`

export default function SellerLeadsModule({ profile }: SellerLeadsProps) {
  const isMobile = useIsMobile()
  const [leads, setLeads] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>({ status: 'new', lead_score: 0, lead_tier: 'warm', condition: 'good', motivation: 'just_curious', timeline: '6_plus_months', ownership_type: 'sole_owner' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [filter, tierFilter])

  async function load() {
    setLoading(true)
    let q = supabase.from('seller_leads')
      .select('*, profiles!assigned_agent_id(full_name)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    if (tierFilter !== 'all') q = q.eq('lead_tier', tierFilter)
    const { data } = await q.limit(100)
    setLeads(data || [])
    const { data: a } = await supabase.from('profiles').select('id, full_name').order('full_name')
    setAgents(a || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    try {
      if (selected) {
        await supabase.from('seller_leads').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selected.id)
      } else {
        await supabase.from('seller_leads').insert({ ...form, created_at: new Date().toISOString() })
      }
      setShowModal(false); load()
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    const extra: any = {}
    if (status === 'walkthrough_completed') extra.walkthrough_completed_at = new Date().toISOString()
    if (status === 'cma_sent') extra.cma_sent_at = new Date().toISOString()
    if (status === 'listed') extra.listed_at = new Date().toISOString()
    await supabase.from('seller_leads').update({ status, ...extra }).eq('id', id)
    load()
  }

  // Totals
  const totalPipelineValue = leads.reduce((s, l) => s + (l.estimated_value_max || 0), 0)
  const hotCount = leads.filter(l => l.lead_tier === 'hot').length
  const activeCount = leads.filter(l => !['closed', 'lost'].includes(l.status)).length

  const stageInfo = (key: string) => STAGES.find(s => s.key === key) || STAGES[0]
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
          <p className="page-label">Seller Pipeline</p>
          <h1 className="page-title">Seller <em>Leads</em></h1>
          <p className="page-sub">{activeCount} active · {hotCount} hot · {fmt(totalPipelineValue)} total potential</p>
        </div>
        <button onClick={() => { setForm({ status: 'new', lead_score: 0, lead_tier: 'warm', condition: 'good', motivation: 'just_curious', timeline: '6_plus_months', ownership_type: 'sole_owner' }); setSelected(null); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={15} /> Add Seller Lead
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {[
          { label: 'Total Leads', value: leads.length, color: 'var(--gold)', bg: 'var(--gold-pale)' },
          { label: 'Hot Leads', value: hotCount, color: '#ff6b6b', bg: 'var(--red-pale)' },
          { label: 'Pipeline Value', value: fmt(totalPipelineValue), color: 'var(--green)', bg: 'var(--green-pale)' },
          { label: 'Walkthroughs Due', value: leads.filter(l => l.status === 'walkthrough_scheduled').length, color: 'var(--orange)', bg: 'var(--orange-pale)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.3rem' : '1.6rem', color: 'var(--text)', fontWeight: 400, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="filter-tabs">
          <button onClick={() => setFilter('all')} className={`filter-tab${filter === 'all' ? ' active' : ''}`}>All</button>
          {['new','contacted','walkthrough_scheduled','cma_sent','listed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`filter-tab${filter === s ? ' active' : ''}`}
              style={{ textTransform: 'capitalize' }}>
              {stageInfo(s).label}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          {['all','hot','warm','cold'].map(t => (
            <button key={t} onClick={() => setTierFilter(t)} className={`filter-tab${tierFilter === t ? ' active' : ''}`}
              style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Leads list */}
      {leads.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><Home size={20} /></div>
          <p className="empty-title">No seller leads</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Add your first seller lead or adjust filters</p>
          <button onClick={() => { setSelected(null); setShowModal(true) }} className="btn-gold">Add Seller Lead</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map(lead => {
            const stage = stageInfo(lead.status)
            const tierColor = TIER_COLORS[lead.lead_tier] || 'var(--text-3)'
            const estValue = lead.estimated_value_min && lead.estimated_value_max
              ? `${fmt(lead.estimated_value_min)} – ${fmt(lead.estimated_value_max)}`
              : '—'

            return (
              <div key={lead.id} className="card" style={{ padding: isMobile ? 14 : 18, borderLeft: `3px solid ${tierColor}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>
                        {lead.first_name} {lead.last_name}
                      </p>
                      {lead.lead_tier && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                          {lead.lead_tier}
                        </span>
                      )}
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: stage.bg, color: stage.color, border: `1px solid ${stage.color}30`, textTransform: 'none' }}>
                        {stage.label}
                      </span>
                      {lead.lead_score > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Score: <strong style={{ color: 'var(--gold)' }}>{lead.lead_score}</strong></span>
                      )}
                    </div>

                    {lead.property_address && (
                      <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>
                        <MapPin size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        {lead.property_address}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      {lead.property_type && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                          {lead.property_type}{lead.bedrooms ? ` · ${lead.bedrooms} bed` : ''}{lead.bathrooms ? ` / ${lead.bathrooms} bath` : ''}{lead.square_feet ? ` · ${lead.square_feet.toLocaleString()} ft²` : ''}
                        </span>
                      )}
                      {(lead.estimated_value_min || lead.estimated_value_max) && (
                        <span style={{ fontSize: 12.5, color: 'var(--gold)', fontWeight: 600 }}>{estValue}</span>
                      )}
                      {lead.motivation && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                          {lead.motivation.replace(/_/g, ' ')}
                        </span>
                      )}
                      {lead.timeline && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)' }}>
                          <Clock size={10} /> {lead.timeline.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {/* CMA / walkthrough dates */}
                    {(lead.cma_sent_at || lead.walkthrough_scheduled_at) && (
                      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                        {lead.walkthrough_scheduled_at && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--orange)' }}>
                            <Calendar size={10} /> Walkthrough: {new Date(lead.walkthrough_scheduled_at).toLocaleDateString()}
                          </span>
                        )}
                        {lead.cma_sent_at && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)' }}>
                            <FileText size={10} /> CMA sent: {new Date(lead.cma_sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
                      {lead.email && <a href={`mailto:${lead.email}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>{lead.email}</a>}
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.profiles?.full_name && <span>· Agent: {lead.profiles.full_name}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setForm(lead); setSelected(lead); setShowModal(true) }}
                      style={{ fontSize: 12, padding: '5px 12px', background: 'rgba(201,169,110,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                      Edit
                    </button>
                    {/* Next-step quick actions */}
                    {lead.status === 'new' && (
                      <button onClick={() => updateStatus(lead.id, 'contacted')}
                        style={{ fontSize: 11.5, padding: '4px 10px', background: 'rgba(74,140,74,0.12)', color: 'var(--green)', border: '1px solid rgba(74,140,74,0.25)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                        Mark Contacted
                      </button>
                    )}
                    {lead.status === 'contacted' && (
                      <button onClick={() => updateStatus(lead.id, 'walkthrough_scheduled')}
                        style={{ fontSize: 11.5, padding: '4px 10px', background: 'var(--orange-pale)', color: 'var(--orange)', border: '1px solid var(--orange-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                        Book Walkthrough
                      </button>
                    )}
                    {lead.status === 'walkthrough_scheduled' && (
                      <button onClick={() => updateStatus(lead.id, 'walkthrough_completed')}
                        style={{ fontSize: 11.5, padding: '4px 10px', background: 'var(--purple-pale)', color: 'var(--purple)', border: '1px solid var(--purple-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                        Walkthrough Done
                      </button>
                    )}
                    {lead.status === 'walkthrough_completed' && (
                      <button onClick={() => updateStatus(lead.id, 'cma_sent')}
                        style={{ fontSize: 11.5, padding: '4px 10px', background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                        Mark CMA Sent
                      </button>
                    )}
                    {lead.status === 'cma_sent' && (
                      <button onClick={() => updateStatus(lead.id, 'listed')}
                        style={{ fontSize: 11.5, padding: '4px 10px', background: 'var(--green-pale)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                        Mark Listed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
                  {selected ? 'Edit' : 'New'} Seller Lead
                </p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selected ? `${selected.first_name} ${selected.last_name}` : 'Add Seller Lead'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Contact info */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">First Name *</label>
                  <input className="crm-input" value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div><label className="form-label">Last Name *</label>
                  <input className="crm-input" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div><label className="form-label">Email *</label>
                  <input type="email" className="crm-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div><label className="form-label">Phone</label>
                  <input className="crm-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              {/* Property details */}
              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Property Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label className="form-label">Property Address</label>
                    <input className="crm-input" value={form.property_address || ''} onChange={e => setForm({ ...form, property_address: e.target.value })} placeholder="123 Ocean Drive, West Bay, Grand Cayman" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    <div><label className="form-label">Type</label>
                      <div className="crm-select-wrap">
                        <select className="crm-select" value={form.property_type || ''} onChange={e => setForm({ ...form, property_type: e.target.value })}>
                          <option value="">Select</option>
                          {['villa','estate','penthouse','cottage','condo','land','townhouse'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><label className="form-label">Bedrooms</label>
                      <input type="number" className="crm-input" value={form.bedrooms || ''} onChange={e => setForm({ ...form, bedrooms: Number(e.target.value) })} />
                    </div>
                    <div><label className="form-label">Bathrooms</label>
                      <input type="number" step="0.5" className="crm-input" value={form.bathrooms || ''} onChange={e => setForm({ ...form, bathrooms: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label className="form-label">Condition</label>
                      <div className="crm-select-wrap">
                        <select className="crm-select" value={form.condition || 'good'} onChange={e => setForm({ ...form, condition: e.target.value })}>
                          {['excellent','good','average','needs_work'].map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><label className="form-label">Year Built</label>
                      <input type="number" className="crm-input" value={form.year_built || ''} onChange={e => setForm({ ...form, year_built: Number(e.target.value) })} placeholder="2010" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label className="form-label">Est. Value Min ($)</label>
                      <input type="number" className="crm-input" value={form.estimated_value_min || ''} onChange={e => setForm({ ...form, estimated_value_min: Number(e.target.value) })} placeholder="800000" />
                    </div>
                    <div><label className="form-label">Est. Value Max ($)</label>
                      <input type="number" className="crm-input" value={form.estimated_value_max || ''} onChange={e => setForm({ ...form, estimated_value_max: Number(e.target.value) })} placeholder="950000" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Motivation & timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Motivation</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.motivation || 'just_curious'} onChange={e => setForm({ ...form, motivation: e.target.value })}>
                      {['relocating','upgrading','downsizing','investment_liquidation','estate_inheritance','financial','just_curious','other'].map(m => (
                        <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Timeline</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.timeline || '6_plus_months'} onChange={e => setForm({ ...form, timeline: e.target.value })}>
                      {[['asap','ASAP (1–2 months)'],['3_6_months','3–6 months'],['6_plus_months','6+ months'],['if_price_right','Only if price is right']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Ownership</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.ownership_type || 'sole_owner'} onChange={e => setForm({ ...form, ownership_type: e.target.value })}>
                      {['sole_owner','joint_ownership','estate_inheritance','complicated'].map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Pipeline Stage</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status || 'new'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Scoring & assignment */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <div><label className="form-label">Lead Score (0–100)</label>
                  <input type="number" min="0" max="100" className="crm-input" value={form.lead_score || 0} onChange={e => setForm({ ...form, lead_score: Number(e.target.value) })} />
                </div>
                <div><label className="form-label">Lead Tier</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.lead_tier || 'warm'} onChange={e => setForm({ ...form, lead_tier: e.target.value })}>
                      {['hot','warm','cold','unqualified'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Assigned Agent</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.assigned_agent_id || ''} onChange={e => setForm({ ...form, assigned_agent_id: e.target.value })}>
                      <option value="">Unassigned</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Walkthrough scheduling */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Walkthrough Scheduled</label>
                  <input type="datetime-local" className="crm-input" value={form.walkthrough_scheduled_at ? form.walkthrough_scheduled_at.slice(0, 16) : ''} onChange={e => setForm({ ...form, walkthrough_scheduled_at: e.target.value })} />
                </div>
                <div><label className="form-label">Source / UTM Campaign</label>
                  <input className="crm-input" value={form.utm_campaign || form.source || ''} onChange={e => setForm({ ...form, utm_campaign: e.target.value })} placeholder="e.g. google / Seller Valuations" />
                </div>
              </div>

              <div><label className="form-label">Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Key details, seller concerns, conversation notes..." />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selected ? 'Update Lead' : 'Add Lead'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
