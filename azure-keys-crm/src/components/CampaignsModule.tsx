'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, Mail, MessageSquare, Zap, Send, BarChart2 } from 'lucide-react'

interface CampaignsModuleProps { profile: Profile | null }

const TYPE_ICONS: Record<string, any> = { email: Mail, sms: MessageSquare, drip: Zap, newsletter: Send }
const STATUS_COLORS: Record<string, string> = {
  draft: '#888', scheduled: '#1e7ec8', active: '#4a8c4a', paused: '#c9a84c', completed: '#6a4a8c'
}

export default function CampaignsModule({ profile }: CampaignsModuleProps) {
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
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Marketing</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Campaign <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Automation</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{campaigns.length} campaigns</p>
        </div>
        <button onClick={() => { setForm({ type: 'email', status: 'draft' }); setSelectedCampaign(null); setShowModal(true) }} className="btn-gold">
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Campaigns', value: campaigns.length, color: 'var(--gold)' },
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: '#4a8c4a' },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, color: '#1e7ec8' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: '#6a4a8c' },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card">
            <p className="serif text-3xl font-light mb-1" style={{ color }}>{value}</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : campaigns.length === 0 ? (
        <div className="crm-card p-16 text-center">
          <Mail size={32} style={{ color: 'rgba(248,245,240,0.15)', margin: '0 auto 12px' }} />
          <p className="serif text-2xl font-light mb-3" style={{ color: 'var(--muted)' }}>No campaigns yet</p>
          <button onClick={() => { setForm({ type: 'email', status: 'draft' }); setSelectedCampaign(null); setShowModal(true) }} className="btn-gold">Create First Campaign</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {campaigns.map(c => {
            const Icon = TYPE_ICONS[c.type] || Mail
            const sColor = STATUS_COLORS[c.status] || '#888'
            return (
              <div key={c.id} className="crm-card p-5 cursor-pointer" onClick={() => { setForm(c); setSelectedCampaign(c); setShowModal(true) }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <Icon size={16} style={{ color: 'var(--gold)' }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--white)' }}>{c.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{c.type} campaign</p>
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
                  <p className="text-xs mb-3 truncate" style={{ color: 'var(--muted)' }}>Subject: {c.subject}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 mb-3 p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {[
                    { label: 'Sent', value: c.stats?.sent || 0 },
                    { label: 'Opened', value: c.stats?.opened || 0 },
                    { label: 'Clicked', value: c.stats?.clicked || 0 },
                    { label: 'Unsub', value: c.stats?.unsubscribed || 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-sm font-medium" style={{ color: 'var(--white)' }}>{value}</p>
                      <p style={{ color: 'var(--muted)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="crm-card overflow-y-auto" style={{ width: '90%', maxWidth: 640, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedCampaign ? 'Edit' : 'New'} Campaign</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ color: 'var(--white)' }}>{selectedCampaign ? selectedCampaign.name : 'Create Campaign'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Campaign Name *</label>
                <input className="crm-input" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Q1 Luxury Buyers Drip" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Type</label>
                  <select className="crm-select" value={form.type || 'email'} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="drip">Drip Sequence</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Status</label>
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
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Subject Line</label>
                <input className="crm-input" value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Your exceptional Caribbean home awaits..." />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Campaign Content</label>
                <textarea className="crm-input" rows={6} value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write your campaign message here..." />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Scheduled Date/Time</label>
                <input type="datetime-local" className="crm-input" value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ''} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveCampaign} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedCampaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
