'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, Globe } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface CBIModuleProps { profile: Profile | null }

const CBI_PROGRAMS = [
  { country: 'Barbados', program: 'SERP', minInvestment: 'No minimum', holdPeriod: 'N/A', processingTime: '3–6 months', passportEligible: false },
  { country: 'Grenada', program: 'CBI — Real Estate', minInvestment: '$350,000 USD', holdPeriod: '5 years', processingTime: '4–6 months', passportEligible: true },
  { country: 'Dominica', program: 'CBI — Real Estate', minInvestment: '$200,000 USD', holdPeriod: '3 years', processingTime: '2–3 months', passportEligible: true },
  { country: 'St Kitts & Nevis', program: 'CBI — Approved Real Estate', minInvestment: '$400,000 USD', holdPeriod: '7 years', processingTime: '3–6 months', passportEligible: true },
  { country: 'Antigua & Barbuda', program: 'CBI — Property Option', minInvestment: '$400,000 USD', holdPeriod: '5 years', processingTime: '3–6 months', passportEligible: true },
  { country: 'St Lucia', program: 'CBI — Real Estate', minInvestment: '$300,000 USD', holdPeriod: '5 years', processingTime: '3–6 months', passportEligible: true },
]

const STAGES = ['Initial Inquiry', 'Document Collection', 'Due Diligence', 'Application Submitted', 'Under Review', 'Approved', 'Rejected', 'Withdrawn']
const STAGE_COLORS: Record<string, string> = {
  'Initial Inquiry': 'badge-gray', 'Document Collection': 'badge-orange', 'Due Diligence': 'badge-gold',
  'Application Submitted': 'badge-blue', 'Under Review': 'badge-purple', 'Approved': 'badge-green', 'Rejected': 'badge-red', 'Withdrawn': 'badge-gray',
}

