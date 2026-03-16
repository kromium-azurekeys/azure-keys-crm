'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Globe, DollarSign, Search, RefreshCw, ChevronDown,
  ShieldCheck, AlertTriangle, FileText, Users, TrendingUp,
  X, Plus, Edit2, Check, Info, ArrowRight
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ForeignBuyerModuleProps { profile: any }

// ── Currency config ────────────────────────────────────────────
const CURRENCIES = [
  { code: 'USD', symbol: '$',  name: 'US Dollar',         flag: '🇺🇸' },
  { code: 'GBP', symbol: '£',  name: 'British Pound',     flag: '🇬🇧' },
  { code: 'EUR', symbol: '€',  name: 'Euro',              flag: '🇪🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',   flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',       flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',      flag: '🇯🇵' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',  flag: '🇸🇬' },
  { code: 'AED', symbol: 'د.إ',name: 'UAE Dirham',        flag: '🇦🇪' },
  { code: 'NGN', symbol: '₦',  name: 'Nigerian Naira',    flag: '🇳🇬' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real',    flag: '🇧🇷' },
  { code: 'MXN', symbol: '$',  name: 'Mexican Peso',      flag: '🇲🇽' },
  { code: 'ZAR', symbol: 'R',  name: 'South African Rand',flag: '🇿🇦' },
  { code: 'GHS', symbol: '₵',  name: 'Ghanaian Cedi',     flag: '🇬🇭' },
  { code: 'KYD', symbol: '$',  name: 'Cayman Dollar',     flag: '🇰🇾' },
  { code: 'BSD', symbol: '$',  name: 'Bahamian Dollar',   flag: '🇧🇸' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar',   flag: '🇯🇲' },
]

// Approximate static rates vs USD (updated periodically in production)
const RATES_TO_USD: Record<string, number> = {
  USD: 1.000, GBP: 1.270, EUR: 1.085, CAD: 0.737, AUD: 0.648,
  CHF: 1.125, JPY: 0.0066, SGD: 0.748, AED: 0.272, NGN: 0.00063,
  BRL: 0.196, MXN: 0.052, ZAR: 0.055, GHS: 0.064,
  KYD: 1.200, BSD: 1.000, JMD: 0.0064,
}

// ── Foreign ownership rules per island ────────────────────────
const OWNERSHIP_RULES: Record<string, { license: string; threshold: string; notes: string; risk: 'low' | 'medium' | 'high' }> = {
  'Grand Cayman':    { license: 'None required', threshold: 'No restriction', notes: 'No foreign ownership restrictions. Stamp duty 7.5%. No income/capital gains tax.', risk: 'low' },
  'Nassau':          { license: 'International Persons Landholding Act permit', threshold: 'All purchases', notes: 'All non-Bahamian buyers need IPTA permit. Straightforward for property <5 acres. Permanent residence available from $750K.', risk: 'medium' },
  'Harbour Island':  { license: 'IPTA permit', threshold: 'All purchases', notes: 'Same as Nassau/Bahamas. Island-specific restrictions on undeveloped land.', risk: 'medium' },
  'Exuma':           { license: 'IPTA permit + EPA clearance', threshold: 'All purchases', notes: 'Additional environmental permit required for cays and waterfront land. Longer processing.', risk: 'high' },
  'Jamaica':         { license: 'Acquisition of Land (Foreign Nationals) Permit', threshold: 'Over 1 acre', notes: 'Purchases over 1 acre require permit. Round Hill, Tryall Club have streamlined processes. Transfer tax 1.5% + stamp duty.', risk: 'medium' },
  'Barbados':        { license: 'None for SERP holders; others need Central Bank approval', threshold: 'Varies', notes: 'SERP holders exempted. Others need Central Bank of Barbados FX approval. 2.5% stamp duty.', risk: 'medium' },
  'Cayman Islands':  { license: 'None required', threshold: 'No restriction', notes: 'No foreign ownership restrictions. Stamp duty 7.5%. Zero tax jurisdiction.', risk: 'low' },
}

// Source of funds status
const SOF_STATUSES = ['Not Started', 'Documents Requested', 'Under Review', 'Verified', 'Enhanced DD Required', 'Cleared']
const sofBadge: Record<string, string> = {
  'Not Started': 'badge-gray',
  'Documents Requested': 'badge-orange',
  'Under Review': 'badge-gold',
  'Verified': 'badge-green',
  'Enhanced DD Required': 'badge-red',
  'Cleared': 'badge-green',
}

// Nationalities (selected HNW source markets for Caribbean)
const NATIONALITIES = [
  'American','British','Canadian','French','Italian','German','Swiss',
  'Dutch','Belgian','Spanish','Portuguese','Australian','Japanese','Singaporean',
  'Emirati','Nigerian','Ghanaian','South African','Brazilian','Mexican',
  'Jamaican','Bahamian','Caymanian','Barbadian','Russian','Chinese','Indian',
  'Other',
]

interface BuyerProfile {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  type: string
  budget_min: number | null
  budget_max: number | null
  preferred_locations: string[]
  notes: string | null
  tags: string[]
  // Extended foreign buyer fields stored in tags/notes for now,
  // parsed from a structured tag format __fb_json__:{...}
  _fb?: {
    nationality?: string
    home_currency?: string
    sof_status?: string
    alien_license_status?: string
    tax_treaty_notes?: string
    passport_verified?: boolean
    preferred_ownership_structure?: string
    aml_flag?: boolean
  }
}

function parseFB(contact: any): BuyerProfile['_fb'] {
  const tag = (contact.tags || []).find((t: string) => t.startsWith('__fb__'))
  if (!tag) return {}
  try { return JSON.parse(tag.replace('__fb__', '')) } catch { return {} }
}

function serializeFB(data: BuyerProfile['_fb']): string {
  return '__fb__' + JSON.stringify(data)
}

function fmt(n: number, symbol: string): string {
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${symbol}${(n / 1_000).toFixed(0)}K`
  return `${symbol}${n.toFixed(0)}`
}

function convertAmount(amount: number, from: string, to: string): number {
  const inUSD = amount / (RATES_TO_USD[from] || 1)
  return inUSD * (RATES_TO_USD[to] || 1)
}

export default function ForeignBuyerModule({ profile }: ForeignBuyerModuleProps) {
  const isMobile = useIsMobile()
  const [contacts, setContacts] = useState<BuyerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [natFilter, setNatFilter] = useState('all')
  const [sofFilter, setSofFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<BuyerProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profiles' | 'converter' | 'ownership'>('profiles')

  // Converter state
  const [convAmount, setConvAmount] = useState('1000000')
  const [convFrom, setConvFrom] = useState('GBP')
  const [convTo, setConvTo] = useState('USD')

  // Profile form
  const [fb, setFb] = useState<NonNullable<BuyerProfile['_fb']>>({})
  const [selectedIsland, setSelectedIsland] = useState('Grand Cayman')

  useEffect(() => { loadContacts() }, [search, natFilter, sofFilter])

  const loadContacts = async () => {
    setLoading(true)
    let q = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, type, budget_min, budget_max, preferred_locations, notes, tags')
      .in('type', ['lead', 'prospect', 'client', 'past_client'])
      .order('created_at', { ascending: false })

    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

    const { data } = await q.limit(200)
    let parsed = (data || []).map((c: any) => ({ ...c, _fb: parseFB(c) }))

    if (natFilter !== 'all') parsed = parsed.filter(c => c._fb?.nationality === natFilter)
    if (sofFilter !== 'all') parsed = parsed.filter(c => (c._fb?.sof_status || 'Not Started') === sofFilter)

    setContacts(parsed)
    setLoading(false)
  }

  const openProfile = (c: BuyerProfile) => {
    setSelected(c)
    setFb(c._fb || {})
    setShowModal(true)
  }

  const openNew = () => {
    setSelected(null)
    setFb({})
    setShowModal(true)
  }

  const saveFB = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const existingTags = (selected.tags || []).filter((t: string) => !t.startsWith('__fb__'))
      const newTags = [...existingTags, serializeFB(fb)]
      await supabase.from('contacts').update({ tags: newTags }).eq('id', selected.id)
      setShowModal(false)
      loadContacts()
    } finally { setSaving(false) }
  }

  // Converter
  const convResult = isNaN(Number(convAmount)) ? 0 : convertAmount(Number(convAmount), convFrom, convTo)
  const fromCur = CURRENCIES.find(c => c.code === convFrom)!
  const toCur = CURRENCIES.find(c => c.code === convTo)!

  // Property price in multiple currencies
  const SAMPLE_PRICES = [480000, 1450000, 2750000, 4100000, 7800000, 12500000, 18500000]

  const nationalityStats = contacts.reduce((acc, c) => {
    const nat = c._fb?.nationality || 'Unspecified'
    acc[nat] = (acc[nat] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sofStats = contacts.reduce((acc, c) => {
    const s = c._fb?.sof_status || 'Not Started'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const amlFlagged = contacts.filter(c => c._fb?.aml_flag).length
  const verifiedSof = contacts.filter(c => c._fb?.sof_status === 'Verified' || c._fb?.sof_status === 'Cleared').length
  const withPassport = contacts.filter(c => c._fb?.passport_verified).length

  const p = isMobile ? '16px' : '28px 32px 20px'

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ padding: p, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Compliance & FX</p>
          <h1 className="page-title" style={{ fontSize: isMobile ? '1.6rem' : undefined }}>Foreign Buyer <em>Profiling</em></h1>
          <p className="page-sub">Multi-currency, AML, and international ownership tracking</p>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ padding: isMobile ? '12px 16px' : '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'International Buyers', value: contacts.length, icon: Globe, color: 'var(--azure)' },
          { label: 'SOF Verified / Cleared', value: verifiedSof, icon: ShieldCheck, color: 'var(--green)' },
          { label: 'Passport Verified', value: withPassport, icon: FileText, color: 'var(--gold)' },
          { label: 'AML Flagged', value: amlFlagged, icon: AlertTriangle, color: amlFlagged > 0 ? 'var(--red)' : 'var(--text-4)' },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} color={kpi.color} />
              </div>
              <div>
                <p style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{kpi.value}</p>
                <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>{kpi.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ padding: isMobile ? '0 16px' : '0 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 0 }}>
        {([
          { id: 'profiles', label: 'Buyer Profiles', icon: Users },
          { id: 'converter', label: 'FX Converter', icon: DollarSign },
          { id: 'ownership', label: 'Ownership Rules', icon: Globe },
        ] as const).map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 20px', border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 500,
                color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-3)',
                borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />{tab.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: BUYER PROFILES ─────────────────────────────── */}
      {activeTab === 'profiles' && (
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
              <Search size={15} className="search-icon" />
              <input className="search-input" placeholder="Search buyers…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="crm-select-wrap" style={{ minWidth: 160 }}>
              <select className="crm-select" value={natFilter} onChange={e => setNatFilter(e.target.value)}>
                <option value="all">All Nationalities</option>
                {Object.keys(nationalityStats).sort().map(n => <option key={n} value={n}>{n} ({nationalityStats[n]})</option>)}
              </select>
            </div>
            <div className="crm-select-wrap" style={{ minWidth: 180 }}>
              <select className="crm-select" value={sofFilter} onChange={e => setSofFilter(e.target.value)}>
                <option value="all">All SOF Statuses</option>
                {SOF_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : contacts.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Globe size={22} /></div>
                <p className="empty-title">No buyer profiles found</p>
                <p className="empty-sub">Add international profiling to your contacts by clicking the edit icon</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contacts.map(c => {
                const sofS = c._fb?.sof_status || 'Not Started'
                const budgetUSD = c.budget_max || c.budget_min || 0
                const homeCur = CURRENCIES.find(cur => cur.code === (c._fb?.home_currency || 'USD'))
                const budgetLocal = homeCur && c._fb?.home_currency && c._fb.home_currency !== 'USD'
                  ? convertAmount(budgetUSD, 'USD', c._fb.home_currency)
                  : null

                return (
                  <div key={c.id} className="card" style={{ padding: isMobile ? '14px 16px' : '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--azure-pale)', color: 'var(--azure)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{c.first_name} {c.last_name}</p>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
                            {c._fb?.nationality && (
                              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                {NATIONALITIES.includes(c._fb.nationality) ? c._fb.nationality : c._fb.nationality}
                              </span>
                            )}
                            {c._fb?.home_currency && (
                              <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500 }}>
                                {c._fb.home_currency}
                              </span>
                            )}
                            {c._fb?.passport_verified && (
                              <span style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}><Check size={10} />Passport</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {c._fb?.aml_flag && <span className="badge badge-red" style={{ fontSize: 10 }}>AML Flag</span>}
                        <span className={`badge ${sofBadge[sofS] || 'badge-gray'}`} style={{ fontSize: 10 }}>{sofS}</span>
                        <button
                          onClick={() => openProfile(c)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexShrink: 0 }}
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Budget in home currency */}
                    {(budgetUSD > 0 || c._fb?.preferred_ownership_structure) && (
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {budgetUSD > 0 && (
                          <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 2 }}>Budget (USD)</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                              ${((c.budget_min || 0) / 1e6).toFixed(1)}M – ${((c.budget_max || 0) / 1e6).toFixed(1)}M
                            </p>
                          </div>
                        )}
                        {budgetLocal && homeCur && (
                          <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--gold-pale)', border: '1px solid var(--gold-border)' }}>
                            <p style={{ fontSize: 10, color: 'var(--gold)', marginBottom: 2 }}>Budget ({c._fb?.home_currency})</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                              {fmt(convertAmount(c.budget_min || 0, 'USD', c._fb!.home_currency!), homeCur.symbol)} – {fmt(budgetLocal, homeCur.symbol)}
                            </p>
                          </div>
                        )}
                        {c._fb?.preferred_ownership_structure && (
                          <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 2 }}>Ownership Structure</p>
                            <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{c._fb.preferred_ownership_structure}</p>
                          </div>
                        )}
                        {c._fb?.alien_license_status && (
                          <div style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 2 }}>Foreign Ownership Permit</p>
                            <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{c._fb.alien_license_status}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {c._fb?.tax_treaty_notes && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 7, background: 'var(--surface-2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Info size={13} color="var(--text-4)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{c._fb.tax_treaty_notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FX CONVERTER ───────────────────────────────── */}
      {activeTab === 'converter' && (
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20 }}>

            {/* Converter card */}
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: 20 }}>Currency <em>Converter</em></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">Amount</label>
                  <input
                    className="crm-input"
                    type="number"
                    value={convAmount}
                    onChange={e => setConvAmount(e.target.value)}
                    placeholder="1,000,000"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label className="form-label">From</label>
                    <div className="crm-select-wrap">
                      <select className="crm-select" value={convFrom} onChange={e => setConvFrom(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => { setConvFrom(convTo); setConvTo(convFrom) }}
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
                  >
                    <RefreshCw size={14} />
                  </button>
                  <div>
                    <label className="form-label">To</label>
                    <div className="crm-select-wrap">
                      <select className="crm-select" value={convTo} onChange={e => setConvTo(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div style={{ padding: '20px 24px', borderRadius: 10, background: 'var(--navy)', marginTop: 4 }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {fromCur.flag} {Number(convAmount).toLocaleString()} {convFrom} =
                  </p>
                  <p style={{ fontSize: isMobile ? 28 : 34, fontWeight: 700, color: '#fff', fontFamily: 'var(--serif)', lineHeight: 1 }}>
                    {toCur.symbol}{convResult.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 6 }}>{toCur.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>
                    Rate: 1 {convFrom} = {(RATES_TO_USD[convFrom] / RATES_TO_USD[convTo]).toFixed(4)} {convTo} · Indicative only
                  </p>
                </div>
              </div>
            </div>

            {/* Property price matrix */}
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: 4 }}>Price <em>Matrix</em></p>
              <p style={{ fontSize: 12, color: 'var(--text-4)', marginBottom: 20 }}>Portfolio prices in selected currency</p>

              <div style={{ marginBottom: 12 }}>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={convTo} onChange={e => setConvTo(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SAMPLE_PRICES.map(usdPrice => {
                  const converted = convertAmount(usdPrice, 'USD', convTo)
                  return (
                    <div key={usdPrice} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>${(usdPrice / 1e6).toFixed(2)}M USD</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ArrowRight size={12} color="var(--text-4)" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {toCur.symbol}{converted.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{convTo}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 14, fontStyle: 'italic' }}>Rates are indicative. Always verify with a bank for transactional purposes.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: OWNERSHIP RULES ────────────────────────────── */}
      {activeTab === 'ownership' && (
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="crm-select-wrap" style={{ maxWidth: 300 }}>
              <select className="crm-select" value={selectedIsland} onChange={e => setSelectedIsland(e.target.value)}>
                {Object.keys(OWNERSHIP_RULES).map(island => <option key={island} value={island}>{island}</option>)}
              </select>
            </div>
          </div>

          {(() => {
            const rule = OWNERSHIP_RULES[selectedIsland]
            const riskColor = rule.risk === 'low' ? 'var(--green)' : rule.risk === 'medium' ? 'var(--gold)' : 'var(--red)'
            const riskBadge = rule.risk === 'low' ? 'badge-green' : rule.risk === 'medium' ? 'badge-gold' : 'badge-red'
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 400, color: 'var(--text)' }}>{selectedIsland}</h3>
                    <span className={`badge ${riskBadge}`} style={{ textTransform: 'capitalize' }}>{rule.risk} complexity</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: '12px 16px', borderRadius: 9, background: `${riskColor}10`, border: `1px solid ${riskColor}30` }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: riskColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Permit / License Required</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{rule.license}</p>
                    </div>
                    <div style={{ padding: '12px 16px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Threshold</p>
                      <p style={{ fontSize: 14, color: 'var(--text)' }}>{rule.threshold}</p>
                    </div>
                    <div style={{ padding: '14px 16px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Key Notes</p>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{rule.notes}</p>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: 16 }}>All Markets <em>Overview</em></h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(OWNERSHIP_RULES).map(([island, r]) => {
                      const rc = r.risk === 'low' ? 'var(--green)' : r.risk === 'medium' ? 'var(--gold)' : 'var(--red)'
                      return (
                        <button
                          key={island}
                          onClick={() => setSelectedIsland(island)}
                          style={{
                            padding: '10px 14px', borderRadius: 8, background: selectedIsland === island ? `${rc}12` : 'var(--surface-2)',
                            border: `1px solid ${selectedIsland === island ? rc : 'var(--border)'}`,
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            textAlign: 'left', transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{island}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: rc, textTransform: 'capitalize', background: `${rc}18`, padding: '2px 8px', borderRadius: 20 }}>{r.risk}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Common ownership structures */}
          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: 16 }}>Common Ownership <em>Structures</em></p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { name: 'Personal Name', use: 'Simplest. Direct ownership. Best for Cayman — no restrictions, no tax.', caution: 'Exposes owner to estate duty in some jurisdictions.' },
                { name: 'International Business Company (IBC)', use: 'BVI or Cayman IBC. Common for privacy and inheritance planning.', caution: 'Annual filing costs. Some jurisdictions require disclosure.' },
                { name: 'US LLC', use: 'Popular for US buyers. Pass-through taxation. Strong legal protection.', caution: 'Florida or Delaware LLC standard. Local land title complexity.' },
                { name: 'Family Trust', use: 'Long-term estate planning. Assets outside of estate for inheritance purposes.', caution: 'Requires trustee. Annual costs. Complex setup.' },
                { name: 'Foundation', use: 'Popular for European and Middle Eastern HNW. Cayman and BVI foundations common.', caution: 'Higher setup cost. Annual compliance.' },
                { name: 'SIPP / Pension Fund', use: 'UK buyers: SIPP can purchase commercial Caribbean property.', caution: 'Restricted to commercial property. Complex rules.' },
              ].map(s => (
                <div key={s.name} style={{ padding: '14px 16px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 6 }}>{s.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 8 }}>{s.use}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={11} color="var(--orange)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 11, color: 'var(--text-4)', lineHeight: 1.5 }}>{s.caution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ───────────────────────────────── */}
      {showModal && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth: 580, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <p className="page-label">Foreign Buyer Profile</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selected.first_name} {selected.last_name}
                </h2>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Nationality</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={fb.nationality || ''} onChange={e => setFb({ ...fb, nationality: e.target.value })}>
                      <option value="">— Select —</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Home Currency</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={fb.home_currency || ''} onChange={e => setFb({ ...fb, home_currency: e.target.value })}>
                      <option value="">— Select —</option>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Source of Funds Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={fb.sof_status || 'Not Started'} onChange={e => setFb({ ...fb, sof_status: e.target.value })}>
                      {SOF_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Foreign Ownership Permit</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={fb.alien_license_status || ''} onChange={e => setFb({ ...fb, alien_license_status: e.target.value })}>
                      <option value="">— Not started —</option>
                      <option value="Not Required">Not Required</option>
                      <option value="Application Pending">Application Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Preferred Ownership Structure</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={fb.preferred_ownership_structure || ''} onChange={e => setFb({ ...fb, preferred_ownership_structure: e.target.value })}>
                      <option value="">— Not specified —</option>
                      <option value="Personal Name">Personal Name</option>
                      <option value="IBC (BVI)">IBC (BVI)</option>
                      <option value="IBC (Cayman)">IBC (Cayman)</option>
                      <option value="US LLC">US LLC</option>
                      <option value="Family Trust">Family Trust</option>
                      <option value="Foundation">Foundation</option>
                      <option value="SIPP">SIPP</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!fb.passport_verified}
                      onChange={e => setFb({ ...fb, passport_verified: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--gold)' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Passport Verified</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!fb.aml_flag}
                      onChange={e => setFb({ ...fb, aml_flag: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AML Flag</span>
                  </label>
                </div>

                <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                  <label className="form-label">Tax Treaty / Fiscal Notes</label>
                  <textarea
                    className="crm-input"
                    rows={3}
                    value={fb.tax_treaty_notes || ''}
                    onChange={e => setFb({ ...fb, tax_treaty_notes: e.target.value })}
                    placeholder="e.g. UK–Cayman no tax treaty. No CGT on Cayman property. UK estate duty may apply on death..."
                  />
                </div>
              </div>

              {/* Live budget conversion */}
              {selected.budget_max && fb.home_currency && fb.home_currency !== 'USD' && (
                <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 9, background: 'var(--navy)', color: '#fff' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Budget in {fb.home_currency}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--serif)' }}>
                    {CURRENCIES.find(c => c.code === fb.home_currency)?.symbol}
                    {convertAmount(selected.budget_min || 0, 'USD', fb.home_currency).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    {' – '}
                    {CURRENCIES.find(c => c.code === fb.home_currency)?.symbol}
                    {convertAmount(selected.budget_max, 'USD', fb.home_currency).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>Converted from ${(selected.budget_min || 0) / 1e6 + 'M'}–${selected.budget_max / 1e6 + 'M'} USD · Indicative</p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveFB} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</> : <><Check size={14} />Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
