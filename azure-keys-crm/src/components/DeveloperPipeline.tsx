'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { Plus, X, Home, CheckCircle, Circle } from 'lucide-react'

interface DeveloperPipelineProps { profile: any }

const MILESTONES = ['Planning & Permits', 'Foundation & Groundwork', 'Structural Frame', 'Exterior & Roofing', 'Interior Fit-Out', 'Fixtures & Finishes', 'Final Inspections', 'Certificate of Occupancy', 'Handover']

export default function DeveloperPipeline({ profile }: DeveloperPipelineProps) {
  const isMobile = useIsMobile()
  const [projects, setProjects] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ status: 'on_track', current_milestone: 'Foundation & Groundwork', units_total: 10 })
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('developer_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name')
    ])
    setProjects(p || [])
    setContacts(c || [])
    setLoading(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (selected) {
        await supabase.from('developer_projects').update(form).eq('id', selected.id)
      } else {
        await supabase.from('developer_projects').insert({ ...form, created_by: profile?.id })
      }
      setShowModal(false)
      loadData()
    } catch {
      // Show demo project if table not ready
      setProjects([{
        id: 'demo', name: 'The Coral Ridge Residences',
        island: 'Barbados', units_total: 12, units_reserved: 8, units_available: 4,
        status: 'on_track', current_milestone: 'Interior Fit-Out',
        expected_completion: '2026-11-30', total_value: 28500000, notes: 'Premium beachfront development in Christ Church'
      }])
      setShowModal(false)
    } finally {
      setSaving(false)
    }
  }

  const statusColors: Record<string, string> = { on_track: 'badge-green', delayed: 'badge-red', ahead: 'badge-blue', paused: 'badge-orange' }
  const fmt = (n: number) => `$${(n / 1000000).toFixed(1)}M`

  const getMilestoneIndex = (milestone: string) => MILESTONES.indexOf(milestone)

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Caribbean Intelligence</p>
          <h1 className="page-title">Developer <em>Pipeline</em></h1>
          <p className="page-sub">Pre-construction and new development sales management</p>
        </div>
        <button className="btn-gold" onClick={() => { setForm({ status: 'on_track', current_milestone: 'Foundation & Groundwork', units_total: 10 }); setSelected(null); setShowModal(true) }}>
          <Plus size={15} /> New Development
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
        ) : projects.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><Home size={22} /></div>
              <p className="empty-title">No developments yet</p>
              <p className="empty-sub" style={{ marginBottom: 16 }}>Track pre-construction projects and new development sales</p>
              <button className="btn-gold" onClick={() => { setForm({ status: 'on_track', units_total: 10 }); setSelected(null); setShowModal(true) }}>
                <Plus size={14} /> Add Development
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {projects.map(proj => {
              const milestoneIdx = getMilestoneIndex(proj.current_milestone)
              const progress = milestoneIdx >= 0 ? Math.round((milestoneIdx / (MILESTONES.length - 1)) * 100) : 0
              const soldPct = proj.units_total ? Math.round((proj.units_reserved / proj.units_total) * 100) : 0

              return (
                <div key={proj.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{proj.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{proj.island} · {proj.units_total} units · {proj.total_value ? fmt(proj.total_value) : '—'} total value</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className={`badge ${statusColors[proj.status] || 'badge-gray'}`}>{(proj.status || '').replace('_', ' ')}</span>
                      <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => { setForm(proj); setSelected(proj); setShowModal(true) }}>Edit</button>
                    </div>
                  </div>

                  <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? 16 : 24 }}>
                    {/* Construction milestones */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Construction Progress — {proj.current_milestone}</p>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--text-3)' }}>
                          <span>Progress</span><span>{progress}%</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(to right, var(--gold), var(--gold-light))' }} /></div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {MILESTONES.map((m, i) => (
                          <div key={m} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {i < milestoneIdx ? (
                              <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                            ) : i === milestoneIdx ? (
                              <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--gold)', flexShrink: 0 }} />
                            ) : (
                              <Circle size={14} style={{ color: 'var(--border-strong)', flexShrink: 0 }} />
                            )}
                            <p style={{ fontSize: 13, color: i <= milestoneIdx ? 'var(--text)' : 'var(--text-4)', fontWeight: i === milestoneIdx ? 600 : 400 }}>{m}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unit sales */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>Unit Sales</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Total Units', value: proj.units_total || 0, color: 'var(--text)' },
                          { label: 'Reserved', value: proj.units_reserved || 0, color: 'var(--green)' },
                          { label: 'Available', value: proj.units_available || (proj.units_total - proj.units_reserved), color: 'var(--azure)' },
                        ].map(s => (
                          <div key={s.label} className="metric-card" style={{ padding: '12px 16px' }}>
                            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', fontWeight: 600, color: s.color }}>{s.value}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--text-3)' }}>
                          <span>Sales Progress</span><span>{soldPct}% sold</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${soldPct}%`, background: 'linear-gradient(to right, var(--green), #34d399)' }} /></div>
                      </div>
                      {proj.expected_completion && (
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>
                          Expected completion: <strong>{new Date(proj.expected_completion).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p className="page-label">Developer Pipeline</p>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400 }}>{selected ? 'Edit' : 'New'} Development Project</h2>
                </div>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project Name *</label>
                  <input className="crm-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. The Coral Ridge Residences" />
                </div>
                <div>
                  <label className="form-label">Island / Location</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.island || ''} onChange={e => setForm({ ...form, island: e.target.value })}>
                      <option value="">Select island...</option>
                      {['Barbados', 'Grenada', 'St Lucia', 'Dominica', 'St Kitts & Nevis', 'Antigua', 'Jamaica'].map(i => <option key={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Project Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status || 'on_track'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="on_track">On Track</option>
                      <option value="ahead">Ahead of Schedule</option>
                      <option value="delayed">Delayed</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Current Milestone</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.current_milestone || ''} onChange={e => setForm({ ...form, current_milestone: e.target.value })}>
                      {MILESTONES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Expected Completion</label>
                  <input type="date" className="crm-input" value={form.expected_completion || ''} onChange={e => setForm({ ...form, expected_completion: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Total Units</label>
                  <input type="number" className="crm-input" value={form.units_total || ''} onChange={e => setForm({ ...form, units_total: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label">Units Reserved</label>
                  <input type="number" className="crm-input" value={form.units_reserved || ''} onChange={e => setForm({ ...form, units_reserved: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label">Units Available</label>
                  <input type="number" className="crm-input" value={form.units_available || ''} onChange={e => setForm({ ...form, units_available: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label">Total Project Value ($)</label>
                  <input type="number" className="crm-input" value={form.total_value || ''} onChange={e => setForm({ ...form, total_value: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label className="form-label">Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Development notes, features, developer info..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Saving...' : selected ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
