'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Eye, Star, Calendar, Camera, Video, Calculator, Heart, Plus, X, TrendingUp } from 'lucide-react'
import Modal from '@/components/Modal'

interface PropertyInterestProps { profile: Profile | null }

const INTEREST_COLORS: Record<string, string> = {
  high: 'var(--green)', medium: 'var(--gold)', low: 'var(--text-3)', not_interested: 'var(--red)'
}

export default function PropertyInterestModule({ profile }: PropertyInterestProps) {
  const isMobile = useIsMobile()
  const [interests, setInterests] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState<any>({ interest_level: 'medium' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('property_interests')
      .select('*, contacts(first_name, last_name, email, lead_score, lead_tier), properties(title, city, island, price, property_type)')
      .order('viewed_at', { ascending: false })
    if (filter !== 'all') q = q.eq('interest_level', filter)
    const { data } = await q.limit(100)
    setInterests(data || [])

    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, email').order('first_name').limit(200),
      supabase.from('properties').select('id, title, city, island').eq('status', 'active').order('title').limit(200),
    ])
    setContacts(c || [])
    setProperties(p || [])
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, viewed_at: form.viewed_at || new Date().toISOString() }
      if (selected) {
        await supabase.from('property_interests').update(payload).eq('id', selected.id)
      } else {
        await supabase.from('property_interests').upsert(payload, { onConflict: 'contact_id,property_id' })
      }
      setShowModal(false); load()
    } finally { setSaving(false) }
  }

  const fmt = (n: number) =>
    n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`

  // Property-level aggregation for "top listings" view
  const byProperty: Record<string, any> = {}
  interests.forEach(i => {
    const pid = i.property_id
    if (!byProperty[pid]) byProperty[pid] = { property: i.properties, views: 0, high: 0, medium: 0, requesting: 0 }
    byProperty[pid].views++
    if (i.interest_level === 'high') byProperty[pid].high++
    if (i.interest_level === 'medium') byProperty[pid].medium++
    if (i.requested_viewing) byProperty[pid].requesting++
  })
  const topProperties = Object.values(byProperty).sort((a: any, b: any) => b.high - a.high || b.views - a.views).slice(0, 6)

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
          <p className="page-label">Buyer Engagement</p>
          <h1 className="page-title">Property <em>Interests</em></h1>
          <p className="page-sub">{interests.length} interactions · {interests.filter(i => i.interest_level === 'high').length} high interest · {interests.filter(i => i.requested_viewing).length} viewing requests</p>
        </div>
        <button onClick={() => { setForm({ interest_level: 'medium' }); setSelected(null); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={15} /> Log Interest
        </button>
      </div>

      {/* Top properties by engagement */}
      {topProperties.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Most Engaged Listings</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
            {topProperties.map((bp: any, i) => (
              <div key={i} className="card" style={{ padding: '14px 16px', borderLeft: '2px solid var(--gold)' }}>
                <p style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)', marginBottom: 4 }}>{bp.property?.title || 'Property'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>{bp.property?.city || bp.property?.island || ''}{bp.property?.price ? ` · ${fmt(bp.property.price)}` : ''}</p>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}><strong style={{ color: 'var(--text)' }}>{bp.views}</strong> views</span>
                  <span style={{ fontSize: 12, color: 'var(--green)' }}><strong>{bp.high}</strong> high interest</span>
                  {bp.requesting > 0 && <span style={{ fontSize: 12, color: 'var(--gold)' }}><strong>{bp.requesting}</strong> requesting viewing</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {['all', 'high', 'medium', 'low', 'not_interested'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`} style={{ textTransform: 'capitalize' }}>
            {f === 'not_interested' ? 'Not Interested' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Interests table */}
      {interests.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><Eye size={20} /></div>
          <p className="empty-title">No interest records</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Log buyer engagement against listings to track who's seriously interested in what</p>
          <button onClick={() => { setForm({ interest_level: 'medium' }); setSelected(null); setShowModal(true) }} className="btn-gold">Log First Interest</button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Property</th>
                  <th>Interest</th>
                  <th>Engagement</th>
                  <th>Viewed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {interests.map(i => {
                  const iColor = INTEREST_COLORS[i.interest_level] || 'var(--text-3)'
                  const engagementIcons = [
                    { active: i.viewed_photos,       icon: Camera,     label: 'Photos' },
                    { active: i.viewed_virtual_tour, icon: Video,      label: 'Tour' },
                    { active: i.used_calculator,     icon: Calculator, label: 'Calc' },
                    { active: i.saved_to_favourites, icon: Heart,      label: 'Saved' },
                    { active: i.requested_viewing,   icon: Calendar,   label: 'Viewing' },
                    { active: i.viewed_in_person,    icon: Eye,        label: 'Seen' },
                  ]
                  return (
                    <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => { setForm(i); setSelected(i); setShowModal(true) }}>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text)' }}>{i.contacts?.first_name} {i.contacts?.last_name}</p>
                        {i.contacts?.email && <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{i.contacts.email}</p>}
                        {i.contacts?.lead_score > 0 && <p style={{ fontSize: 10, color: 'var(--gold)' }}>Score {i.contacts.lead_score}</p>}
                      </td>
                      <td>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{i.properties?.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{i.properties?.city || i.properties?.island}</p>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 3, background: `${iColor}15`, color: iColor, border: `1px solid ${iColor}30`, textTransform: 'capitalize', fontWeight: 600 }}>
                          {i.interest_level.replace(/_/g, ' ')}
                        </span>
                        {i.time_on_page_secs > 0 && <p style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3 }}>{Math.floor(i.time_on_page_secs / 60)}m {i.time_on_page_secs % 60}s on page</p>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {engagementIcons.map(({ active, icon: Icon, label }) => (
                            active ? (
                              <span key={label} title={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--gold-pale)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
                                <Icon size={9} /> {label}
                              </span>
                            ) : null
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(i.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td>
                        {i.feedback_notes ? (
                          <span style={{ fontSize: 11, color: 'var(--text-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', maxWidth: 180 }}>
                            {i.feedback_notes}
                          </span>
                        ) : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
                  {selected ? 'Edit' : 'Log'} Property Interest
                </p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  Buyer Engagement Record
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Buyer *</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                      <option value="">Select buyer</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Property *</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.property_id || ''} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                      <option value="">Select property</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">Interest Level</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.interest_level || 'medium'} onChange={e => setForm({ ...form, interest_level: e.target.value })}>
                      {['high','medium','low','not_interested'].map(l => <option key={l} value={l}>{l.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Time on Page (secs)</label>
                  <input type="number" className="crm-input" value={form.time_on_page_secs || ''} onChange={e => setForm({ ...form, time_on_page_secs: Number(e.target.value) })} placeholder="180" />
                </div>
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: 10 }}>Engagement Signals</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { key: 'viewed_photos', label: 'Viewed Photos' },
                    { key: 'viewed_virtual_tour', label: 'Virtual Tour' },
                    { key: 'used_calculator', label: 'Used Calculator' },
                    { key: 'saved_to_favourites', label: 'Saved/Favourited' },
                    { key: 'requested_viewing', label: 'Requested Viewing' },
                    { key: 'viewed_in_person', label: 'Viewed In Person' },
                  ].map(({ key, label }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })}
                        style={{ accentColor: 'var(--gold)', width: 14, height: 14 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div><label className="form-label">Feedback / Notes</label>
                <textarea className="crm-input" rows={3} value={form.feedback_notes || ''} onChange={e => setForm({ ...form, feedback_notes: e.target.value })} placeholder="Client's comments after viewing, things they loved/didn't love..." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selected ? 'Update' : 'Log Interest'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
