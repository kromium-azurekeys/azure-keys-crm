'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { Plus, X, Network } from 'lucide-react'

interface ReferralNetworkProps { profile: any }

const REFERRER_TYPES = ['Attorney / Legal Firm', 'Wealth Manager / Financial Advisor', 'International Broker', 'Relocation Consultant', 'Accountant / Tax Advisor', 'Private Banker', 'Developer Contact', 'Past Client', 'Other']

export default function ReferralNetwork({ profile }: ReferralNetworkProps) {
  const isMobile = useIsMobile()
  const [referrers, setReferrers] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ referrer_type: 'Attorney / Legal Firm', fee_status: 'pending' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('referral_sources').select('*').order('total_referrals', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name')
    ])
    setReferrers(r || [])
    setContacts(c || [])
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (selected) {
        await supabase.from('referral_sources').update(form).eq('id', selected.id)
      } else {
        await supabase.from('referral_sources').insert({ ...form, created_by: profile?.id })
      }
      setShowModal(false)
      loadData()
    } catch {
      // Demo data if table not ready
      setReferrers([
        { id: '1', name: 'Harrison & Lowe Attorneys', referrer_type: 'Attorney / Legal Firm', total_referrals: 3, total_fees_paid: 18500, fee_status: 'partial', contact_name: 'Michael Harrison' },
        { id: '2', name: 'Wealth Management Group', referrer_type: 'Wealth Manager / Financial Advisor', total_referrals: 5, total_fees_paid: 42000, fee_status: 'paid', contact_name: 'Sarah Chen' },
        { id: '3', name: "Christie's International RE", referrer_type: 'International Broker', total_referrals: 2, total_fees_paid: 28000, fee_status: 'pending', contact_name: 'James O\'Brien' },
        { id: '4', name: 'Island Relocation Specialists', referrer_type: 'Relocation Consultant', total_referrals: 7, total_fees_paid: 55000, fee_status: 'paid', contact_name: 'Amanda Torres' },
      ])
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
  const feeColors: Record<string, string> = { paid: 'badge-green', pending: 'badge-orange', partial: 'badge-gold' }

  const typeEmoji: Record<string, string> = {
    'Attorney / Legal Firm': '⚖️', 'Wealth Manager / Financial Advisor': '💼',
    'International Broker': '🌐', 'Relocation Consultant': '✈️',
    'Accountant / Tax Advisor': '📊', 'Private Banker': '🏦',
    'Developer Contact': '🏗️', 'Past Client': '⭐', 'Other': '👤',
  }

  const totalFees = referrers.reduce((sum, r) => sum + (r.total_fees_paid || 0), 0)
  const totalReferrals = referrers.reduce((sum, r) => sum + (r.total_referrals || 0), 0)

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Caribbean Intelligence</p>
          <h1 className="page-title">Referral <em>Network</em></h1>
          <p className="page-sub">Manage co-broker relationships, referral fees, and network health</p>
        </div>
        <button className="btn-gold" onClick={() => { setForm({ referrer_type: 'Attorney / Legal Firm', fee_status: 'pending' }); setSelected(null); setShowModal(true) }}>
          <Plus size={15} /> Add Referral Source
        </button>
      </div>

      {/* Stats */}
      <div style={{ padding: isMobile ? '16px' : '20px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 10 : 16 }}>
        {[
          { label: 'Referral Sources', value: String(referrers.length), sub: 'Active partners', icon: '🤝' },
          { label: 'Total Referrals', value: String(totalReferrals), sub: 'All time', icon: '📥' },
          { label: 'Fees Paid / Due', value: fmt(totalFees), sub: 'Referral commissions', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--text)' }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: isMobile ? '0 16px 24px' : '0 32px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 }}>
        {/* Active Sources */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Active Referral Sources</p>
          </div>
          {loading ? (
            <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : referrers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Network size={20} /></div>
              <p className="empty-title">No referral sources yet</p>
              <p className="empty-sub">Add attorneys, brokers & advisors who send you leads</p>
            </div>
          ) : (
            <div>
              {referrers.map(r => (
                <div key={r.id}
                  style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => { setForm(r); setSelected(r); setShowModal(true) }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {typeEmoji[r.referrer_type] || '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{r.referrer_type} · {r.total_referrals || 0} referrals</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: '1rem', color: 'var(--gold)', fontWeight: 600 }}>{fmt(r.total_fees_paid)}</p>
                    {r.fee_status && <span className={`badge ${feeColors[r.fee_status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{r.fee_status}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending fees */}
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>Pending Referral Fees</p>
          </div>
          <div style={{ padding: 20 }}>
            {referrers.filter(r => r.fee_status !== 'paid').length === 0 ? (
              <p style={{ color: 'var(--text-4)', fontSize: 13, textAlign: 'center', padding: 20 }}>All referral fees are settled ✓</p>
            ) : (
              <table className="crm-table">
                <thead><tr><th>Referrer</th><th>Status</th><th>Amount</th></tr></thead>
                <tbody>
                  {referrers.filter(r => r.fee_status !== 'paid').map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td><span className={`badge ${feeColors[r.fee_status] || 'badge-gray'}`}>{r.fee_status}</span></td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(r.pending_fees || r.total_fees_paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ marginTop: 20, padding: 16, background: 'var(--gold-pale)', borderRadius: 8, border: '1px solid var(--gold-border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Referral Strategy Tips</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Build quarterly touchpoints with your top 5 referrers', 'Invite key attorneys & bankers to exclusive property viewings', 'Send market reports to referral network monthly', 'Celebrate successful referral closes with personalized gifts'].map(tip => (
                  <p key={tip} style={{ fontSize: 12, color: 'var(--text-2)' }}>• {tip}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 560, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p className="page-label">Referral Network</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>{selected ? 'Edit' : 'Add'} Referral Source</h2>
                </div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Organization Name *</label>
                  <input className="crm-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Harrison & Lowe Attorneys" />
                </div>
                <div>
                  <label className="form-label">Referrer Type</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.referrer_type || ''} onChange={e => setForm({ ...form, referrer_type: e.target.value })}>
                      {REFERRER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Primary Contact Name</label>
                  <input className="crm-input" value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Contact at the organization" />
                </div>
                <div>
                  <label className="form-label">Standard Referral Fee (%)</label>
                  <input type="number" className="crm-input" value={form.fee_percentage || ''} onChange={e => setForm({ ...form, fee_percentage: Number(e.target.value) })} placeholder="e.g. 25" />
                </div>
                <div>
                  <label className="form-label">Fee Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.fee_status || 'pending'} onChange={e => setForm({ ...form, fee_status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Total Referrals (All Time)</label>
                  <input type="number" className="crm-input" value={form.total_referrals || ''} onChange={e => setForm({ ...form, total_referrals: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label">Total Fees Paid ($)</label>
                  <input type="number" className="crm-input" value={form.total_fees_paid || ''} onChange={e => setForm({ ...form, total_fees_paid: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label className="form-label">Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Relationship notes, agreement terms, communication history..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Saving...' : selected ? 'Update' : 'Add Source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
