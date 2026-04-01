'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Globe, Mail, Phone, Building2, Star, Clock, CheckCircle, ChevronDown } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

type Enquiry = {
  id: string
  created_at: string
  name: string
  email: string
  phone: string | null
  message: string | null
  property_name: string | null
  market: string | null
  source: string
  lead_score: number | null
  lead_tier: string | null
  status: string
  form_data: any
}

const TIER_COLORS: Record<string, string> = {
  Premium:   'var(--gold)',
  High:      'var(--green)',
  Qualified: '#8b7355',
  Nurture:   'var(--text-3)',
}

const SOURCE_LABELS: Record<string, string> = {
  website_property: 'Property Enquiry',
  website_contact:  'Contact Form',
  buyer_form:       'Buyer Match Form',
  seller_form:      'Seller Valuation',
}

export default function WebsiteEnquiriesModule() {
  const isMobile = useIsMobile()
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified'>('all')
  const [selected, setSelected] = useState<Enquiry | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const { data, error } = await supabase
        .from('website_enquiries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      setEnquiries(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('website_enquiries').update({ status }).eq('id', id)
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  const filtered = enquiries.filter(e => {
    if (filter === 'all') return true
    return e.status === filter
  })

  const p = isMobile ? '16px' : '28px 32px'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p className="page-label">
          <Globe size={10} style={{ display: 'inline', marginRight: 4 }} />
          Website
        </p>
        <h1 className="page-title">
          Website <em>Enquiries</em>
        </h1>
        <p className="page-sub">{enquiries.filter(e => e.status === 'new').length} new leads · {enquiries.length} total</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16, marginBottom: 20 }}>
        {[
          { label: 'New',       value: enquiries.filter(e => e.status === 'new').length,       color: 'var(--gold)',   bg: 'var(--gold-pale)' },
          { label: 'Contacted', value: enquiries.filter(e => e.status === 'contacted').length,  color: 'var(--green)', bg: 'var(--green-pale)' },
          { label: 'Qualified', value: enquiries.filter(e => e.status === 'qualified').length,  color: 'var(--purple)',bg: 'var(--purple-pale)' },
          { label: 'Premium Leads', value: enquiries.filter(e => e.lead_tier === 'Premium').length, color: 'var(--gold)', bg: 'var(--gold-pale)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected && !isMobile ? '1fr 380px' : '1fr', gap: 16 }}>

        {/* List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Filter tabs */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['all', 'new', 'contacted', 'qualified'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`}
                style={{ textTransform: 'capitalize' }}>
                {f === 'all' ? `All (${enquiries.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${enquiries.filter(e => e.status === f).length})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Globe size={18} /></div>
              <p className="empty-title">No enquiries yet</p>
              <p className="empty-sub">Website leads will appear here when submitted</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Property / Market</th>
                    {!isMobile && <th>Score</th>}
                    {!isMobile && <th>Received</th>}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}
                      onClick={() => setSelected(selected?.id === e.id ? null : e)}
                      style={{ cursor: 'pointer', background: selected?.id === e.id ? 'var(--gold-pale)' : undefined }}>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--text)' }}>{e.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.email}</p>
                      </td>
                      <td>
                        <span className="badge badge-gold" style={{ fontSize: 10 }}>
                          {SOURCE_LABELS[e.source] || e.source}
                        </span>
                      </td>
                      <td>
                        <p style={{ fontSize: 13 }}>{e.property_name || '—'}</p>
                        {e.market && <p style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{e.market}</p>}
                      </td>
                      {!isMobile && (
                        <td>
                          {e.lead_score ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-pale)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: TIER_COLORS[e.lead_tier || ''] || 'var(--gold)' }}>
                                {e.lead_score}
                              </div>
                              {e.lead_tier && <span style={{ fontSize: 11, color: TIER_COLORS[e.lead_tier] || 'var(--text-3)', fontWeight: 500 }}>{e.lead_tier}</span>}
                            </div>
                          ) : <span style={{ color: 'var(--text-4)', fontSize: 12 }}>—</span>}
                        </td>
                      )}
                      {!isMobile && (
                        <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      )}
                      <td>
                        <div className="crm-select-wrap" style={{ minWidth: 110 }} onClick={ev => ev.stopPropagation()}>
                          <select
                            className="crm-select"
                            value={e.status}
                            onChange={ev => updateStatus(e.id, ev.target.value)}
                            style={{ fontSize: 12, padding: '5px 28px 5px 9px' }}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--text)' }}>{selected.name}</p>
                  <span className="badge badge-gold" style={{ fontSize: 10, marginTop: 4 }}>{SOURCE_LABELS[selected.source]}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, padding: 4 }}>×</button>
              </div>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
                  <Mail size={13} />{selected.email}
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>
                    <Phone size={13} />{selected.phone}
                  </a>
                )}
              </div>

              {/* Property interest */}
              {(selected.property_name || selected.market) && (
                <div style={{ background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Property Interest</p>
                  {selected.property_name && <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selected.property_name}</p>}
                  {selected.market && <p style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize', marginTop: 2 }}>{selected.market}</p>}
                </div>
              )}

              {/* AI Score */}
              {selected.lead_score && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>AI Lead Score</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gold-pale)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
                      {selected.lead_score}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: TIER_COLORS[selected.lead_tier || ''] || 'var(--gold)' }}>{selected.lead_tier} Lead</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>AI-scored from buyer form</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${selected.lead_score}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Message */}
              {selected.message && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Message</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8 }}>{selected.message}</p>
                </div>
              )}

              {/* Form data for buyer/seller forms */}
              {selected.form_data?.answers && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Form Answers</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(selected.form_data.answers).filter(([k]) => !['name','email','phone','message'].includes(k)).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-3)', textTransform: 'capitalize', minWidth: 100 }}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>
                          {Array.isArray(val) ? (val as string[]).join(', ') : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top matches from AI */}
              {selected.form_data?.topMatches && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>AI Property Matches</p>
                  {selected.form_data.topMatches.map((m: string) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                      <Star size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />{m}
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-4)' }}>
                <Clock size={11} />
                Received {new Date(selected.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <a href={`mailto:${selected.email}`} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
                  <Mail size={13} />Reply
                </a>
                <button onClick={() => updateStatus(selected.id, 'contacted')} className="btn-outline" style={{ flex: 1, fontSize: 12, justifyContent: 'center' }}>
                  <CheckCircle size={13} />Mark Contacted
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
