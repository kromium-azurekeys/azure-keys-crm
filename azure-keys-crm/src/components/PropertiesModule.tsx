'use client'

import { useEffect, useState } from 'react'
import { supabase, Property, Profile } from '@/lib/supabase'
import { Search, Plus, X, Bed, Bath, Square, Eye } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface PropertiesModuleProps { profile: Profile | null }

const TYPES = ['villa','condo','townhouse','land','commercial','estate','penthouse']
const STATUSES = ['active','pending','under_contract','sold','withdrawn','coming_soon']

const statusColors: Record<string,string> = {
  active:'#16a34a', pending:'#d97706', under_contract:'#1a6fb5',
  sold:'#7c3aed', withdrawn:'#dc2626', coming_soon:'#0d1f3c'
}

export default function PropertiesModule({ profile }: PropertiesModuleProps) {
  const isMobile = useIsMobile()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedProp, setSelectedProp] = useState<Property | null>(null)
  const [form, setForm] = useState<Partial<Property>>({ property_type:'villa', status:'active', listing_type:'sale', country:'Barbados' })
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<any[]>([])
  const [featuresInput, setFeaturesInput] = useState('')

  useEffect(() => { loadData() }, [search, statusFilter])

  const loadData = async () => {
    setLoading(true)
    const [{ data: props }, { data: agentsData }] = await Promise.all([
      (() => {
        let q = supabase.from('properties').select('*, profiles!assigned_agent_id(full_name)').order('created_at', { ascending:false })
        if (search) q = q.ilike('title', `%${search}%`)
        if (statusFilter !== 'all') q = q.eq('status', statusFilter)
        return q.limit(100)
      })(),
      supabase.from('profiles').select('id, full_name').order('full_name')
    ])
    setProperties(props || [])
    setAgents(agentsData || [])
    setLoading(false)
  }

  const openNew = () => {
    setForm({ property_type:'villa', status:'active', listing_type:'sale', country:'Barbados' })
    setFeaturesInput(''); setSelectedProp(null); setShowModal(true)
  }
  const openEdit = (p: Property) => {
    setForm(p); setFeaturesInput((p.features||[]).join(', ')); setSelectedProp(p); setShowModal(true)
  }

  const saveProp = async () => {
    setSaving(true)
    try {
      const data = { ...form, features: featuresInput ? featuresInput.split(',').map(f=>f.trim()).filter(Boolean) : [] }
      if (selectedProp) {
        await supabase.from('properties').update(data).eq('id', selectedProp.id)
      } else {
        await supabase.from('properties').insert(data)
      }
      setShowModal(false); loadData()
    } finally { setSaving(false) }
  }

  const formatPrice = (p: number|null) => {
    if (!p) return 'Price on request'
    if (p>=1000000) return `$${(p/1000000).toFixed(2)}M`
    return `$${p.toLocaleString()}`
  }

  const pad = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      <div style={{ padding: pad, borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <p className="page-label">Inventory</p>
          <h1 className="page-title" style={{ fontSize: isMobile ? '1.6rem' : undefined }}>Property <em>Listings</em></h1>
          <p className="page-sub">{properties.length} properties</p>
        </div>
        <button className="btn-gold" onClick={openNew}><Plus size={15}/>Add Listing</button>
      </div>

      <div style={{ padding: isMobile ? '12px 16px' : '14px 32px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', gap:10, flexWrap:'wrap' }}>
        <div className="search-wrap" style={{ flex:1, minWidth:160 }}>
          <Search size={15} className="search-icon"/>
          <input className="search-input" placeholder="Search properties..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="filter-tabs" style={{ overflowX:'auto', flexWrap:'nowrap' }}>
          {['all',...STATUSES].map(s=>(
            <button key={s} className={`filter-tab ${statusFilter===s?'active':''}`} onClick={()=>setStatusFilter(s)} style={{ whiteSpace:'nowrap' }}>
              {s==='all'?'All':s.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: isMobile ? 16 : '24px 32px' }}>
        {loading ? (
          <div style={{ padding:48, display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
        ) : properties.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p className="empty-title">No properties found</p>
              <button className="btn-gold" onClick={openNew} style={{ marginTop:12 }}><Plus size={14}/>Add Property</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 12 : 20 }}>
            {properties.map(p => (
              <div key={p.id} className="card" style={{ overflow:'hidden', cursor:'pointer' }} onClick={()=>openEdit(p)}>
                <div style={{ height: isMobile ? 120 : 160, background:'linear-gradient(135deg, var(--navy), #1a3a6a)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontFamily:'var(--serif)', fontSize:'2rem', color:'rgba(184,149,63,0.3)', fontWeight:400 }}>AK</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{p.property_type}</p>
                  </div>
                  <div style={{ position:'absolute', top:10, left:10 }}>
                    <span style={{ background:`${statusColors[p.status]}25`, color:statusColors[p.status], border:`1px solid ${statusColors[p.status]}40`, fontSize:10, padding:'3px 8px', borderRadius:3, letterSpacing:'0.08em' }}>
                      {p.status.replace(/_/g,' ')}
                    </span>
                  </div>
                </div>
                <div style={{ padding: isMobile ? '12px 14px' : '16px' }}>
                  <p style={{ fontFamily:'var(--serif)', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight:400, color:'var(--text)', marginBottom:2 }}>{p.title}</p>
                  <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{p.city?`${p.city}, `:''}{p.country}</p>
                  <p style={{ fontFamily:'var(--serif)', fontSize: isMobile ? '1rem' : '1.15rem', color:'var(--gold)', marginBottom:10 }}>{formatPrice(p.price)}</p>
                  <div style={{ display:'flex', gap:12, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                    {p.bedrooms && <div style={{ display:'flex', gap:4, alignItems:'center' }}><Bed size={11} style={{color:'var(--text-3)'}}/><span style={{fontSize:11,color:'var(--text-3)'}}>{p.bedrooms}</span></div>}
                    {p.bathrooms && <div style={{ display:'flex', gap:4, alignItems:'center' }}><Bath size={11} style={{color:'var(--text-3)'}}/><span style={{fontSize:11,color:'var(--text-3)'}}>{p.bathrooms}</span></div>}
                    {p.square_feet && <div style={{ display:'flex', gap:4, alignItems:'center' }}><Square size={11} style={{color:'var(--text-3)'}}/><span style={{fontSize:11,color:'var(--text-3)'}}>{p.square_feet.toLocaleString()} ft²</span></div>}
                    <div style={{ marginLeft:'auto', display:'flex', gap:4, alignItems:'center' }}><Eye size={11} style={{color:'var(--text-3)'}}/><span style={{fontSize:11,color:'var(--text-3)'}}>{p.views_count}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth:680, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p className="page-label">{selectedProp?'Edit':'New'} Listing</p>
                  <h2 style={{ fontFamily:'var(--serif)', fontSize:'1.4rem', fontWeight:400 }}>{selectedProp?selectedProp.title:'Add Property'}</h2>
                </div>
                <button className="btn-ghost" style={{padding:6}} onClick={()=>setShowModal(false)}><X size={18}/></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex:1, overflowY:'auto' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div><label className="form-label">Property Title *</label><input className="crm-input" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Ocean Crest Villa"/></div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:12 }}>
                  <div><label className="form-label">Type</label><div className="crm-select-wrap"><select className="crm-select" value={form.property_type||'villa'} onChange={e=>setForm({...form,property_type:e.target.value})}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div>
                  <div><label className="form-label">Status</label><div className="crm-select-wrap"><select className="crm-select" value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value})}>{STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></div></div>
                  <div><label className="form-label">Listing Type</label><div className="crm-select-wrap"><select className="crm-select" value={form.listing_type||'sale'} onChange={e=>setForm({...form,listing_type:e.target.value})}><option value="sale">For Sale</option><option value="rent">For Rent</option><option value="lease_option">Lease Option</option></select></div></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                  <div><label className="form-label">Price (USD)</label><input type="number" className="crm-input" value={form.price||''} onChange={e=>setForm({...form,price:Number(e.target.value)})} placeholder="2500000"/></div>
                  <div><label className="form-label">MLS Number</label><input className="crm-input" value={form.mls_number||''} onChange={e=>setForm({...form,mls_number:e.target.value})} placeholder="AK-2025-001"/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                  <div><label className="form-label">Address</label><input className="crm-input" value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Property address"/></div>
                  <div><label className="form-label">City / Parish</label><input className="crm-input" value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Saint James"/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                  <div><label className="form-label">Island / Country</label><input className="crm-input" value={form.island||''} onChange={e=>setForm({...form,island:e.target.value})} placeholder="Barbados"/></div>
                  <div><label className="form-label">Year Built</label><input type="number" className="crm-input" value={form.year_built||''} onChange={e=>setForm({...form,year_built:Number(e.target.value)})} placeholder="2018"/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12 }}>
                  <div><label className="form-label">Bedrooms</label><input type="number" className="crm-input" value={form.bedrooms||''} onChange={e=>setForm({...form,bedrooms:Number(e.target.value)})}/></div>
                  <div><label className="form-label">Bathrooms</label><input type="number" step="0.5" className="crm-input" value={form.bathrooms||''} onChange={e=>setForm({...form,bathrooms:Number(e.target.value)})}/></div>
                  <div><label className="form-label">Sq Ft</label><input type="number" className="crm-input" value={form.square_feet||''} onChange={e=>setForm({...form,square_feet:Number(e.target.value)})}/></div>
                  <div><label className="form-label">Lot Size</label><input type="number" className="crm-input" value={form.lot_size||''} onChange={e=>setForm({...form,lot_size:Number(e.target.value)})}/></div>
                </div>
                <div><label className="form-label">Features (comma separated)</label><input className="crm-input" value={featuresInput} onChange={e=>setFeaturesInput(e.target.value)} placeholder="infinity pool, home theater, smart home"/></div>
                <div><label className="form-label">Assigned Agent</label><div className="crm-select-wrap"><select className="crm-select" value={form.assigned_agent_id||''} onChange={e=>setForm({...form,assigned_agent_id:e.target.value})}><option value="">Unassigned</option>{agents.map(a=><option key={a.id} value={a.id}>{a.full_name}</option>)}</select></div></div>
                <div><label className="form-label">Description</label><textarea className="crm-input" rows={4} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Property description..."/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveProp} disabled={saving||!form.title}>{saving?'Saving...':selectedProp?'Update Listing':'Add Listing'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
