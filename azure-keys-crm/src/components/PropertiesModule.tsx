'use client'

import { useEffect, useState } from 'react'
import { supabase, Property, Profile } from '@/lib/supabase'
import { Search, Plus, X, Bed, Bath, Square, Eye, MapPin, Image } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/Modal'

interface PropertiesModuleProps { profile: Profile | null }

const TYPES    = ['villa','estate','penthouse','cottage','condo','townhouse','land','commercial']
const STATUSES = ['active','pending','under_contract','sold','withdrawn','coming_soon']
const ISLANDS  = ['Grand Cayman','Nassau','Eleuthera','Exuma','Jamaica','Barbados']

const statusColors: Record<string, string> = {
  active:        '#16a34a',
  pending:       '#d97706',
  under_contract:'#c9a96e',
  sold:          '#7c3aed',
  withdrawn:     '#dc2626',
  coming_soon:   '#0d1f3c',
}

// Maps the island column values to a canonical market label
function islandToMarket(island: string | null): string {
  if (!island) return 'other'
  const i = island.toLowerCase()
  if (i.includes('cayman'))                                       return 'cayman'
  if (i.includes('nassau') || i.includes('bahama') || i.includes('exuma') ||
      i.includes('eleuthera') || i.includes('bimini') ||
      i.includes('harbour island') || i.includes('harbour'))      return 'bahamas'
  if (i.includes('jamaica'))                                      return 'jamaica'
  if (i.includes('barbados'))                                     return 'barbados'
  return 'other'
}

const MARKET_LABELS: Record<string, string> = {
  all: 'All Islands', cayman: 'Cayman Islands', bahamas: 'Bahamas',
  jamaica: 'Jamaica', barbados: 'Barbados', other: 'Other',
}

