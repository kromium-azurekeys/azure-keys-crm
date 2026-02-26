'use client'

import { useEffect, useState } from 'react'
import { supabase, Property, Profile } from '@/lib/supabase'
import { Search, Plus, X, Bed, Bath, Square, DollarSign, Eye } from 'lucide-react'

interface PropertiesModuleProps { profile: Profile | null }

const TYPES = ['villa', 'condo', 'townhouse', 'land', 'commercial', 'estate', 'penthouse']
const STATUSES = ['active', 'pending', 'under_contract', 'sold', 'withdrawn', 'coming_soon']

const statusColors: Record<string, string> = {
  active: '#4a8c4a', pending: '#c9a84c', under_contract: '#1e7ec8',
  sold: '#6a4a8c', withdrawn: '#8c4a4a', coming_soon: '#1a4a7a'
}

export default function PropertiesModule({ profile }: PropertiesModuleProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedProp, setSelectedProp] = useState<Property | null>(null)
  const [form, setForm] = useState<Partial<Property>>({ property_type: 'villa', status: 'active', listing_type: 'sale', country: 'Barbados' })
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<any[]>([])
  const [featuresInput, setFeaturesInput] = useState('')

  useEffect(() => { loadData() }, [search, statusFilter])

  const loadData = async () => {
    setLoading(true)
    const [{ data: props }, { data: agentsData }] = await Promise.all([
      (() => {
        let q = supabase.from('properties').select('*, profiles!assigned_agent_id(full_name)').order('created_at', { ascending: false })
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
    setForm({ property_type: 'villa', status: 'active', listing_type: 'sale', country: 'Barbados' })
    setFeaturesInput('')
    setSelectedProp(null)
    setShowModal(true)
  }

  const openEdit = (p: Property) => {
    setForm(p)
    setFeaturesInput((p.features || []).join(', '))
    setSelectedProp(p)
    setShowModal(true)
  }

  const saveProp = async () => {
    setSaving(true)
    try {
      const data = {
        ...form,
        features: featuresInput ? featuresInput.split(',').map(f => f.trim()).filter(Boolean) : []
      }
      if (selectedProp) {
        await supabase.from('properties').update(data).eq('id', selectedProp.id)
      } else {
        await supabase.from('properties').insert(data)
      }
      setShowModal(false)
      loadData()
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (p: number | null) => {
    if (!p) return 'POA'
    return p >= 1000000 ? `$${(p/1000000).toFixed(2)}M` : `$${(p/1000).toFixed(0)}K`
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)' }}>Inventory</p>
          <h1 className="serif text-4xl font-light" style={{ color: 'var(--white)' }}>
            Property <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Listings</em>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{properties.length} properties managed</p>
        </div>
        <button onClick={openNew} className="btn-gold"><Plus size={16} /> Add Listing</button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input type="text" placeholder="Search properties..." value={search} onChange={e => setSearch(e.target.value)} className="crm-input pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="crm-select" style={{ width: 160 }}>
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : properties.length === 0 ? (
        <div className="crm-card p-16 text-center">
          <p className="serif text-2xl font-light mb-3" style={{ color: 'var(--muted)' }}>No properties found</p>
          <button onClick={openNew} className="btn-gold">+ Add Property</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {properties.map(p => (
            <div key={p.id} className="crm-card overflow-hidden cursor-pointer" onClick={() => openEdit(p)}>
              {/* Image placeholder */}
              <div className="h-44 relative flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, var(--navy-mid), var(--ocean))'
              }}>
                <div className="text-center">
                  <p className="serif text-3xl font-light mb-1" style={{ color: 'rgba(201,168,76,0.3)' }}>AK</p>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(248,245,240,0.2)' }}>{p.property_type}</p>
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="text-xs px-2 py-1 capitalize" style={{
                    background: `${statusColors[p.status]}25`, color: statusColors[p.status],
                    border: `1px solid ${statusColors[p.status]}40`, fontSize: '0.65rem', letterSpacing: '0.1em'
                  }}>
                    {p.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="text-xs px-2 py-1 uppercase" style={{
                    background: 'var(--gold)', color: 'var(--navy)', fontSize: '0.65rem', letterSpacing: '0.1em'
                  }}>
                    {p.listing_type}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="serif text-lg font-light mb-1" style={{ color: 'var(--white)' }}>{p.title}</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                  {p.city ? `${p.city}, ` : ''}{p.country}
                </p>

                <p className="text-xl font-light mb-4" style={{ color: 'var(--gold)', fontFamily: 'var(--serif)' }}>
                  {formatPrice(p.price)}
                </p>

                <div className="flex gap-4 mb-3" style={{ borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: 12 }}>
                  {p.bedrooms && (
                    <div className="flex items-center gap-1">
                      <Bed size={12} style={{ color: 'var(--muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.bedrooms} Bed</span>
                    </div>
                  )}
                  {p.bathrooms && (
                    <div className="flex items-center gap-1">
                      <Bath size={12} style={{ color: 'var(--muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.bathrooms} Bath</span>
                    </div>
                  )}
                  {p.square_feet && (
                    <div className="flex items-center gap-1">
                      <Square size={12} style={{ color: 'var(--muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.square_feet.toLocaleString()} sq ft</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Agent: {(p as any).profiles?.full_name || 'Unassigned'}
                  </p>
                  <div className="flex items-center gap-1">
                    <Eye size={11} style={{ color: 'var(--muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.views_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="crm-card overflow-y-auto" style={{ width: '90%', maxWidth: 750, maxHeight: '90vh' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedProp ? 'Edit' : 'New'} Listing</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ color: 'var(--white)' }}>
                  {selectedProp ? selectedProp.title : 'Add Property'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Property Title *</label>
                <input className="crm-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Ocean Crest Villa" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Type</label>
                  <select className="crm-select" value={form.property_type || 'villa'} onChange={e => setForm({...form, property_type: e.target.value})}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Status</label>
                  <select className="crm-select" value={form.status || 'active'} onChange={e => setForm({...form, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Listing Type</label>
                  <select className="crm-select" value={form.listing_type || 'sale'} onChange={e => setForm({...form, listing_type: e.target.value})}>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                    <option value="lease_option">Lease Option</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Price (USD)</label>
                  <input type="number" className="crm-input" value={form.price || ''} onChange={e => setForm({...form, price: Number(e.target.value)})} placeholder="2500000" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>MLS Number</label>
                  <input className="crm-input" value={form.mls_number || ''} onChange={e => setForm({...form, mls_number: e.target.value})} placeholder="AK-2025-001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Address</label>
                  <input className="crm-input" value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} placeholder="Property address" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>City / Parish</label>
                  <input className="crm-input" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} placeholder="Saint James" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Island / Country</label>
                  <input className="crm-input" value={form.island || ''} onChange={e => setForm({...form, island: e.target.value})} placeholder="Barbados" />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Year Built</label>
                  <input type="number" className="crm-input" value={form.year_built || ''} onChange={e => setForm({...form, year_built: Number(e.target.value)})} placeholder="2018" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Bedrooms</label>
                  <input type="number" className="crm-input" value={form.bedrooms || ''} onChange={e => setForm({...form, bedrooms: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Bathrooms</label>
                  <input type="number" step="0.5" className="crm-input" value={form.bathrooms || ''} onChange={e => setForm({...form, bathrooms: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Sq Ft</label>
                  <input type="number" className="crm-input" value={form.square_feet || ''} onChange={e => setForm({...form, square_feet: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Lot Size (sqft)</label>
                  <input type="number" className="crm-input" value={form.lot_size || ''} onChange={e => setForm({...form, lot_size: Number(e.target.value)})} />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Features (comma separated)</label>
                <input className="crm-input" value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} placeholder="infinity pool, home theater, smart home, wine cellar" />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Assigned Agent</label>
                <select className="crm-select" value={form.assigned_agent_id || ''} onChange={e => setForm({...form, assigned_agent_id: e.target.value})}>
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>Description</label>
                <textarea className="crm-input" rows={4} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Property description..." />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveProp} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedProp ? 'Update Listing' : 'Add Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
