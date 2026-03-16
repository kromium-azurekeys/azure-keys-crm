'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, FileText } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface OffersModuleProps { profile: Profile | null }

const STATUS_COLORS: Record<string, { bg: string; color: string; badge: string }> = {
  draft: { bg: 'rgba(136,136,136,0.1)', color: '#888', badge: 'badge-gray' },
  submitted: { bg: 'rgba(30,126,200,0.1)', color: '#1e7ec8', badge: 'badge-blue' },
  countered: { bg: 'rgba(201,168,76,0.1)', color: '#c9a84c', badge: 'badge-gold' },
  accepted: { bg: 'rgba(74,140,74,0.15)', color: '#4a8c4a', badge: 'badge-green' },
  rejected: { bg: 'rgba(200,60,60,0.1)', color: '#ff6b6b', badge: 'badge-red' },
  withdrawn: { bg: 'rgba(140,74,30,0.1)', color: '#c97a1e', badge: 'badge-orange' },
  expired: { bg: 'rgba(106,74,140,0.1)', color: '#9a7ac8', badge: 'badge-purple' },
}

export default function OffersModule({ profile }: OffersModuleProps) {
  const isMobile = useIsMobile()
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [form, setForm] = useState<any>({ status: 'draft' })
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: o }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('offers').select('*, properties(title, price), contacts!buyer_contact_id(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('properties').select('id, title, price').order('title'),
    ])
    setOffers(o || []); setContacts(c || []); setProperties(p || [])
    setLoading(false)
  }

  const saveOffer = async () => {
    setSaving(true)
    try {
      if (selectedOffer) await supabase.from('offers').update(form).eq('id', selectedOffer.id)
      else await supabase.from('offers').insert(form)
      setShowModal(false); loadData()
    } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('offers').update({ status }).eq('id', id)
    await supabase.from('activities').insert({ type: 'offer', description: `Offer status updated to: ${status}`, created_by: profile?.id })
    loadData()
  }

  const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}K`
  const p = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      <div style={{ padding: p, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Transactions</p>
          <h1 className="page-title">Offer <em>Tracking</em></h1>
          <p className="page-sub">{offers.length} offers tracked</p>
        </div>
        <button className="btn-gold" onClick={() => { setForm({ status: 'draft', offer_date: new Date().toISOString().split('T')[0] }); setSelectedOffer(null); setShowModal(true) }}>
          <Plus size={15} />Record Offer
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : offers.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><FileText size={22} /></div>
              <p className="empty-title">No offers recorded</p>
              <button className="btn-gold" style={{ marginTop: 12 }} onClick={() => { setForm({ status: 'draft' }); setSelectedOffer(null); setShowModal(true) }}><Plus size={14} />Record First Offer</button>
            </div>
          </div>
        ) : isMobile ? (
          // Mobile card view
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {offers.map(o => {
              const s = STATUS_COLORS[o.status] || STATUS_COLORS.draft
              return (
                <div key={o.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => { setForm(o); setSelectedOffer(o); setShowModal(true) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.properties?.title || '—'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{o.contacts?.first_name} {o.contacts?.last_name}</p>
                    </div>
                    <span className={`badge ${s.badge}`} style={{ marginLeft: 8 }}>{o.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 400 }}>{fmt(o.offer_amount)}</p>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      {o.status === 'submitted' && <>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--green)' }} onClick={() => updateStatus(o.id, 'accepted')}>Accept</button>
                        <button className="btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: 'var(--red)' }} onClick={() => updateStatus(o.id, 'rejected')}>Reject</button>
                      </>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr><th>Property</th><th>Buyer</th><th>Offer Amount</th><th>Counter</th><th>Status</th><th>Offer Date</th><th>Closing</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {offers.map(o => {
                    const s = STATUS_COLORS[o.status] || STATUS_COLORS.draft
                    return (
                      <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => { setForm(o); setSelectedOffer(o); setShowModal(true) }}>
                        <td>
                          <p style={{ color: 'var(--text)', fontWeight: 500 }}>{o.properties?.title || '—'}</p>
                          {o.properties?.price && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Listed: {fmt(o.properties.price)}</p>}
                        </td>
                        <td>{o.contacts?.first_name} {o.contacts?.last_name}</td>
                        <td>
                          <p style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(o.offer_amount)}</p>
                          {o.properties?.price && <p style={{ fontSize: 11, color: o.offer_amount >= o.properties.price ? 'var(--green)' : 'var(--red)' }}>{((o.offer_amount / o.properties.price - 1) * 100).toFixed(1)}%</p>}
                        </td>
                        <td>{o.counter_amount ? fmt(o.counter_amount) : '—'}</td>
                        <td><span className={`badge ${s.badge}`}>{o.status}</span></td>
                        <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{o.offer_date || '—'}</td>
                        <td style={{ color: 'var(--text-3)', fontSize: 13 }}>{o.closing_date || '—'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {o.status === 'submitted' && <>
                              <button onClick={() => updateStatus(o.id, 'accepted')} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--green)' }}>Accept</button>
                              <button onClick={() => updateStatus(o.id, 'rejected')} className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--red)' }}>Reject</button>
                            </>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 580, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><p className="page-label">{selectedOffer ? 'Edit' : 'Record'} Offer</p><h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>{selectedOffer ? 'Update Offer' : 'New Offer'}</h2></div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Property *</label><div className="crm-select-wrap"><select className="crm-select" value={form.property_id || ''} onChange={e => setForm({ ...form, property_id: e.target.value })}><option value="">Select property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div></div>
                  <div><label className="form-label">Buyer *</label><div className="crm-select-wrap"><select className="crm-select" value={form.buyer_contact_id || ''} onChange={e => setForm({ ...form, buyer_contact_id: e.target.value })}><option value="">Select buyer</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Offer Amount ($) *</label><input type="number" className="crm-input" value={form.offer_amount || ''} onChange={e => setForm({ ...form, offer_amount: Number(e.target.value) })} placeholder="2000000" /></div>
                  <div><label className="form-label">Deposit ($)</label><input type="number" className="crm-input" value={form.deposit_amount || ''} onChange={e => setForm({ ...form, deposit_amount: Number(e.target.value) })} placeholder="200000" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Counter Amount ($)</label><input type="number" className="crm-input" value={form.counter_amount || ''} onChange={e => setForm({ ...form, counter_amount: Number(e.target.value) })} /></div>
                  <div><label className="form-label">Status</label><div className="crm-select-wrap"><select className="crm-select" value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
                  <div><label className="form-label">Offer Date</label><input type="date" className="crm-input" value={form.offer_date || ''} onChange={e => setForm({ ...form, offer_date: e.target.value })} /></div>
                  <div><label className="form-label">Expiry Date</label><input type="date" className="crm-input" value={form.expiry_date || ''} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
                  <div><label className="form-label">Closing Date</label><input type="date" className="crm-input" value={form.closing_date || ''} onChange={e => setForm({ ...form, closing_date: e.target.value })} /></div>
                </div>
                <div><label className="form-label">Conditions / Contingencies</label><textarea className="crm-input" rows={3} value={form.conditions || ''} onChange={e => setForm({ ...form, conditions: e.target.value })} placeholder="Subject to financing, home inspection, etc." /></div>
                <div><label className="form-label">Notes</label><textarea className="crm-input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveOffer} disabled={saving || !form.property_id || !form.buyer_contact_id}>{saving ? 'Saving...' : selectedOffer ? 'Update Offer' : 'Record Offer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
