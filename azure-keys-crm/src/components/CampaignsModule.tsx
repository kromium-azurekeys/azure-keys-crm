'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, Mail, MessageSquare, Zap, Send, BarChart2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/Modal'

interface CampaignsModuleProps { profile: Profile | null }

const TYPE_ICONS: Record<string, any> = { email: Mail, sms: MessageSquare, drip: Zap, newsletter: Send }
const STATUS_COLORS: Record<string, string> = {
  draft: '#888', scheduled: '#c9a96e', active: '#4a8c4a', paused: '#c9a84c', completed: '#6a4a8c'
}

export default function CampaignsModule({ profile }: CampaignsModuleProps) {
  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [form, setForm] = useState<any>({ type: 'email', status: 'draft' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data } = await supabase.from('campaigns').select('*, profiles!created_by(full_name)').order('created_at', { ascending: false })
    setCampaigns(data || [])
    setLoading(false)
  }

  const saveCampaign = async () => {
    setSaving(true)
    try {
      if (selectedCampaign) {
        await supabase.from('campaigns').update(form).eq('id', selectedCampaign.id)
      } else {
        await supabase.from('campaigns').insert({ ...form, created_by: profile?.id })
      }
      setShowModal(false)
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('campaigns').update({ status }).eq('id', id)
    loadData()
  }

  return (
    <div className="animate-fade-up" style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Marketing</p>
          <h1 className="page-title">Campaign <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Automation</em></h1>
          <p className="page-sub">{campaigns.length} campaigns</p>
        </div>
        <button onClick={() => { setForm({ type: 'email', status: 'draft' }); setSelectedCampaign(null); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={16} /> {isMobile ? 'New' : 'New Campaign'}
        </button>
      </div>

      {/* Stats overview */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 32 }}>
        {[
          { label: 'Total Campaigns', value: campaigns.length, color: 'var(--gold)' },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: '#4a8c4a' },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, color: 'var(--gold)' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: '#6a4a8c' },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card">
            <p className="serif text-3xl font-light mb-1" style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', fontWeight: 300, color }}>{value}</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : campaigns.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><Mail size={20} /></div>
          <p className="empty-title">No campaigns yet</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Create your first campaign to start reaching clients</p>
          <button onClick={() => { setForm({ type: 'email', status: 'draft' }); setSelectedCampaign(null); setShowModal(true) }} className="btn-gold">Create First Campaign</button>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
          {campaigns.map(c => {
            const Icon = TYPE_ICONS[c.type] || Mail
            const sColor = STATUS_COLORS[c.status] || '#888'
            return (
              <div key={c.id} className="card" style={{ padding: isMobile ? 14 : 20, cursor:"pointer" }} onClick={() => { setForm(c); setSelectedCampaign(c); setShowModal(true) }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <Icon size={16} style={{ color: 'var(--gold)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 500 }}>{c.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{c.type} campaign</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 capitalize" style={{
                    background: `${sColor}15`, color: sColor,
                    border: `1px solid ${sColor}30`, fontSize: '0.65rem', letterSpacing: '0.08em'
                  }}>
                    {c.status}
                  </span>
                </div>

                {c.subject && (
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-3)' }}>Subject: {c.subject}</p>
                )}

                {/* Stats */}
                <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 8, marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {[
                    { label: 'Sent', value: c.stats?.sent || 0 },
                    { label: 'Opened', value: c.stats?.opened || 0 },
                    { label: 'Clicked', value: c.stats?.clicked || 0 },
                    { label: 'Unsub', value: c.stats?.unsubscribed || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500 }}>{value}</p>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {c.scheduled_at ? `Scheduled: ${new Date(c.scheduled_at).toLocaleDateString()}` : `Created: ${new Date(c.created_at).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    {c.status === 'draft' && (
                      <button onClick={() => updateStatus(c.id, 'active')} className="text-xs px-2 py-1" style={{ background: 'rgba(74,140,74,0.15)', color: '#4a8c4a', border: '1px solid rgba(74,140,74,0.2)', cursor: 'pointer' }}>Launch</button>
                    )}
                    {c.status === 'active' && (
                      <button onClick={() => updateStatus(c.id, 'paused')} className="text-xs px-2 py-1" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer' }}>Pause</button>
                    )}
                    {c.status === 'paused' && (
                      <button onClick={() => updateStatus(c.id, 'active')} className="text-xs px-2 py-1" style={{ background: 'rgba(74,140,74,0.15)', color: '#4a8c4a', border: '1px solid rgba(74,140,74,0.2)', cursor: 'pointer' }}>Resume</button>
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
          <div className="modal" style={{ width: "90%", maxWidth: 640, display: "flex", flexDirection: "column" }}>
            <div className="modal-header" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedCampaign ? 'Edit' : 'New'} Campaign</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>{selectedCampaign ? selectedCampaign.name : 'Create Campaign'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Campaign Name *</label>
                <input className="crm-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Q1 Luxury Buyers Drip" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Type</label>
                  <select className="crm-select" value={form.type || 'email'} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="drip">Drip Sequence</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Status</label>
                  <select className="crm-select" value={form.status || 'draft'} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Subject Line</label>
                <input className="crm-input" value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Your exceptional Caribbean home awaits..." />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Campaign Content</label>
                <textarea className="crm-input" rows={6} value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write your campaign message here..." />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Scheduled Date/Time</label>
                <input type="datetime-local" className="crm-input" value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ''} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
              </div>
            </div>

            <div className="modal-footer" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveCampaign} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
