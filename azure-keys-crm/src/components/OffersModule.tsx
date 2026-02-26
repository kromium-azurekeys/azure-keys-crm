'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, DollarSign, FileText, CheckCircle, XCircle } from 'lucide-react'

interface OffersModuleProps { profile: Profile | null }

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'rgba(136,136,136,0.1)', color: '#888' },
  submitted: { bg: 'rgba(30,126,200,0.1)', color: '#1e7ec8' },
  countered: { bg: 'rgba(201,168,76,0.1)', color: '#c9a84c' },
  accepted: { bg: 'rgba(74,140,74,0.15)', color: '#4a8c4a' },
  rejected: { bg: 'rgba(200,60,60,0.1)', color: '#ff6b6b' },
  withdrawn: { bg: 'rgba(140,74,30,0.1)', color: '#c97a1e' },
  expired: { bg: 'rgba(106,74,140,0.1)', color: '#9a7ac8' },
}

export default function OffersModule({ profile }: OffersModuleProps) {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [form, setForm] = useState<any>({ status: 'draft' })
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: o }, { data: c }, { data: p }, { data: d }] = await Promise.all([
      supabase.from('offers').select('*, properties(title, price), contacts!buyer_contact_id(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('properties').select('id, title, price').order('title'),
      supabase.from('deals').select('id, title').order('created_at', { ascending: false })
    ])
    setOffers(o || [])
    setContacts(c || [])
    setProperties(p || [])
    setDeals(d || [])
    setLoading(false)
  }

  const saveOffer = async () => {
    setSaving(true)
    try {
      if (selectedOffer) {
        await supabase.from('offers').update(form).eq('id', selectedOffer.id)
      } else {
        await supabase.from('offers').insert(form)
      }
      setShowModal(false)
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('offers').update({ status }).eq('id', id)
    await supabase.from('activities').insert({
      type: 'offer', description: `Offer status updated to: ${status}`, created_by: profile?.id
    })
    loadData()
  }

  const formatCurrency = (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(2)}M` : `$${(v/1000).toFixed(0)}K`

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Transactions</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Offer <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Tracking</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{offers.length} offers tracked</p>
        </div>
        <button onClick={() => { setForm({ status: 'draft', offer_date: new Date().toISOString().split('T')[0] }); setSelectedOffer(null); setShowModal(true) }} className="btn-gold">
          <Plus size={16} /> Record Offer
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : offers.length === 0 ? (
        <div className="crm-card p-16 text-center">
          <FileText size={32} style={{ color: 'rgba(248,245,240,0.15)', margin: '0 auto 12px' }} />
          <p className="serif text-2xl font-light mb-3" style={{ color: 'var(--muted)' }}>No offers recorded</p>
          <button onClick={() => { setForm({ status: 'draft', offer_date: new Date().toISOString().split('T')[0] }); setSelectedOffer(null); setShowModal(true) }} className="btn-gold">Record First Offer</button>
        </div>
      ) : (
        <div className="crm-card overflow-hidden">
          <table className="w-full crm-table">
            <thead>
              <tr>
                <th className="text-left">Property</th>
                <th className="text-left">Buyer</th>
                <th className="text-left">Offer Amount</th>
                <th className="text-left">Counter</th>
                <th className="text-left">Status</th>
                <th className="text-left">Offer Date</th>
                <th className="text-left">Closing Date</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => {
                const s = STATUS_COLORS[o.status] || STATUS_COLORS.draft
                return (
                  <tr key={o.id}>
                    <td>
                      <p style={{ color: 'var(--white)' }}>{o.properties?.title || '—'}</p>
                      {o.properties?.price && (
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>Listed: {formatCurrency(o.properties.price)}</p>
                      )}
                    </td>
                    <td>
                      <p style={{ color: 'var(--white)' }}>{o.contacts?.first_name} {o.contacts?.last_name}</p>
                    </td>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--gold)' }}>{formatCurrency(o.offer_amount)}</p>
                      {o.properties?.price && (
                        <p className="text-xs" style={{ color: o.offer_amount >= o.properties.price ? '#4a8c4a' : '#ff6b6b' }}>
                          {((o.offer_amount / o.properties.price - 1) * 100).toFixed(1)}% of list
                        </p>
                      )}
                    </td>
                    <td>
                      <p style={{ color: 'var(--white)' }}>{o.counter_amount ? formatCurrency(o.counter_amount) : '—'}</p>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-1 capitalize" style={{
                        background: s.bg, color: s.color,
                        border: `1px solid ${s.color}40`, fontSize: '0.65rem', letterSpacing: '0.08em'
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td><p className="text-xs" style={{ color: 'var(--muted)' }}>{o.offer_date || '—'}</p></td>
                    <td><p className="text-xs" style={{ color: 'var(--muted)' }}>{o.closing_date || '—'}</p></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setForm(o); setSelectedOffer(o); setShowModal(true) }} className="text-xs px-2 py-1" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.15)', cursor: 'pointer' }}>Edit</button>
                        {o.status === 'submitted' && (
                          <>
                            <button onClick={() => updateStatus(o.id, 'accepted')} className="text-xs px-2 py-1" style={{ background: 'rgba(74,140,74,0.15)', color: '#4a8c4a', border: '1px solid rgba(74,140,74,0.2)', cursor: 'pointer' }}>Accept</button>
                            <button onClick={() => updateStatus(o.id, 'rejected')} className="text-xs px-2 py-1" style={{ background: 'rgba(200,60,60,0.1)', color: '#ff6b6b', border: '1px solid rgba(200,60,60,0.2)', cursor: 'pointer' }}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="crm-card overflow-y-auto" style={{ width: '90%', maxWidth: 600, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedOffer ? 'Edit' : 'Record'} Offer</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ color: 'var(--white)' }}>{selectedOffer ? 'Update Offer' : 'New Offer'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Property *</label>
                  <select className="crm-select" value={form.property_id || ''} onChange={e => setForm({...form, property_id: e.target.value})}>
                    <option value="">Select property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Buyer *</label>
                  <select className="crm-select" value={form.buyer_contact_id || ''} onChange={e => setForm({...form, buyer_contact_id: e.target.value})}>
                    <option value="">Select buyer</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Offer Amount ($) *</label>
                  <input type="number" className="crm-input" value={form.offer_amount || ''} onChange={e => setForm({...form, offer_amount: Number(e.target.value)})} placeholder="2000000" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Deposit ($)</label>
                  <input type="number" className="crm-input" value={form.deposit_amount || ''} onChange={e => setForm({...form, deposit_amount: Number(e.target.value)})} placeholder="200000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Counter Amount ($)</label>
                  <input type="number" className="crm-input" value={form.counter_amount || ''} onChange={e => setForm({...form, counter_amount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Status</label>
                  <select className="crm-select" value={form.status || 'draft'} onChange={e => setForm({...form, status: e.target.value})}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Offer Date</label>
                  <input type="date" className="crm-input" value={form.offer_date || ''} onChange={e => setForm({...form, offer_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Expiry Date</label>
                  <input type="date" className="crm-input" value={form.expiry_date || ''} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Closing Date</label>
                  <input type="date" className="crm-input" value={form.closing_date || ''} onChange={e => setForm({...form, closing_date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Conditions / Contingencies</label>
                <textarea className="crm-input" rows={3} value={form.conditions || ''} onChange={e => setForm({...form, conditions: e.target.value})} placeholder="Subject to financing, home inspection, etc." />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea className="crm-input" rows={2} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveOffer} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedOffer ? 'Update Offer' : 'Record Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
