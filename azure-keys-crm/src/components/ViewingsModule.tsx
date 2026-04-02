'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, Calendar, Clock, Star, MapPin, Video, User, CheckCircle } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/Modal'

interface ViewingsModuleProps { profile: Profile | null }

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#c9a96e', confirmed: '#4a8c4a', completed: '#6a4a8c',
  cancelled: '#8c4a4a', no_show: '#c97a1e'
}

export default function ViewingsModule({ profile }: ViewingsModuleProps) {
  const isMobile = useIsMobile()
  const [viewings, setViewings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedViewing, setSelectedViewing] = useState<any>(null)
  const [form, setForm] = useState<any>({ status: 'scheduled', location_type: 'in_person', duration_minutes: 60 })
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => { loadData() }, [filter])

  const loadData = async () => {
    setLoading(true)
    const [{ data: v }, { data: c }, { data: p }, { data: a }] = await Promise.all([
      (() => {
        let q = supabase.from('viewings')
          .select('*, properties(title, address, city), contacts(first_name, last_name, phone), profiles!agent_id(full_name)')
          .order('scheduled_at', { ascending: true })
        if (filter === 'upcoming') q = q.gte('scheduled_at', new Date().toISOString())
        else if (filter === 'past') q = q.lt('scheduled_at', new Date().toISOString())
        return q.limit(100)
      })(),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('properties').select('id, title').eq('status', 'active').order('title'),
      supabase.from('profiles').select('id, full_name').order('full_name')
    ])
    setViewings(v || [])
    setContacts(c || [])
    setProperties(p || [])
    setAgents(a || [])
    setLoading(false)
  }

  const saveViewing = async () => {
    setSaving(true)
    try {
      if (selectedViewing) {
        await supabase.from('viewings').update(form).eq('id', selectedViewing.id)
      } else {
        const { data } = await supabase.from('viewings')
          .insert({ ...form, agent_id: form.agent_id || profile?.id })
          .select().single()
        if (data) {
          await supabase.from('activities').insert({
            type: 'viewing', description: `Viewing scheduled for property`,
            contact_id: form.contact_id, created_by: profile?.id
          })
        }
      }
      setShowModal(false)
      loadData()
    } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('viewings').update({ status }).eq('id', id)
    loadData()
  }

  const p = isMobile ? '16px' : '28px 32px'

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Scheduling</p>
          <h1 className="page-title">Property <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Viewings</em></h1>
          <p className="page-sub">{viewings.length} viewings</p>
        </div>
        <button
          onClick={() => { setForm({ status: 'scheduled', location_type: 'in_person', duration_minutes: 60 }); setSelectedViewing(null); setShowModal(true) }}
          className="btn-gold" style={{ flexShrink: 0 }}
        >
          <Plus size={16} /> {isMobile ? 'Schedule' : 'Schedule Viewing'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: isMobile ? 16 : 20 }}>
        {['upcoming', 'past', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : viewings.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><Calendar size={20} /></div>
          <p className="empty-title">No viewings {filter}</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Schedule your first property viewing to get started</p>
          <button
            onClick={() => { setForm({ status: 'scheduled', location_type: 'in_person', duration_minutes: 60 }); setSelectedViewing(null); setShowModal(true) }}
            className="btn-gold"
          >
            Schedule First Viewing
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 16 }}>
          {viewings.map(v => {
            const statusColor = STATUS_COLORS[v.status] || '#888'
            const isVirtual = v.location_type === 'virtual'
            return (
              <div
                key={v.id}
                className="card"
                style={{ padding: isMobile ? 14 : 18, cursor: 'pointer', borderTop: `2px solid ${statusColor}` }}
                onClick={() => { setForm(v); setSelectedViewing(v); setShowModal(true) }}
              >
                {/* Row 1: property + status badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: '1.05rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1.25, marginBottom: 3 }}>
                      {v.properties?.title || 'Property'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {v.properties?.city ? `${v.properties.city} · ` : ''}
                      {v.contacts?.first_name} {v.contacts?.last_name}
                    </p>
                  </div>
                  <span style={{
                    background: `${statusColor}18`, color: statusColor,
                    border: `1px solid ${statusColor}35`,
                    fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'capitalize',
                    padding: '3px 8px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {v.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Row 2: date/time/duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text)' }}>
                    <Calendar size={12} style={{ color: 'var(--gold)' }} />
                    {new Date(v.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text)' }}>
                    <Clock size={12} style={{ color: 'var(--gold)' }} />
                    {new Date(v.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.duration_minutes}min</span>
                  {isVirtual && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                      <Video size={11} /> Virtual
                    </span>
                  )}
                </div>

                {/* Row 3: agent + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                    <User size={11} /> {v.profiles?.full_name || 'TBD'}
                  </span>

                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    {v.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => updateStatus(v.id, 'confirmed')}
                          style={{ background: 'rgba(74,140,74,0.12)', color: '#4a8c4a', border: '1px solid rgba(74,140,74,0.25)', cursor: 'pointer', fontSize: 11.5, padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--sans)' }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(v.id, 'cancelled')}
                          style={{ background: 'rgba(200,60,60,0.08)', color: '#ff6b6b', border: '1px solid rgba(200,60,60,0.2)', cursor: 'pointer', fontSize: 11.5, padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--sans)' }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {v.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(v.id, 'completed')}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(106,74,140,0.12)', color: '#9a7ac8', border: '1px solid rgba(106,74,140,0.25)', cursor: 'pointer', fontSize: 11.5, padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--sans)' }}
                      >
                        <CheckCircle size={11} /> Complete
                      </button>
                    )}
                    {v.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {Array.from({ length: v.rating }).map((_, i) => (
                          <Star key={i} size={10} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
                        ))}
                      </div>
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
                  {selectedViewing ? 'Edit' : 'Schedule'} Viewing
                </p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selectedViewing ? 'Update Viewing' : 'New Viewing'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Property *</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.property_id || ''} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                      <option value="">Select property</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Contact *</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                      <option value="">Select contact</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Date & Time *</label>
                  <input type="datetime-local" className="crm-input" value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ''} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Duration (minutes)</label>
                  <input type="number" className="crm-input" value={form.duration_minutes || 60} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status || 'scheduled'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.location_type || 'in_person'} onChange={e => setForm({ ...form, location_type: e.target.value })}>
                      <option value="in_person">In Person</option>
                      <option value="virtual">Virtual</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Agent</label>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={form.agent_id || ''} onChange={e => setForm({ ...form, agent_id: e.target.value })}>
                    <option value="">Select agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>
              {form.location_type === 'virtual' && (
                <div>
                  <label className="form-label">Virtual Meeting Link</label>
                  <input className="crm-input" value={form.virtual_link || ''} onChange={e => setForm({ ...form, virtual_link: e.target.value })} placeholder="https://meet.google.com/..." />
                </div>
              )}
              {selectedViewing && (
                <>
                  <div>
                    <label className="form-label">Client Feedback</label>
                    <textarea className="crm-input" rows={2} value={form.feedback || ''} onChange={e => setForm({ ...form, feedback: e.target.value })} placeholder="Client feedback after viewing..." />
                  </div>
                  <div>
                    <label className="form-label">Rating (1–5)</label>
                    <input type="number" min="1" max="5" className="crm-input" value={form.rating || ''} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} />
                  </div>
                </>
              )}
              <div>
                <label className="form-label">Notes</label>
                <textarea className="crm-input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveViewing} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedViewing ? 'Update' : 'Schedule Viewing'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