export default function PropertiesModule({ profile }: PropertiesModuleProps) {
  const isMobile = useIsMobile()
  const [properties, setProperties]   = useState<Property[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [islandFilter, setIslandFilter] = useState('all')
  const [showModal, setShowModal]     = useState(false)
  const [selectedProp, setSelectedProp] = useState<Property | null>(null)
  const [form, setForm]               = useState<Partial<Property>>({ property_type:'villa', status:'active', listing_type:'sale', country:'Cayman Islands' })
  const [saving, setSaving]           = useState(false)
  const [agents, setAgents]           = useState<any[]>([])
  const [featuresInput, setFeaturesInput] = useState('')
  const [imageInput, setImageInput]       = useState('')   // newline-separated image URLs

  useEffect(() => { loadData() }, [search, statusFilter])

  const loadData = async () => {
    setLoading(true)
    const [{ data: props }, { data: agentsData }] = await Promise.all([
      (() => {
        let q = supabase
          .from('properties')
          .select('*, profiles!assigned_agent_id(full_name)')
          .order('featured', { ascending: false })
          .order('views_count', { ascending: false })
        if (search) q = q.ilike('title', `%${search}%`)
        if (statusFilter !== 'all') q = q.eq('status', statusFilter)
        return q.limit(200)           // fetch all — island filter is client-side
      })(),
      supabase.from('profiles').select('id, full_name').order('full_name')
    ])
    setProperties(props || [])
    setAgents(agentsData || [])
    setLoading(false)
  }

  // Client-side island filter
  const filtered = properties.filter(p => {
    if (islandFilter === 'all') return true
    return islandToMarket(p.island) === islandFilter
  })

  // Island counts for tab badges
  const counts = properties.reduce((acc: Record<string, number>, p) => {
    const m = islandToMarket(p.island)
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})

  const openNew  = () => {
    setForm({ property_type:'villa', status:'active', listing_type:'sale', country:'Cayman Islands' })
    setFeaturesInput(''); setImageInput(''); setSelectedProp(null); setShowModal(true)
  }
  const openEdit = (p: Property) => {
    setForm(p)
    setFeaturesInput((p.features || []).join(', '))
    // Parse images from JSONB column
    const imgs = (p as any).images
    const arr  = Array.isArray(imgs) ? imgs : (typeof imgs === 'string' ? (() => { try { return JSON.parse(imgs) } catch { return [] } })() : [])
    setImageInput(arr.join('\n'))
    setSelectedProp(p); setShowModal(true)
  }

  const saveProp = async () => {
    setSaving(true)
    try {
      // Parse image URLs — one per line, strip empty lines
      const images = imageInput
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.startsWith('http'))

      const data = {
        ...form,
        features: featuresInput ? featuresInput.split(',').map(f => f.trim()).filter(Boolean) : [],
        images,
      }
      if (selectedProp) {
        await supabase.from('properties').update(data).eq('id', selectedProp.id)
      } else {
        await supabase.from('properties').insert(data)
      }
      setShowModal(false); loadData()
    } finally { setSaving(false) }
  }

  const formatPrice = (p: number | null) => {
    if (!p) return 'POA'
    if (p >= 1000000) return `$${(p / 1000000).toFixed(2)}M`
    return `$${p.toLocaleString()}`
  }

  // Resolve hero image from the images JSONB column
  const heroImage = (p: Property): string | null => {
    const imgs = (p as any).images
    if (!imgs) return null
    const arr = Array.isArray(imgs) ? imgs : (typeof imgs === 'string' ? JSON.parse(imgs) : [])
    return arr.length > 0 ? arr[0] : null
  }

  const pad = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ padding: pad, borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <p className="page-label">Inventory</p>
          <h1 className="page-title">Property <em>Listings</em></h1>
          <p className="page-sub">{filtered.length} of {properties.length} properties</p>
        </div>
        <button className="btn-gold" onClick={openNew}><Plus size={15}/> Add Listing</button>
      </div>

      {/* Search + Status filter */}
      <div style={{ padding: isMobile ? '12px 16px' : '12px 32px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', gap:10, flexWrap:'wrap' }}>
        <div className="search-wrap" style={{ flex:1, minWidth:160 }}>
          <Search size={15} className="search-icon"/>
          <input className="search-input" placeholder="Search properties..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="filter-tabs" style={{ overflowX:'auto', flexWrap:'nowrap' }}>
          {['all', ...STATUSES].map(s => (
            <button key={s} className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)} style={{ whiteSpace:'nowrap' }}>
              {s === 'all' ? `All (${properties.length})` : s.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Island filter tabs */}
      <div style={{ padding: isMobile ? '10px 16px' : '10px 32px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <div className="filter-tabs" style={{ overflowX:'auto', flexWrap:'nowrap' }}>
          {['all','cayman','bahamas','jamaica','barbados'].map(m => {
            const cnt = m === 'all' ? properties.length : (counts[m] || 0)
            return (
              <button key={m} className={`filter-tab${islandFilter === m ? ' active' : ''}`}
                onClick={() => setIslandFilter(m)} style={{ whiteSpace:'nowrap' }}>
                {MARKET_LABELS[m]} ({cnt})
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: isMobile ? 16 : '24px 32px' }}>
        {loading ? (
          <div style={{ padding:48, display:'flex', justifyContent:'center' }}><div className="spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <p className="empty-title">No properties found</p>
              <p className="empty-sub">Try adjusting your filters or add a new listing</p>
              <button className="btn-gold" onClick={openNew} style={{ marginTop:12 }}><Plus size={14}/> Add Property</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 12 : 20 }}>
            {filtered.map(p => {
              const img = heroImage(p)
              return (
                <div key={p.id} className="card" style={{ overflow:'hidden', cursor:'pointer' }} onClick={() => openEdit(p)}>
                  {/* Image / placeholder */}
                  <div style={{ height: isMobile ? 140 : 180, position:'relative', overflow:'hidden', background:'#0a0d12' }}>
                    {img ? (
                      <img
                        src={img}
                        alt={p.title}
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style')
                        }}
                      />
                    ) : null}
                    {/* Fallback shown when no image or image fails */}
                    <div style={{
                      display: img ? 'none' : 'flex',
                      alignItems:'center', justifyContent:'center',
                      width:'100%', height:'100%',
                      background:'linear-gradient(135deg,#0a0d12,#1a2d50)',
                      flexDirection:'column', gap:6,
                    }}>
                      <Image size={24} style={{ color:'rgba(201,169,110,0.25)' }}/>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.15)', letterSpacing:'0.1em', textTransform:'uppercase' }}>{p.property_type}</p>
                    </div>

                    {/* Status badge */}
                    <div style={{ position:'absolute', top:10, left:10 }}>
                      <span style={{
                        background:`${statusColors[p.status] || '#888'}28`,
                        color: statusColors[p.status] || '#888',
                        border:`1px solid ${statusColors[p.status] || '#888'}45`,
                        fontSize:10, padding:'3px 8px', borderRadius:3,
                        letterSpacing:'0.07em', textTransform:'capitalize',
                        backdropFilter:'blur(4px)',
                      }}>
                        {p.status.replace(/_/g,' ')}
                      </span>
                    </div>

                    {/* Badge (off-market, price reduced etc) */}
                    {(p as any).badge && (
                      <div style={{ position:'absolute', top:10, right:10 }}>
                        <span style={{
                          background:'var(--gold)', color:'#0a0d12',
                          fontSize:9, padding:'3px 7px', borderRadius:3,
                          fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
                        }}>
                          {(p as any).badge}
                        </span>
                      </div>
                    )}

                    {/* Featured dot */}
                    {(p as any).featured && (
                      <div style={{ position:'absolute', bottom:10, right:10, width:8, height:8, borderRadius:'50%', background:'var(--gold)' }}/>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: isMobile ? '12px 14px' : '14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, marginBottom:2 }}>
                      <p style={{ fontFamily:'var(--serif)', fontSize: isMobile ? '1rem' : '1.05rem', fontWeight:400, color:'var(--text)', lineHeight:1.25 }}>{p.title}</p>
                    </div>
                    <p style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'var(--text-3)', marginBottom:8 }}>
                      <MapPin size={10}/>
                      {[p.city, p.island, p.country].filter(Boolean).slice(0, 2).join(', ')}
                    </p>
                    <p style={{ fontFamily:'var(--serif)', fontSize: isMobile ? '1rem' : '1.1rem', color:'var(--gold)', marginBottom:10 }}>{formatPrice(p.price)}</p>
                    <div style={{ display:'flex', gap:12, borderTop:'1px solid var(--border)', paddingTop:10, alignItems:'center' }}>
                      {p.bedrooms && (
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <Bed size={11} style={{ color:'var(--text-3)' }}/>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>{p.bedrooms}</span>
                        </div>
                      )}
                      {p.bathrooms && (
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <Bath size={11} style={{ color:'var(--text-3)' }}/>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>{p.bathrooms}</span>
                        </div>
                      )}
                      {p.square_feet && (
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          <Square size={11} style={{ color:'var(--text-3)' }}/>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>{p.square_feet.toLocaleString()} ft²</span>
                        </div>
                      )}
                      <div style={{ marginLeft:'auto', display:'flex', gap:4, alignItems:'center' }}>
                        <Eye size={11} style={{ color:'var(--text-3)' }}/>
                        <span style={{ fontSize:11, color:'var(--text-3)' }}>{p.views_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit / Add modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth:680 }}>
            <div className="modal-header">
              <div>
                <p className="page-label">{selectedProp ? 'Edit' : 'New'} Listing</p>
                <h2 style={{ fontFamily:'var(--serif)', fontSize:'1.4rem', fontWeight:400 }}>{selectedProp ? selectedProp.title : 'Add Property'}</h2>
              </div>
              <button className="btn-ghost" style={{ padding:6 }} onClick={() => setShowModal(false)}><X size={18}/></button>
            </div>

            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label className="form-label">Property Title *</label>
                <input className="crm-input" value={form.title||''} onChange={e => setForm({...form, title:e.target.value})} placeholder="e.g. Horizon Cove"/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:12 }}>
                <div><label className="form-label">Type</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.property_type||'villa'} onChange={e => setForm({...form, property_type:e.target.value})}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status||'active'} onChange={e => setForm({...form, status:e.target.value})}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Listing Type</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.listing_type||'sale'} onChange={e => setForm({...form, listing_type:e.target.value})}>
                      <option value="sale">For Sale</option>
                      <option value="rent">For Rent</option>
                      <option value="lease_option">Lease Option</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                <div><label className="form-label">Price (USD)</label>
                  <input type="number" className="crm-input" value={form.price||''} onChange={e => setForm({...form, price:Number(e.target.value)})} placeholder="2500000"/>
                </div>
                <div><label className="form-label">MLS Number</label>
                  <input className="crm-input" value={form.mls_number||''} onChange={e => setForm({...form, mls_number:e.target.value})} placeholder="AK-KY-2025-001"/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                <div><label className="form-label">Address</label>
                  <input className="crm-input" value={form.address||''} onChange={e => setForm({...form, address:e.target.value})} placeholder="Property address"/>
                </div>
                <div><label className="form-label">City / Parish</label>
                  <input className="crm-input" value={form.city||''} onChange={e => setForm({...form, city:e.target.value})} placeholder="Seven Mile Beach"/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12 }}>
                <div><label className="form-label">Island</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.island||''} onChange={e => setForm({...form, island:e.target.value})}>
                      <option value="">Select island</option>
                      {ISLANDS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="form-label">Country</label>
                  <input className="crm-input" value={form.country||''} onChange={e => setForm({...form, country:e.target.value})} placeholder="Cayman Islands"/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12 }}>
                <div><label className="form-label">Bedrooms</label>
                  <input type="number" className="crm-input" value={form.bedrooms||''} onChange={e => setForm({...form, bedrooms:Number(e.target.value)})}/>
                </div>
                <div><label className="form-label">Bathrooms</label>
                  <input type="number" step="0.5" className="crm-input" value={form.bathrooms||''} onChange={e => setForm({...form, bathrooms:Number(e.target.value)})}/>
                </div>
                <div><label className="form-label">Sq Ft</label>
                  <input type="number" className="crm-input" value={form.square_feet||''} onChange={e => setForm({...form, square_feet:Number(e.target.value)})}/>
                </div>
                <div><label className="form-label">Year Built</label>
                  <input type="number" className="crm-input" value={form.year_built||''} onChange={e => setForm({...form, year_built:Number(e.target.value)})} placeholder="2018"/>
                </div>
              </div>
              <div><label className="form-label">Features (comma separated)</label>
                <input className="crm-input" value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} placeholder="infinity pool, home theater, smart home"/>
              </div>

              {/* Images — shown on website and CRM cards */}
              <div style={{ padding:'12px 14px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8 }}>
                <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:10 }}>
                  Gallery Images — Website & CRM
                </p>

                {/* Live preview of current images */}
                {imageInput.split('\n').filter(u => u.trim().startsWith('http')).length > 0 && (
                  <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:12, paddingBottom:4 }}>
                    {imageInput.split('\n').filter(u => u.trim().startsWith('http')).map((url, i) => (
                      <img
                        key={i}
                        src={url.trim()}
                        alt={`Gallery ${i + 1}`}
                        style={{ height:70, width:110, objectFit:'cover', borderRadius:5, flexShrink:0, border:'1px solid var(--border)' }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                      />
                    ))}
                  </div>
                )}

                <div>
                  <label className="form-label">Image URLs — one per line (first is hero/card image)</label>
                  <textarea
                    className="crm-input"
                    rows={4}
                    value={imageInput}
                    onChange={e => setImageInput(e.target.value)}
                    placeholder={"https://images.unsplash.com/photo-example1?w=1400\nhttps://images.unsplash.com/photo-example2?w=1400\nhttps://images.unsplash.com/photo-example3?w=1400"}
                    style={{ fontFamily:'monospace', fontSize:12 }}
                  />
                  <p style={{ fontSize:11, color:'var(--text-4)', marginTop:5 }}>
                    Paste full URLs — Unsplash, Cloudinary, Supabase Storage, or any public image host.
                    Changes save to Supabase and update the website immediately.
                  </p>
                </div>
              </div>

              {/* Website display options */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="form-label">Website Badge (optional)</label>
                  <input className="crm-input" value={(form as any).badge||''} onChange={e => setForm({...form, badge:e.target.value} as any)} placeholder="e.g. Off-Market · New Listing · Price Reduced"/>
                </div>
                <div>
                  <label className="form-label">Website Subtitle (optional)</label>
                  <input className="crm-input" value={(form as any).subtitle||''} onChange={e => setForm({...form, subtitle:e.target.value} as any)} placeholder="e.g. Seven Mile Beach Beachfront Estate"/>
                </div>
              </div>
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-2)', cursor:'pointer' }}>
                  <input type="checkbox" checked={!!(form as any).featured} onChange={e => setForm({...form, featured:e.target.checked} as any)}
                    style={{ accentColor:'var(--gold)', width:14, height:14 }} />
                  Featured on homepage (appears in the 6-listing showcase)
                </label>
              </div>
              <div><label className="form-label">Assigned Agent</label>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={form.assigned_agent_id||''} onChange={e => setForm({...form, assigned_agent_id:e.target.value})}>
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Description</label>
                <textarea className="crm-input" rows={4} value={form.description||''} onChange={e => setForm({...form, description:e.target.value})} placeholder="Property description..."/>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-gold" onClick={saveProp} disabled={saving || !form.title}>
                {saving ? 'Saving...' : selectedProp ? 'Update Listing' : 'Add Listing'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
