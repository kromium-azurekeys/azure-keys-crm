'use client'

import { useEffect, useState } from 'react'
import { supabase, Contact, Profile } from '@/lib/supabase'
import { Search, Plus, X, Phone, Mail, User } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ContactsModuleProps { profile: Profile | null }

const LIFECYCLE_STAGES = ['prospect','qualified','active_buyer','under_contract','closed','retention']
const SOURCES = ['website','referral','social_media','email_campaign','walk_in','phone','listing_portal','other']
const TYPES = ['lead','prospect','client','past_client','vendor']

const typeBadge: Record<string,string> = { lead:'badge-blue', prospect:'badge-gold', client:'badge-green', past_client:'badge-gray', vendor:'badge-purple' }
const stageBadge: Record<string,string> = { prospect:'badge-blue', qualified:'badge-gold', active_buyer:'badge-orange', under_contract:'badge-purple', closed:'badge-green', retention:'badge-gray' }

export default function ContactsModule({ profile }: ContactsModuleProps) {
  const isMobile = useIsMobile()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [form, setForm] = useState<Partial<Contact>>({ type:'lead', source:'website', lifecycle_stage:'prospect', status:'active' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadContacts() }, [search, typeFilter])

  const loadContacts = async () => {
    setLoading(true)
    let q = supabase.from('contacts').select('*, profiles!assigned_agent_id(full_name)').order('created_at', { ascending: false })
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    if (typeFilter !== 'all') q = q.eq('type', typeFilter)
    const { data } = await q.limit(100)
    setContacts(data || [])
    setLoading(false)
  }

  const openNew = () => { setForm({ type:'lead', source:'website', lifecycle_stage:'prospect', status:'active' }); setSelectedContact(null); setShowModal(true) }
  const openEdit = (c: Contact) => { setForm(c); setSelectedContact(c); setShowModal(true) }

  const saveContact = async () => {
    setSaving(true)
    try {
      if (selectedContact) {
        await supabase.from('contacts').update(form).eq('id', selectedContact.id)
      } else {
        const { data } = await supabase.from('contacts').insert(form).select().single()
        if (data) await supabase.from('activities').insert({ type:'note', description:`New contact: ${form.first_name} ${form.last_name}`, contact_id: data.id, created_by: profile?.id })
      }
      setShowModal(false); loadContacts()
    } finally { setSaving(false) }
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    loadContacts()
  }

  const initials = (c: Contact) => `${c.first_name[0]}${c.last_name[0]}`.toUpperCase()
  const p = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ padding: p, borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <p className="page-label">Database</p>
          <h1 className="page-title" style={{ fontSize: isMobile ? '1.6rem' : undefined }}>Contact <em>Management</em></h1>
          <p className="page-sub">{contacts.length} contacts in database</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={15}/>Add Contact</button>
      </div>

      {/* Toolbar */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 32px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div className="search-wrap" style={{ flex:1, minWidth: 160, maxWidth: isMobile ? '100%' : 300 }}>
          <Search size={15} className="search-icon"/>
          <input className="search-input" placeholder="Search contacts..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="filter-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {['all',...TYPES].map(t => (
            <button key={t} className={`filter-tab ${typeFilter===t?'active':''}`} onClick={()=>setTypeFilter(t)} style={{ whiteSpace:'nowrap' }}>
              {t==='all'?'All':t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
        {/* Mobile: card list. Desktop: table */}
        {loading ? (
          <div style={{ padding:48, display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
        ) : contacts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><User size={22}/></div>
              <p className="empty-title">No contacts found</p>
              <p className="empty-sub" style={{ marginBottom:16 }}>Add your first contact to get started</p>
              <button className="btn-primary" onClick={openNew}><Plus size={14}/>Add Contact</button>
            </div>
          </div>
        ) : isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {contacts.map(c => (
              <div key={c.id} className="card" style={{ padding:'14px 16px', cursor:'pointer' }} onClick={()=>openEdit(c)}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--azure-pale)', color:'var(--azure)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
                    {initials(c)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, color:'var(--text)', fontSize:14 }}>{c.first_name} {c.last_name}</p>
                    <p style={{ fontSize:12, color:'var(--text-3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email || c.phone || 'No contact info'}</p>
                  </div>
                  <span className={`badge ${typeBadge[c.type]||'badge-gray'}`}>{c.type.replace('_',' ')}</span>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
                  <span className={`badge ${stageBadge[c.lifecycle_stage]||'badge-gray'}`}>{(c.lifecycle_stage||'').replace('_',' ')}</span>
                  {c.budget_min||c.budget_max ? <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:'auto' }}>${((c.budget_min||0)/1000).toFixed(0)}K–${((c.budget_max||0)/1000).toFixed(0)}K</span> : null}
                  <div style={{ display:'flex', gap:10, marginLeft:'auto' }} onClick={e=>e.stopPropagation()}>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ color:'var(--azure)', display:'flex' }}><Phone size={16}/></a>}
                    {c.email && <a href={`mailto:${c.email}`} style={{ color:'var(--gold)', display:'flex' }}><Mail size={16}/></a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ overflow:'hidden' }}>
            <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr><th>Contact</th><th>Type</th><th>Lifecycle Stage</th><th>Source</th><th>Budget</th><th>Agent</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} style={{ cursor:'pointer' }} onClick={()=>openEdit(c)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--azure-pale)', color:'var(--azure)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>{initials(c)}</div>
                        <div>
                          <p style={{ fontWeight:500, color:'var(--text)' }}>{c.first_name} {c.last_name}</p>
                          <p style={{ fontSize:12, color:'var(--text-4)', marginTop:1 }}>{c.email||c.phone||'No contact info'}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${typeBadge[c.type]||'badge-gray'}`}>{c.type.replace('_',' ')}</span></td>
                    <td><span className={`badge ${stageBadge[c.lifecycle_stage]||'badge-gray'}`}>{(c.lifecycle_stage||'').replace('_',' ')}</span></td>
                    <td style={{ color:'var(--text-3)' }}>{(c.source||'').replace('_',' ')}</td>
                    <td style={{ color:'var(--text-3)' }}>{c.budget_min||c.budget_max ? `$${((c.budget_min||0)/1000).toFixed(0)}K–$${((c.budget_max||0)/1000).toFixed(0)}K` : '—'}</td>
                    <td style={{ color:'var(--text-3)' }}>{(c as any).profiles?.full_name||'Unassigned'}</td>
                    <td onClick={e=>e.stopPropagation()}>
                      <div style={{ display:'flex', gap:6 }}>
                        {c.phone && <a href={`tel:${c.phone}`} title="Call" style={{ color:'var(--azure)', display:'flex' }}><Phone size={15}/></a>}
                        {c.email && <a href={`mailto:${c.email}`} title="Email" style={{ color:'var(--gold)', display:'flex' }}><Mail size={15}/></a>}
                        <button onClick={()=>deleteContact(c.id)} style={{ color:'var(--text-4)', background:'none', border:'none', cursor:'pointer', display:'flex' }}><X size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth:580, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
            <div className="modal-header">
              <p className="page-label">{selectedContact?'Edit':'New'} Contact</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontFamily:'var(--serif)', fontSize:'1.4rem', fontWeight:400, color:'var(--text)' }}>
                  {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : 'Add Contact'}
                </h2>
                <button className="btn-ghost" style={{ padding:'6px' }} onClick={()=>setShowModal(false)}><X size={18}/></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex:1, overflowY:'auto' }}>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
                <div><label className="form-label">First Name *</label><input className="crm-input" value={form.first_name||''} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="First name"/></div>
                <div><label className="form-label">Last Name *</label><input className="crm-input" value={form.last_name||''} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Last name"/></div>
                <div><label className="form-label">Email</label><input type="email" className="crm-input" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@example.com"/></div>
                <div><label className="form-label">Phone</label><input className="crm-input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+1 246 xxx xxxx"/></div>
                <div>
                  <label className="form-label">Type</label>
                  <div className="crm-select-wrap"><select className="crm-select" value={form.type||'lead'} onChange={e=>setForm({...form,type:e.target.value as any})}>{TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}</select></div>
                </div>
                <div>
                  <label className="form-label">Source</label>
                  <div className="crm-select-wrap"><select className="crm-select" value={form.source||'website'} onChange={e=>setForm({...form,source:e.target.value})}>{SOURCES.map(s=><option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}</select></div>
                </div>
                <div>
                  <label className="form-label">Lifecycle Stage</label>
                  <div className="crm-select-wrap"><select className="crm-select" value={form.lifecycle_stage||'prospect'} onChange={e=>setForm({...form,lifecycle_stage:e.target.value})}>{LIFECYCLE_STAGES.map(s=><option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}</select></div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <div className="crm-select-wrap"><select className="crm-select" value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value as any})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="nurturing">Nurturing</option></select></div>
                </div>
                <div><label className="form-label">Budget Min ($)</label><input type="number" className="crm-input" value={form.budget_min||''} onChange={e=>setForm({...form,budget_min:Number(e.target.value)})} placeholder="500000"/></div>
                <div><label className="form-label">Budget Max ($)</label><input type="number" className="crm-input" value={form.budget_max||''} onChange={e=>setForm({...form,budget_max:Number(e.target.value)})} placeholder="2000000"/></div>
              </div>
              <div style={{ marginTop:14 }}>
                <label className="form-label">Notes</label>
                <textarea className="crm-input" rows={3} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Additional notes..."/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveContact} disabled={saving || !form.first_name || !form.last_name}>
                {saving?<><span className="spinner" style={{width:14,height:14}}/>Saving...</>:selectedContact?'Update Contact':'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
