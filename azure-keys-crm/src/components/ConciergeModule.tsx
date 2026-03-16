'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { Plus, X, Star, Sparkles } from 'lucide-react'

interface ConciergeModuleProps { profile: any }

const ROLODEX = [
  { category: 'Legal & Financial', items: ['⚖️ Chancery Chambers — Real Estate Attorney', '💼 Lex Caribbean — Offshore Legal', '🏦 CIBC FirstCaribbean — Private Banking', '📊 Deloitte Barbados — Tax Advisory'] },
  { category: 'Property & Architecture', items: ['🏗️ Altman Group — Architects & Interior', '🔑 Island Property Management Ltd.', '🏠 Villa Management Barbados', '🔧 Paradise Maintenance Services'] },
  { category: 'Lifestyle & Concierge', items: ['🛥️ Caribbean Sailing — Yacht Charter', '🏌️ Sandy Lane Golf Club', '🎨 Sosa Interior Design Studio', '✈️ Executive Air Charter Barbados'] },
  { category: 'Tourism & Hospitality', items: ['🌊 Airbnb Superhost Network Barbados', '🍽️ Restaurant & Event Catering', '🧘 The Sanctuary — Wellness', '🎭 Crop Over Festival Concierge'] },
]

const MILESTONES = ['Pre-Closing Check-In', 'Key Handover Complete', '30-Day Check-In', '90-Day Check-In', 'Annual Property Review', 'Rental Management Setup', 'Renovation Planning', 'Re-Sale Interest']

export default function ConciergeModule({ profile }: ConciergeModuleProps) {
  const isMobile = useIsMobile()
  const [clients, setClients] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ milestone: 'Key Handover Complete' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: cl }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('concierge_records').select('*, contacts(first_name, last_name), properties(title, city)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('properties').select('id, title').order('title'),
    ])
    setClients(cl || [])
    setContacts(c || [])
    setProperties(p || [])
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (selected) {
        await supabase.from('concierge_records').update(form).eq('id', selected.id)
      } else {
        await supabase.from('concierge_records').insert({ ...form, created_by: profile?.id })
      }
      setShowModal(false)
      loadData()
    } catch {
      alert('Concierge table not set up yet. Run the SQL migration first.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Caribbean Intelligence</p>
          <h1 className="page-title">Luxury <em>Concierge</em></h1>
          <p className="page-sub">Post-sale relationship management & client lifestyle services</p>
        </div>
        <button className="btn-gold" onClick={() => { setForm({ milestone: 'Key Handover Complete' }); setSelected(null); setShowModal(true) }}>
          <Plus size={15} /> Add Service Record
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
        {/* Post-sale touchpoints */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Post-Sale Client Touchpoints</p>
          </div>
          {loading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : clients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Star size={20} /></div>
              <p className="empty-title">No post-sale records</p>
              <p className="empty-sub">Start tracking client relationships after closing</p>
            </div>
          ) : (
            <div>
              {clients.map(c => (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}
                  onClick={() => { setForm(c); setSelected(c); setShowModal(true) }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--gold)', flexShrink: 0 }}>
                    {(c.contacts?.first_name?.[0] || '') + (c.contacts?.last_name?.[0] || '')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: 13 }}>{c.contacts?.first_name} {c.contacts?.last_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.properties?.title} · {c.properties?.city}</p>
                    <span className="badge badge-gold" style={{ marginTop: 6 }}>{c.milestone}</span>
                  </div>
                  {c.next_checkin && (
                    <p style={{ fontSize: 11, color: 'var(--text-4)' }}>
                      Next: {new Date(c.next_checkin).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local Services Rolodex */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Local Services Rolodex</p>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ROLODEX.map(cat => (
              <div key={cat.category}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>{cat.category}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cat.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p className="page-label">Concierge</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>{selected ? 'Update' : 'Add'} Service Record</h2>
                </div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Client (Contact) *</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                      <option value="">Select client...</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Property</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.property_id || ''} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                      <option value="">Select property...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Current Milestone</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.milestone || ''} onChange={e => setForm({ ...form, milestone: e.target.value })}>
                      {MILESTONES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Next Check-In Date</label>
                  <input type="date" className="crm-input" value={form.next_checkin || ''} onChange={e => setForm({ ...form, next_checkin: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Closing Date</label>
                  <input type="date" className="crm-input" value={form.closing_date || ''} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Rental Mgmt Setup</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.rental_setup || ''} onChange={e => setForm({ ...form, rental_setup: e.target.value })}>
                      <option value="">Not applicable</option>
                      <option>Not started</option>
                      <option>In progress</option>
                      <option>Complete</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label className="form-label">Notes & Services Provided</label>
                <textarea className="crm-input" rows={4} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Key handover details, referrals made, client requests..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save} disabled={saving || !form.contact_id}>
                {saving ? 'Saving...' : selected ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
