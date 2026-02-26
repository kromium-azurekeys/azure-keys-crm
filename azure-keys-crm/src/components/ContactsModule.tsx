'use client'

import { useEffect, useState } from 'react'
import { supabase, Contact, Profile } from '@/lib/supabase'
import { Search, Plus, Filter, X, Phone, Mail, MapPin, Tag, ChevronDown } from 'lucide-react'

interface ContactsModuleProps {
  profile: Profile | null
}

const LIFECYCLE_STAGES = ['prospect', 'qualified', 'active_buyer', 'under_contract', 'closed', 'retention']
const SOURCES = ['website', 'referral', 'social_media', 'email_campaign', 'walk_in', 'phone', 'listing_portal', 'other']
const TYPES = ['lead', 'prospect', 'client', 'past_client', 'vendor']

const stageColors: Record<string, string> = {
  prospect: '#1e7ec8',
  qualified: '#c9a84c',
  active_buyer: '#c97a1e',
  under_contract: '#4a8c4a',
  closed: '#6a4a8c',
  retention: '#4a6a8c'
}

export default function ContactsModule({ profile }: ContactsModuleProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<Partial<Contact>>({
    type: 'lead', source: 'website', lifecycle_stage: 'prospect', status: 'active'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadContacts() }, [search, typeFilter])

  const loadContacts = async () => {
    setLoading(true)
    let q = supabase.from('contacts').select('*, profiles!assigned_agent_id(full_name, email)').order('created_at', { ascending: false })
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    if (typeFilter !== 'all') q = q.eq('type', typeFilter)
    const { data } = await q.limit(100)
    setContacts(data || [])
    setLoading(false)
  }

  const openNew = () => {
    setForm({ type: 'lead', source: 'website', lifecycle_stage: 'prospect', status: 'active' })
    setSelectedContact(null)
    setShowModal(true)
  }

  const openEdit = (c: Contact) => {
    setForm(c)
    setSelectedContact(c)
    setShowModal(true)
  }

  const saveContact = async () => {
    setSaving(true)
    try {
      if (selectedContact) {
        await supabase.from('contacts').update(form).eq('id', selectedContact.id)
        await supabase.from('activities').insert({
          type: 'note', description: `Contact updated: ${form.first_name} ${form.last_name}`,
          contact_id: selectedContact.id, created_by: profile?.id
        })
      } else {
        const { data } = await supabase.from('contacts').insert(form).select().single()
        if (data) {
          await supabase.from('activities').insert({
            type: 'note', description: `New contact added: ${form.first_name} ${form.last_name}`,
            contact_id: data.id, created_by: profile?.id
          })
        }
      }
      setShowModal(false)
      loadContacts()
    } finally {
      setSaving(false)
    }
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    loadContacts()
  }

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Database</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Contact <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Management</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{contacts.length} contacts in database</p>
        </div>
        <button onClick={openNew} className="btn-gold">
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="crm-input pl-10"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="crm-select" style={{ width: 160 }}>
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Lifecycle stage tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', ...LIFECYCLE_STAGES].map(stage => {
          const count = stage === 'all' ? contacts.length : contacts.filter(c => c.lifecycle_stage === stage).length
          return (
            <button key={stage} className="text-xs px-3 py-1.5 tracking-wider uppercase" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.1)',
              color: 'var(--muted)', cursor: 'pointer', fontSize: '0.65rem',
              letterSpacing: '0.12em'
            }}>
              {stage === 'all' ? 'All' : stage.replace(/_/g, ' ')} <span style={{ color: 'var(--gold)' }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : contacts.length === 0 ? (
        <div className="crm-card p-16 text-center">
          <p className="serif text-2xl font-light mb-3" style={{ color: 'var(--muted)' }}>No contacts found</p>
          <p className="text-sm mb-6" style={{ color: 'rgba(248,245,240,0.3)' }}>Add your first contact to get started</p>
          <button onClick={openNew} className="btn-gold">+ Add Contact</button>
        </div>
      ) : (
        <div className="crm-card overflow-hidden">
          <table className="w-full crm-table">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Contact</th>
                <th className="text-left">Type</th>
                <th className="text-left">Stage</th>
                <th className="text-left">Source</th>
                <th className="text-left">Budget</th>
                <th className="text-left">Agent</th>
                <th className="text-left">Score</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
                        {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ color: 'var(--white)' }}>{c.first_name} {c.last_name}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--muted)' }}>
                      {c.email && <p className="text-xs">{c.email}</p>}
                      {c.phone && <p className="text-xs">{c.phone}</p>}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs px-2 py-1 capitalize" style={{
                      background: 'rgba(201,168,76,0.1)', color: 'var(--gold)',
                      border: '1px solid rgba(201,168,76,0.2)', letterSpacing: '0.06em'
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs px-2 py-1 capitalize" style={{
                      background: `${stageColors[c.lifecycle_stage] || '#888'}20`,
                      color: stageColors[c.lifecycle_stage] || '#888',
                      border: `1px solid ${stageColors[c.lifecycle_stage] || '#888'}40`
                    }}>
                      {c.lifecycle_stage?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>
                      {c.source?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--white)' }}>
                      {c.budget_max ? `$${(c.budget_max / 1000000).toFixed(1)}M` : '—'}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>
                      {(c as any).profiles?.full_name || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${Math.min(c.lead_score, 100)}%`,
                        background: 'var(--gold)',
                        maxWidth: 40, minWidth: 4
                      }} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{c.lead_score}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs px-2 py-1" style={{
                        background: 'rgba(201,168,76,0.1)', color: 'var(--gold)',
                        border: '1px solid rgba(201,168,76,0.15)', cursor: 'pointer'
                      }}>Edit</button>
                      <button onClick={() => deleteContact(c.id)} className="text-xs px-2 py-1" style={{
                        background: 'rgba(200,60,60,0.1)', color: '#ff6b6b',
                        border: '1px solid rgba(200,60,60,0.15)', cursor: 'pointer'
                      }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="crm-card overflow-y-auto" style={{ width: '90%', maxWidth: 700, maxHeight: '90vh', position: 'relative' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
                  {selectedContact ? 'Edit' : 'New'} Contact
                </p>
                <h2 className="serif text-2xl font-light mt-1" style={{ color: 'var(--white)' }}>
                  {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : 'Add Contact'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>First Name *</label>
                  <input className="crm-input" value={form.first_name || ''} onChange={e => setForm({...form, first_name: e.target.value})} placeholder="First name" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Last Name *</label>
                  <input className="crm-input" value={form.last_name || ''} onChange={e => setForm({...form, last_name: e.target.value})} placeholder="Last name" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Email</label>
                  <input type="email" className="crm-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Phone</label>
                  <input className="crm-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 246 ..." />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Type</label>
                  <select className="crm-select" value={form.type || 'lead'} onChange={e => setForm({...form, type: e.target.value as any})}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Lifecycle Stage</label>
                  <select className="crm-select" value={form.lifecycle_stage || 'prospect'} onChange={e => setForm({...form, lifecycle_stage: e.target.value})}>
                    {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Source</label>
                  <select className="crm-select" value={form.source || 'website'} onChange={e => setForm({...form, source: e.target.value as any})}>
                    {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Min Budget ($)</label>
                  <input type="number" className="crm-input" value={form.budget_min || ''} onChange={e => setForm({...form, budget_min: Number(e.target.value)})} placeholder="500000" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Max Budget ($)</label>
                  <input type="number" className="crm-input" value={form.budget_max || ''} onChange={e => setForm({...form, budget_max: Number(e.target.value)})} placeholder="5000000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Min Bedrooms</label>
                  <input type="number" className="crm-input" value={form.bedrooms_min || ''} onChange={e => setForm({...form, bedrooms_min: Number(e.target.value)})} placeholder="2" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Lead Score (0-100)</label>
                  <input type="number" min="0" max="100" className="crm-input" value={form.lead_score || 0} onChange={e => setForm({...form, lead_score: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes about this contact..." />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveContact} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedContact ? 'Update Contact' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
