'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Mail, MessageSquare, Phone, Zap, Clock, CheckCircle, PauseCircle, XCircle, Plus, X, TrendingUp, Users } from 'lucide-react'
import Modal from '@/components/Modal'

interface NurtureProps { profile: Profile | null }

// The 40+ sequence templates from the document condensed to key sequences
const SEQUENCES: Record<string, { name: string; type: 'buyer'|'seller'; tier: string; days: number; steps: string[] }> = {
  hot_buyer_7day: {
    name: 'Hot Buyer — 7 Day',
    type: 'buyer', tier: 'hot', days: 7,
    steps: ['Hour 0: SMS + WhatsApp property matches', 'Hour 0: Email curated portfolio (5–7 properties)', 'Hour 2: Phone call attempt #1', 'Hour 6: SMS check-in', 'Day 1: Neighbourhood guide email', 'Day 1: WhatsApp new listing alert', 'Day 2: Phone call attempt #2', 'Day 2: Buyer testimonials email', 'Day 3: SMS — schedule showings', 'Day 4: Mortgage guide email', 'Day 5: WhatsApp price drop alert', 'Day 7: Phone call attempt #3', 'Day 7: Adjust search criteria email'],
  },
  warm_buyer_30day: {
    name: 'Warm Buyer — 30 Day',
    type: 'buyer', tier: 'warm', days: 30,
    steps: ['Day 0: Welcome email + buyer\'s guide', 'Day 2: New listing alert', 'Day 4: SMS check-in', 'Day 6: How to know when you\'ve found the one', 'Day 8: New listing alert', 'Day 10: Market report email', 'Day 12: WhatsApp check-in', 'Day 14: Buying vs renting Caribbean', 'Day 15: New listing alert', 'Day 17: SMS — refine criteria?', 'Day 19: What buyers wish they knew', 'Day 21: Agent phone call', 'Day 24: Financing tips email', 'Day 26: WhatsApp timeline check', 'Day 30: Ready to get serious email'],
  },
  cold_buyer_monthly: {
    name: 'Cold Buyer — Monthly',
    type: 'buyer', tier: 'cold', days: 90,
    steps: ['Day 0: Welcome email + buyer\'s guide', 'Day 30: Monthly market report', 'Day 30: Featured listings digest', 'Day 60: Mortgage education content', 'Day 60: Quarterly check-in', 'Day 90: Seasonal promotion alert'],
  },
  hot_seller_7day: {
    name: 'Hot Seller — 7 Day',
    type: 'seller', tier: 'hot', days: 7,
    steps: ['Hour 0: SMS + email initial valuation', 'Hour 1: WhatsApp — schedule walkthrough', 'Hour 4: Phone call attempt #1', 'Day 1: Preparing your home for sale email', 'Day 1: SMS — confirm meeting time', 'Day 2: Recent sales comps email', 'Day 2: Phone call attempt #2', 'Day 3: WhatsApp property question', 'Day 4: How we market luxury properties', 'Day 5: SMS — schedule walkthrough this weekend', 'Day 6: Client testimonials from sellers', 'Day 7: Phone call attempt #3'],
  },
  warm_seller_60day: {
    name: 'Warm Seller — 60 Day',
    type: 'seller', tier: 'warm', days: 60,
    steps: ['Day 0: Automated valuation + seller\'s guide', 'Day 3: 5 home improvements best ROI', 'Day 6: SMS — ideal selling timeline?', 'Day 10: Market update neighbourhood', 'Day 14: WhatsApp — properties selling fast', 'Day 17: How to pick the right agent', 'Day 21: SMS — ready for accurate valuation?', 'Day 24: Recent sold property spotlight', 'Day 28: Agent phone call', 'Day 35: Seasonal market trends', 'Day 42: SMS timeline check', 'Day 49: Busiest selling season email', 'Day 56: WhatsApp check-in', 'Day 60: Still thinking about selling email'],
  },
}

const TIER_COLORS: Record<string, string> = { hot: '#ff6b6b', warm: 'var(--gold)', cold: 'var(--text-3)' }
const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  active:    { color: 'var(--green)', icon: TrendingUp, label: 'Active' },
  paused:    { color: 'var(--orange)', icon: PauseCircle, label: 'Paused' },
  completed: { color: 'var(--gold)', icon: CheckCircle, label: 'Completed' },
  exited:    { color: 'var(--red)', icon: XCircle, label: 'Exited' },
}

