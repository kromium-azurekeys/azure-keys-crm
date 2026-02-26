'use client'

import { useEffect, useState } from 'react'
import { supabase, Deal, Profile } from '@/lib/supabase'
import { Plus, X, DollarSign, User, Home } from 'lucide-react'

interface PipelineModuleProps { profile: Profile | null }

const STAGES = [
  { id: 'new_lead', label: 'New Lead', color: '#1e7ec8' },
  { id: 'qualified', label: 'Qualified', color: '#c9a84c' },
  { id: 'viewing_scheduled', label: 'Viewing Scheduled', color: '#1a4a7a' },
  { id: 'offer_made', label: 'Offer Made', color: '#c97a1e' },
  { id: 'negotiation', label: 'Negotiation', color: '#8c4a1e' },
  { id: 'under_contract', label: 'Under Contract', color: '#4a7a4a' },
  { id: 'closed_won', label: 'Closed Won', color: '#2a6a2a' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#8c2a2a' },
]

export default function PipelineModule({ profile }: PipelineModuleProps) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Deal>>({
    stage: 'new_lead', deal_type: 'buyer', priority: 'medium', probability: 20
  })
  const [saving, setSaving] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: dealsData }, { data: contactsData }, { data: propsData }] = await Promise.all([
      supabase.from('deals').select('*, contacts(first_name, last_name, email), properties(title, price), profiles!agent_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('properties').select('id, title, price').eq('status', 'active').order('title')
    ])
    setDeals(dealsData || [])
    setContacts(contactsData || [])
    setProperties(propsData || [])
    setLoading(false)
  }

  const dealsByStage = (stage: string) => deals.filter(d => d.stage === stage)

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    if (!dragging) return
    await supabase.from('deals').update({ stage }).eq('id', dragging)
    await supabase.from('activities').insert({
      type: 'stage_change',
      description: `Deal moved to ${stage.replace(/_/g, ' ')}`,
      deal_id: dragging, created_by: profile?.id
    })
    setDragging(null)
    loadData()
  }

  const saveDeal = async () => {
    setSaving(true)
    try {
      if (selectedDeal) {
        await supabase.from('deals').update(form).eq('id', selectedDeal.id)
      } else {
        const { data } = await supabase.from('deals').insert({
          ...form, agent_id: profile?.id
        }).select().single()
        if (data) {
          await supabase.from('activities').insert({
            type: 'note', description: `New deal created: ${form.title}`,
            deal_id: data.id, created_by: profile?.id
          })
        }
      }
      setShowModal(false)
      setSelectedDeal(null)
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const totalPipeline = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.expected_value || 0), 0)

  const formatCurrency = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Sales</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Deal <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Pipeline</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {deals.length} deals · Pipeline value: <span style={{ color: 'var(--gold)' }}>{formatCurrency(totalPipeline)}</span>
          </p>
        </div>
        <button onClick={() => { setForm({ stage: 'new_lead', deal_type: 'buyer', priority: 'medium', probability: 20 }); setSelectedDeal(null); setShowModal(true) }} className="btn-gold">
          <Plus size={16} /> New Deal
        </button>
      </div>

      {/* Kanban board - horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 600 }}>
        {STAGES.map(({ id, label, color }) => {
          const stageDeals = dealsByStage(id)
          const stageValue = stageDeals.reduce((s, d) => s + (d.expected_value || 0), 0)
          return (
            <div
              key={id}
              className="flex-shrink-0 flex flex-col"
              style={{ width: 260 }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, id)}
            >
              {/* Column header */}
              <div className="p-3 mb-3 border-l-2" style={{
                background: `${color}10`, border: `1px solid ${color}30`,
                borderLeftColor: color
              }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs tracking-wider uppercase font-medium" style={{ color, fontSize: '0.7rem' }}>{label}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                    {stageDeals.length}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(248,245,240,0.4)' }}>{stageValue > 0 ? formatCurrency(stageValue) : '—'}</p>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-3 flex-1">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragging(deal.id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => { setForm(deal); setSelectedDeal(deal); setShowModal(true) }}
                    className="crm-card p-4 cursor-grab active:cursor-grabbing hover:border-gold transition-all"
                    style={{ opacity: dragging === deal.id ? 0.5 : 1 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--white)', lineHeight: 1.3 }}>{deal.title}</p>
                      <span className="text-xs ml-2 flex-shrink-0 px-1.5 py-0.5" style={{
                        background: deal.priority === 'urgent' ? 'rgba(200,60,60,0.2)' : 'rgba(201,168,76,0.1)',
                        color: deal.priority === 'urgent' ? '#ff6b6b' : 'var(--gold)',
                        border: `1px solid ${deal.priority === 'urgent' ? 'rgba(200,60,60,0.3)' : 'rgba(201,168,76,0.2)'}`,
                        fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase'
                      }}>
                        {deal.priority}
                      </span>
                    </div>

                    {(deal as any).contacts && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <User size={11} style={{ color: 'var(--muted)' }} />
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {(deal as any).contacts.first_name} {(deal as any).contacts.last_name}
                        </p>
                      </div>
                    )}
                    {(deal as any).properties && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <Home size={11} style={{ color: 'var(--muted)' }} />
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{(deal as any).properties.title}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--gold)' }}>
                        {deal.expected_value ? formatCurrency(deal.expected_value) : '—'}
                      </p>
                      <div className="flex items-center gap-1">
                        <div className="h-1 rounded-full" style={{ width: 30, background: 'rgba(255,255,255,0.1)' }}>
                          <div className="h-full rounded-full" style={{ width: `${deal.probability}%`, background: 'var(--gold)' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(248,245,240,0.3)', fontSize: '0.6rem' }}>{deal.probability}%</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add card placeholder */}
                <button
                  onClick={() => { setForm({ stage: id, deal_type: 'buyer', priority: 'medium', probability: 20 }); setSelectedDeal(null); setShowModal(true) }}
                  className="w-full p-3 text-xs tracking-wider uppercase border border-dashed transition-all"
                  style={{ color: 'rgba(248,245,240,0.15)', borderColor: 'rgba(255,255,255,0.06)', background: 'none', cursor: 'pointer' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                >
                  + Add Deal
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Deal modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="crm-card overflow-y-auto" style={{ width: '90%', maxWidth: 600, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedDeal ? 'Edit' : 'New'} Deal</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ color: 'var(--white)' }}>
                  {selectedDeal ? selectedDeal.title : 'Create Deal'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Deal Title *</label>
                <input className="crm-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Smith Family - Ocean Crest Villa" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Contact</label>
                  <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({...form, contact_id: e.target.value})}>
                    <option value="">Select contact</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Property</label>
                  <select className="crm-select" value={form.property_id || ''} onChange={e => setForm({...form, property_id: e.target.value})}>
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Stage</label>
                  <select className="crm-select" value={form.stage || 'new_lead'} onChange={e => setForm({...form, stage: e.target.value})}>
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Type</label>
                  <select className="crm-select" value={form.deal_type || 'buyer'} onChange={e => setForm({...form, deal_type: e.target.value})}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                    <option value="rental">Rental</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Priority</label>
                  <select className="crm-select" value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Expected Value ($)</label>
                  <input type="number" className="crm-input" value={form.expected_value || ''} onChange={e => setForm({...form, expected_value: Number(e.target.value)})} placeholder="2500000" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Probability (%)</label>
                  <input type="number" min="0" max="100" className="crm-input" value={form.probability || 20} onChange={e => setForm({...form, probability: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Expected Close Date</label>
                  <input type="date" className="crm-input" value={form.expected_close_date || ''} onChange={e => setForm({...form, expected_close_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Commission ($)</label>
                  <input type="number" className="crm-input" value={form.commission_amount || ''} onChange={e => setForm({...form, commission_amount: Number(e.target.value)})} placeholder="75000" />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Deal notes..." />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveDeal} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedDeal ? 'Update Deal' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
