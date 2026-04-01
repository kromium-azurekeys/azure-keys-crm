'use client'

import { useEffect, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { supabase } from '@/lib/supabase'
import { Zap, Star } from 'lucide-react'

interface SmartMatchingProps { profile: any }

export default function SmartMatching({ profile }: SmartMatchingProps) {
  const isMobile = useIsMobile()
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [criteria, setCriteria] = useState({
    budgetMin: '',
    budgetMax: '',
    island: '',
    propertyType: '',
    intent: '',
    selectedContact: '',
    minBeds: '',
  })

  useEffect(() => { loadData() }, [])
  useEffect(() => { runMatch() }, [criteria, properties, contacts])

  const loadData = async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, budget_min, budget_max, preferred_locations, property_types, bedrooms_min').order('first_name'),
      supabase.from('properties').select('*').eq('status', 'active').order('price')
    ])
    setContacts(c || [])
    setProperties(p || [])
    setLoading(false)
  }

  const runMatch = () => {
    let scored = properties.map(p => {
      let score = 0
      const reasons: string[] = []

      // Budget match
      const min = criteria.budgetMin ? Number(criteria.budgetMin) : null
      const max = criteria.budgetMax ? Number(criteria.budgetMax) : null
      if (p.price && min && p.price >= min) { score += 25; reasons.push('Within budget range') }
      if (p.price && max && p.price <= max) { score += 25 }

      // Island
      if (criteria.island && (p.island || p.country || '').toLowerCase().includes(criteria.island.toLowerCase())) {
        score += 20; reasons.push(`Located in ${criteria.island}`)
      }

      // Property type
      if (criteria.propertyType && p.property_type?.toLowerCase() === criteria.propertyType.toLowerCase()) {
        score += 20; reasons.push(`Matches property type`)
      }

      // Bedrooms
      if (criteria.minBeds && p.bedrooms && p.bedrooms >= Number(criteria.minBeds)) {
        score += 10; reasons.push(`${p.bedrooms} bedrooms`)
      }

      // Populate from selected contact profile
      if (criteria.selectedContact) {
        const contact = contacts.find(c => c.id === criteria.selectedContact)
        if (contact) {
          if (contact.budget_min && p.price && p.price >= contact.budget_min) score += 5
          if (contact.budget_max && p.price && p.price <= contact.budget_max) score += 5
          if (contact.property_types?.includes(p.property_type)) { score += 10; reasons.push('Matches buyer preferences') }
        }
      }

      return { ...p, score: Math.min(score, 100), reasons }
    }).filter(p => p.score > 0).sort((a, b) => b.score - a.score)

    setMatches(scored)
  }

  const fmt = (n: number) => {
    if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`
    return `$${(n/1000).toFixed(0)}K`
  }

  const selectContact = (id: string) => {
    const contact = contacts.find(c => c.id === id)
    if (contact) {
      setCriteria(prev => ({
        ...prev,
        selectedContact: id,
        budgetMin: contact.budget_min ? String(contact.budget_min) : prev.budgetMin,
        budgetMax: contact.budget_max ? String(contact.budget_max) : prev.budgetMax,
        propertyType: contact.property_types?.[0] || prev.propertyType,
        minBeds: contact.bedrooms_min ? String(contact.bedrooms_min) : prev.minBeds,
      }))
    } else {
      setCriteria(prev => ({ ...prev, selectedContact: id }))
    }
  }

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p className="page-label">Caribbean Intelligence</p>
        <h1 className="page-title">Smart <em>Matching Engine</em></h1>
        <p className="page-sub">AI-powered buyer–property matching for luxury Caribbean real estate</p>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>
        {/* Criteria panel */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 16, color: 'var(--text)' }}>Match Criteria</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Select Buyer (Optional)</label>
              <div className="crm-select-wrap">
                <select className="crm-select" value={criteria.selectedContact} onChange={e => selectContact(e.target.value)}>
                  <option value="">— Manual criteria —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="form-label">Budget Min</label>
                <input className="crm-input" type="number" placeholder="$" value={criteria.budgetMin} onChange={e => setCriteria(p => ({ ...p, budgetMin: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Budget Max</label>
                <input className="crm-input" type="number" placeholder="$" value={criteria.budgetMax} onChange={e => setCriteria(p => ({ ...p, budgetMax: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="form-label">Island Preference</label>
              <div className="crm-select-wrap">
                <select className="crm-select" value={criteria.island} onChange={e => setCriteria(p => ({ ...p, island: e.target.value }))}>
                  <option value="">Any island</option>
                  {['Barbados', 'Grenada', 'Dominica', 'St Kitts & Nevis', 'Antigua', 'St Lucia', 'Jamaica'].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Property Type</label>
              <div className="crm-select-wrap">
                <select className="crm-select" value={criteria.propertyType} onChange={e => setCriteria(p => ({ ...p, propertyType: e.target.value }))}>
                  <option value="">Any type</option>
                  {['villa', 'condo', 'penthouse', 'estate', 'townhouse', 'land'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Min. Bedrooms</label>
              <div className="crm-select-wrap">
                <select className="crm-select" value={criteria.minBeds} onChange={e => setCriteria(p => ({ ...p, minBeds: e.target.value }))}>
                  <option value="">Any</option>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--azure-pale)', borderRadius: 8, fontSize: 12, color: 'var(--gold)', border: '1px solid var(--azure-border)' }}>
              ⚡ Matches update in real-time as you adjust criteria
            </div>
          </div>
        </div>

        {/* Results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontWeight: 600, color: 'var(--text)' }}>
              {matches.length > 0 ? `${matches.length} properties matched` : 'No matches — adjust criteria'}
            </p>
            {matches.length > 0 && <span className="badge badge-gold">{matches.length} results</span>}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : matches.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Zap size={22} /></div>
                <p className="empty-title">No matches found</p>
                <p className="empty-sub">Try broadening your search criteria, or add more active listings</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {matches.map(p => (
                <div key={p.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  {/* Score ring */}
                  <div style={{ flexShrink: 0, textAlign: 'center', width: 56 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: p.score >= 70 ? 'var(--green-pale)' : p.score >= 40 ? 'var(--gold-pale)' : 'var(--surface-2)',
                      border: `2px solid ${p.score >= 70 ? 'var(--green)' : p.score >= 40 ? 'var(--gold)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: p.score >= 70 ? 'var(--green)' : p.score >= 40 ? 'var(--gold)' : 'var(--text-3)' }}>
                        {p.score}%
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>match</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{p.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {p.city || p.island || p.country} · {p.property_type} · {p.bedrooms || '—'} bed {p.bathrooms || '—'} bath
                        </p>
                      </div>
                      <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>
                        {p.price ? fmt(p.price) : '—'}
                      </p>
                    </div>
                    {p.reasons.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.reasons.map((r: string, i: number) => (
                          <span key={i} className="badge badge-green" style={{ fontSize: 10 }}>✓ {r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