const TOUCH_ICONS: Record<string, any> = { email: Mail, sms: MessageSquare, whatsapp: MessageSquare, call: Phone }

export default function NurtureModule({ profile }: NurtureProps) {
  const isMobile = useIsMobile()
  const [sequences, setSequences] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ status: 'active', lead_type: 'buyer', sequence_name: 'warm_buyer_30day' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [filter, typeFilter])

  async function load() {
    setLoading(true)
    let q = supabase.from('nurture_sequences')
      .select('*, contacts(first_name, last_name, email, lead_score)')
      .order('enrolled_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    if (typeFilter !== 'all') q = q.eq('lead_type', typeFilter)
    const { data } = await q.limit(100)
    setSequences(data || [])
    const { data: c } = await supabase.from('contacts').select('id, first_name, last_name, email').order('first_name').limit(200)
    setContacts(c || [])
    setLoading(false)
  }

  async function enroll() {
    setSaving(true)
    try {
      const seqConfig = SEQUENCES[form.sequence_name]
      await supabase.from('nurture_sequences').insert({
        contact_id: form.contact_id,
        sequence_name: form.sequence_name,
        lead_type: seqConfig?.type || form.lead_type,
        lead_tier: seqConfig?.tier || form.lead_tier || 'warm',
        status: 'active',
        current_day: 0,
        enrolled_at: new Date().toISOString(),
        next_touch_at: new Date().toISOString(),
        completed_steps: [],
      })
      setShowModal(false); load()
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('nurture_sequences').update({ status }).eq('id', id)
    load()
  }

  async function advanceDay(id: string, currentDay: number) {
    await supabase.from('nurture_sequences').update({
      current_day: currentDay + 1,
      last_touch_at: new Date().toISOString(),
    }).eq('id', id)
    load()
  }

  // Stats
  const activeCount    = sequences.filter(s => s.status === 'active').length
  const hotCount       = sequences.filter(s => s.lead_tier === 'hot').length
  const buyerCount     = sequences.filter(s => s.lead_type === 'buyer').length
  const sellerCount    = sequences.filter(s => s.lead_type === 'seller').length

  const p = isMobile ? '16px' : '28px 32px'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Automated Outreach</p>
          <h1 className="page-title">Nurture <em>Sequences</em></h1>
          <p className="page-sub">{activeCount} active · {hotCount} hot leads · {buyerCount} buyers · {sellerCount} sellers</p>
        </div>
        <button onClick={() => { setForm({ status: 'active', lead_type: 'buyer', sequence_name: 'warm_buyer_30day' }); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={15} /> Enrol Lead
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: 20 }}>
        {[
          { label: 'Active Sequences', value: activeCount, color: 'var(--green)', bg: 'var(--green-pale)' },
          { label: 'Hot Leads', value: hotCount, color: '#ff6b6b', bg: 'var(--red-pale)' },
          { label: 'Buyer Sequences', value: buyerCount, color: 'var(--gold)', bg: 'var(--gold-pale)' },
          { label: 'Seller Sequences', value: sellerCount, color: 'var(--purple)', bg: 'var(--purple-pale)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: isMobile ? '12px 14px' : '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: 'var(--serif)', fontSize: isMobile ? '1.3rem' : '1.6rem', color: 'var(--text)', fontWeight: 400, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sequence templates reference */}
      <div className="card" style={{ padding: isMobile ? 14 : 20, marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>Available Sequences</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 10 }}>
          {Object.entries(SEQUENCES).map(([key, seq]) => (
            <div key={key} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 7, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${TIER_COLORS[seq.tier]}18`, color: TIER_COLORS[seq.tier], border: `1px solid ${TIER_COLORS[seq.tier]}30`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{seq.tier}</span>
                <span style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'capitalize' }}>{seq.type}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{seq.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{seq.steps.length} touchpoints · {seq.days} days</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="filter-tabs">
          {['active','paused','completed','exited','all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`} style={{ textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          {['all','buyer','seller'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`filter-tab${typeFilter === t ? ' active' : ''}`} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Enrolled sequences */}
      {sequences.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><Mail size={20} /></div>
          <p className="empty-title">No sequences enrolled</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Enrol a buyer or seller lead into an automated nurture sequence</p>
          <button onClick={() => setShowModal(true)} className="btn-gold">Enrol First Lead</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sequences.map(seq => {
            const config = STATUS_CONFIG[seq.status] || STATUS_CONFIG.active
            const StatusIcon = config.icon
            const seqDef = SEQUENCES[seq.sequence_name]
            const totalDays = seqDef?.days || 30
            const progress = Math.min((seq.current_day / totalDays) * 100, 100)
            const tierColor = TIER_COLORS[seq.lead_tier] || 'var(--text-3)'
            const currentStep = seqDef?.steps[Math.min(seq.current_day, (seqDef?.steps?.length || 1) - 1)] || ''

            return (
              <div key={seq.id} className="card" style={{ padding: isMobile ? 14 : 18, borderLeft: `3px solid ${tierColor}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Lead name + badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        {seq.contacts?.first_name} {seq.contacts?.last_name}
                      </p>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {seq.lead_tier}
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${config.color}15`, color: config.color, border: `1px solid ${config.color}30`, textTransform: 'capitalize' }}>
                        {config.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                        {seq.lead_type} · {seq.sequence_name?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Current step */}
                    {currentStep && (
                      <p style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        {currentStep}
                      </p>
                    )}

                    {/* Progress bar */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Day {seq.current_day} of {totalDays}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{Math.round(progress)}% complete</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {seq.enrolled_at && (
                        <span style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> Enrolled {new Date(seq.enrolled_at).toLocaleDateString()}
                        </span>
                      )}
                      {seq.last_touch_at && (
                        <span style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={10} /> Last touch {new Date(seq.last_touch_at).toLocaleDateString()}
                        </span>
                      )}
                      {seq.next_touch_at && seq.status === 'active' && (
                        <span style={{ fontSize: 11, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Zap size={10} /> Next: {new Date(seq.next_touch_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    {seq.status === 'active' && (
                      <>
                        <button onClick={() => advanceDay(seq.id, seq.current_day)}
                          style={{ fontSize: 11.5, padding: '4px 12px', background: 'var(--gold-pale)', color: 'var(--gold)', border: '1px solid var(--gold-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>
                          Log Touch
                        </button>
                        <button onClick={() => updateStatus(seq.id, 'paused')}
                          style={{ fontSize: 11.5, padding: '4px 12px', background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                          Pause
                        </button>
                        <button onClick={() => updateStatus(seq.id, 'completed')}
                          style={{ fontSize: 11.5, padding: '4px 12px', background: 'var(--green-pale)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                          Complete
                        </button>
                      </>
                    )}
                    {seq.status === 'paused' && (
                      <button onClick={() => updateStatus(seq.id, 'active')}
                        style={{ fontSize: 11.5, padding: '4px 12px', background: 'var(--green-pale)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Enrol Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Enrol in Sequence</p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>Nurture Enrolment</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="form-label">Contact / Lead *</label>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                    <option value="">Select lead</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.email}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="form-label">Sequence *</label>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={form.sequence_name || ''} onChange={e => setForm({ ...form, sequence_name: e.target.value })}>
                    <option value="">Select sequence</option>
                    {Object.entries(SEQUENCES).map(([key, seq]) => (
                      <option key={key} value={key}>{seq.name} ({seq.steps.length} steps, {seq.days} days)</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.sequence_name && SEQUENCES[form.sequence_name] && (
                <div style={{ padding: '12px 14px', background: 'var(--gold-pale)', border: '1px solid var(--gold-border)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>Sequence Preview</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {SEQUENCES[form.sequence_name].steps.slice(0, 5).map((step, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span> {step}
                      </p>
                    ))}
                    {SEQUENCES[form.sequence_name].steps.length > 5 && (
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>+{SEQUENCES[form.sequence_name].steps.length - 5} more steps…</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={enroll} className="btn-gold" disabled={saving || !form.contact_id || !form.sequence_name}>
                {saving ? 'Enrolling...' : 'Enrol Lead'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