export default function CBIModule({ profile }: CBIModuleProps) {
  const isMobile = useIsMobile()
  const [applications, setApplications] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRefModal, setShowRefModal] = useState(false)
  const [form, setForm] = useState<any>({ stage: 'Initial Inquiry', program: 'Barbados SERP' })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: apps }, { data: ctcts }] = await Promise.all([
      supabase.from('cbi_applications').select('*, contacts(first_name, last_name, email)').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name')
    ])
    setApplications(apps || [])
    setContacts(ctcts || [])
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (selected) await supabase.from('cbi_applications').update(form).eq('id', selected.id)
      else await supabase.from('cbi_applications').insert({ ...form, created_by: profile?.id })
      setShowModal(false); loadData()
    } catch { alert('CBI table not set up yet. Run the SQL migration first.') }
    finally { setSaving(false) }
  }

  const activeCount = applications.filter(a => !['Approved', 'Rejected', 'Withdrawn'].includes(a.stage)).length
  const approvedCount = applications.filter(a => a.stage === 'Approved').length
  const p = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      <div style={{ padding: p, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Caribbean Intelligence</p>
          <h1 className="page-title">CBI / <em>SERP Programs</em></h1>
          <p className="page-sub">Citizenship & Residency by Investment tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={() => setShowRefModal(true)}>Program Guide</button>
          <button className="btn-gold" onClick={() => { setForm({ stage: 'Initial Inquiry', program: 'Barbados SERP' }); setSelected(null); setShowModal(true) }}>
            <Plus size={15} />New Application
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 10 : 16 }}>
        {[
          { label: 'Active Programs', value: '6', sub: 'Caribbean islands', icon: '🌍' },
          { label: 'Active Applications', value: String(activeCount), sub: 'In progress', icon: '📋' },
          { label: 'Approved', value: String(approvedCount), sub: 'This year', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="metric-card" style={{ padding: isMobile ? 14 : 20 }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.6rem' : '2rem', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div style={{ padding: isMobile ? '0 16px 24px' : '0 32px 32px' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: 14 }}>CBI / SERP Applications</p>
          </div>
          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Globe size={22} /></div>
              <p className="empty-title">No applications yet</p>
              <p className="empty-sub" style={{ marginBottom: 14 }}>Track citizenship & residency applications</p>
              <button className="btn-gold" onClick={() => { setForm({ stage: 'Initial Inquiry', program: 'Barbados SERP' }); setSelected(null); setShowModal(true) }}>
                <Plus size={14} />Add First Application
              </button>
            </div>
          ) : isMobile ? (
            // Mobile card list
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {applications.map(a => (
                <div key={a.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => { setForm(a); setSelected(a); setShowModal(true) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{a.contacts?.first_name} {a.contacts?.last_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.program} · {a.island}</p>
                    </div>
                    <span className={`badge ${STAGE_COLORS[a.stage] || 'badge-gray'}`}>{a.stage}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>{a.min_investment || '—'}</span>
                    {a.dd_status && <span className={`badge ${a.dd_status === 'complete' ? 'badge-green' : 'badge-orange'}`}>{a.dd_status}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr><th>Applicant</th><th>Program</th><th>Island</th><th>Min. Investment</th><th>Stage</th><th>Due Diligence</th><th>Agent</th><th></th></tr>
                </thead>
                <tbody>
                  {applications.map(a => (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => { setForm(a); setSelected(a); setShowModal(true) }}>
                      <td>
                        <p style={{ fontWeight: 500 }}>{a.contacts?.first_name} {a.contacts?.last_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>{a.contacts?.email}</p>
                      </td>
                      <td style={{ fontWeight: 500 }}>{a.program}</td>
                      <td>{a.island}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 500 }}>{a.min_investment || '—'}</td>
                      <td><span className={`badge ${STAGE_COLORS[a.stage] || 'badge-gray'}`}>{a.stage}</span></td>
                      <td>{a.dd_status ? <span className={`badge ${a.dd_status === 'complete' ? 'badge-green' : 'badge-orange'}`}>{a.dd_status}</span> : '—'}</td>
                      <td style={{ color: 'var(--text-3)' }}>{a.authorized_agent || '—'}</td>
                      <td onClick={e => e.stopPropagation()}><button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 600, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><p className="page-label">{selected ? 'Edit' : 'New'} Application</p><h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>CBI / SERP Application</h2></div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div><label className="form-label">Applicant *</label><div className="crm-select-wrap"><select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}><option value="">Select contact...</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div></div>
                <div><label className="form-label">Program</label><div className="crm-select-wrap"><select className="crm-select" value={form.program || ''} onChange={e => setForm({ ...form, program: e.target.value })}><option>Barbados SERP</option><option>Grenada CBI</option><option>Dominica CBI</option><option>St Kitts & Nevis CBI</option><option>Antigua & Barbuda CBI</option><option>St Lucia CBI</option></select></div></div>
                <div><label className="form-label">Island</label><div className="crm-select-wrap"><select className="crm-select" value={form.island || ''} onChange={e => setForm({ ...form, island: e.target.value })}><option value="">Select island...</option><option>Barbados</option><option>Grenada</option><option>Dominica</option><option>St Kitts & Nevis</option><option>Antigua & Barbuda</option><option>St Lucia</option></select></div></div>
                <div><label className="form-label">Stage</label><div className="crm-select-wrap"><select className="crm-select" value={form.stage || 'Initial Inquiry'} onChange={e => setForm({ ...form, stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div></div>
                <div><label className="form-label">Min. Investment</label><input className="crm-input" value={form.min_investment || ''} onChange={e => setForm({ ...form, min_investment: e.target.value })} placeholder="e.g. $350,000 USD" /></div>
                <div><label className="form-label">Holding Period</label><input className="crm-input" value={form.hold_period || ''} onChange={e => setForm({ ...form, hold_period: e.target.value })} placeholder="e.g. 5 years" /></div>
                <div><label className="form-label">Due Diligence</label><div className="crm-select-wrap"><select className="crm-select" value={form.dd_status || ''} onChange={e => setForm({ ...form, dd_status: e.target.value })}><option value="">Not Started</option><option value="pending">Pending</option><option value="in_review">In Review</option><option value="complete">Complete</option></select></div></div>
                <div><label className="form-label">Authorized Agent</label><input className="crm-input" value={form.authorized_agent || ''} onChange={e => setForm({ ...form, authorized_agent: e.target.value })} placeholder="Agent name" /></div>
                <div><label className="form-label">Application Date</label><input type="date" className="crm-input" value={form.application_date || ''} onChange={e => setForm({ ...form, application_date: e.target.value })} /></div>
                <div><label className="form-label">Expected Date</label><input type="date" className="crm-input" value={form.expected_date || ''} onChange={e => setForm({ ...form, expected_date: e.target.value })} /></div>
              </div>
              <div style={{ marginTop: 14 }}><label className="form-label">Notes</label><textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Application notes..." /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save} disabled={saving || !form.contact_id}>{saving ? 'Saving...' : selected ? 'Update' : 'Create Application'}</button>
            </div>
          </div>
        </div>
      )}

      {showRefModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRefModal(false)}>
          <div className="modal" style={{ width: '95%', maxWidth: 800, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><p className="page-label">Reference</p><h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>Caribbean CBI/SERP Guide</h2></div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowRefModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '20px 24px' }}>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CBI_PROGRAMS.map(p => (
                    <div key={p.country} className="card" style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{p.country}</p>
                        <span className={`badge ${p.passportEligible ? 'badge-green' : 'badge-gold'}`}>{p.passportEligible ? 'Passport' : 'Residency'}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{p.program}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><p style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min. Investment</p><p style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600 }}>{p.minInvestment}</p></div>
                        <div><p style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hold Period</p><p style={{ fontSize: 13, fontWeight: 500 }}>{p.holdPeriod}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead><tr><th>Country</th><th>Program</th><th>Min. Investment</th><th>Hold Period</th><th>Processing</th><th>Passport</th></tr></thead>
                    <tbody>
                      {CBI_PROGRAMS.map(p => (
                        <tr key={p.country}>
                          <td style={{ fontWeight: 600 }}>{p.country}</td>
                          <td>{p.program}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 500 }}>{p.minInvestment}</td>
                          <td>{p.holdPeriod}</td>
                          <td>{p.processingTime}</td>
                          <td><span className={`badge ${p.passportEligible ? 'badge-green' : 'badge-gold'}`}>{p.passportEligible ? 'Yes' : 'Residency Only'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn-ghost" onClick={() => setShowRefModal(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
