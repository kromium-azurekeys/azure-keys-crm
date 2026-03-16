'use client'

import { useEffect, useState } from 'react'
import { supabase, Deal, Profile } from '@/lib/supabase'
import { Plus, X, User, Home, DollarSign } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface PipelineModuleProps { profile: Profile | null }

const STAGES = [
  { id:'new_lead', label:'New Lead', color:'var(--azure)', bg:'var(--azure-pale)' },
  { id:'qualified', label:'Qualified', color:'var(--gold)', bg:'var(--gold-pale)' },
  { id:'viewing_scheduled', label:'Viewing', color:'#7c3aed', bg:'var(--purple-pale)' },
  { id:'offer_made', label:'Offer Made', color:'var(--orange)', bg:'var(--orange-pale)' },
  { id:'negotiation', label:'Negotiation', color:'#ea580c', bg:'#fff7ed' },
  { id:'under_contract', label:'Under Contract', color:'var(--green)', bg:'var(--green-pale)' },
  { id:'closed_won', label:'Closed Won', color:'#15803d', bg:'#f0fdf4' },
  { id:'closed_lost', label:'Closed Lost', color:'var(--red)', bg:'var(--red-pale)' },
]

export default function PipelineModule({ profile }: PipelineModuleProps) {
  const isMobile = useIsMobile()
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Deal>>({ stage:'new_lead', deal_type:'buyer', priority:'medium', probability:20 })
  const [saving, setSaving] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: dealsData }, { data: contactsData }, { data: propsData }] = await Promise.all([
      supabase.from('deals').select('*, contacts(first_name,last_name), properties(title,price), profiles!agent_id(full_name)').order('created_at', { ascending:false }),
      supabase.from('contacts').select('id,first_name,last_name').order('first_name'),
      supabase.from('properties').select('id,title,price').eq('status','active').order('title'),
    ])
    setDeals(dealsData||[]); setContacts(contactsData||[]); setProperties(propsData||[])
    setLoading(false)
  }

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault(); setDragOver(null)
    if (!dragging) return
    await supabase.from('deals').update({ stage }).eq('id', dragging)
    await supabase.from('activities').insert({ type:'stage_change', description:`Deal moved to ${stage.replace(/_/g,' ')}`, deal_id:dragging, created_by:profile?.id })
    setDragging(null); loadData()
  }

  const saveDeal = async () => {
    setSaving(true)
    try {
      if (selectedDeal) {
        await supabase.from('deals').update(form).eq('id', selectedDeal.id)
      } else {
        const { data } = await supabase.from('deals').insert({ ...form, agent_id: profile?.id }).select().single()
        if (data) await supabase.from('activities').insert({ type:'note', description:`New deal: ${form.title}`, deal_id:data.id, created_by:profile?.id })
      }
      setShowModal(false); setSelectedDeal(null); loadData()
    } finally { setSaving(false) }
  }

  const fmt = (v:number) => v>=1000000?`$${(v/1000000).toFixed(1)}M`:v>=1000?`$${(v/1000).toFixed(0)}K`:`$${v}`
  const totalPipeline = deals.filter(d=>!['closed_won','closed_lost'].includes(d.stage)).reduce((s,d)=>s+(d.expected_value||0),0)

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:48}}><div className="spinner"/></div>

  return (
    <div className="animate-fade-up">
      <div style={{ padding: isMobile ? '16px' : '28px 32px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <p className="page-label">Sales</p>
          <h1 className="page-title">Deal <em>Pipeline</em></h1>
          <p className="page-sub">{deals.length} deals · Pipeline: <strong style={{color:'var(--azure)'}}>{fmt(totalPipeline)}</strong></p>
        </div>
        <button className="btn-primary" onClick={()=>{setForm({stage:'new_lead',deal_type:'buyer',priority:'medium',probability:20});setSelectedDeal(null);setShowModal(true)}}>
          <Plus size={15}/>New Deal
        </button>
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px 32px', overflowX:'auto' }}>
        <div style={{ display:'flex', gap:14, minWidth:'max-content' }}>
          {STAGES.map(({ id, label, color, bg }) => {
            const stageDeals = deals.filter(d=>d.stage===id)
            const stageVal = stageDeals.reduce((s,d)=>s+(d.expected_value||0),0)
            const isOver = dragOver===id
            return (
              <div key={id} style={{ width:230, display:'flex', flexDirection:'column' }}
                onDragOver={e=>{e.preventDefault();setDragOver(id)}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={e=>handleDrop(e,id)}>
                {/* Column header */}
                <div style={{
                  padding:'10px 14px', borderRadius:'8px 8px 0 0', marginBottom:2,
                  background: isOver ? bg : 'var(--surface)',
                  border:`1px solid ${isOver ? color : 'var(--border)'}`,
                  borderBottom:'none',
                  transition:'all 0.15s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:color }}/>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{label}</p>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:color, background:bg, padding:'2px 7px', borderRadius:20 }}>{stageDeals.length}</span>
                  </div>
                  {stageVal>0 && <p style={{ fontSize:11, color:'var(--text-4)', marginTop:3 }}>{fmt(stageVal)}</p>}
                </div>

                {/* Cards */}
                <div style={{
                  flex:1, minHeight:400, padding:8, borderRadius:'0 0 8px 8px',
                  background: isOver ? bg : 'var(--surface-2)',
                  border:`1px solid ${isOver ? color : 'var(--border)'}`,
                  borderTop:'none', display:'flex', flexDirection:'column', gap:8,
                  transition:'all 0.15s',
                }}>
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="kanban-card"
                      draggable
                      onDragStart={()=>setDragging(deal.id)}
                      onDragEnd={()=>{setDragging(null);setDragOver(null)}}
                      onClick={()=>{setForm(deal);setSelectedDeal(deal);setShowModal(true)}}
                      style={{ opacity:dragging===deal.id?0.4:1 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, marginBottom:8 }}>
                        <p style={{ fontSize:13, fontWeight:500, color:'var(--text)', lineHeight:1.3 }}>{deal.title}</p>
                        <span className={`badge ${deal.priority==='urgent'?'badge-red':deal.priority==='high'?'badge-orange':'badge-gray'}`} style={{flexShrink:0,fontSize:10}}>
                          {deal.priority}
                        </span>
                      </div>
                      {(deal as any).contacts && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                          <User size={11} style={{color:'var(--text-4)'}}/>
                          <p style={{ fontSize:12, color:'var(--text-3)' }}>{(deal as any).contacts.first_name} {(deal as any).contacts.last_name}</p>
                        </div>
                      )}
                      {(deal as any).properties && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                          <Home size={11} style={{color:'var(--text-4)'}}/>
                          <p style={{ fontSize:12, color:'var(--text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(deal as any).properties.title}</p>
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--border)' }}>
                        <p style={{ fontSize:13, fontWeight:600, color:color }}>{deal.expected_value?fmt(deal.expected_value):'—'}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div className="progress-bar" style={{ width:36 }}>
                            <div className="progress-fill" style={{ width:`${deal.probability}%` }}/>
                          </div>
                          <span style={{ fontSize:11, color:'var(--text-4)' }}>{deal.probability}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>{setForm({stage:id,deal_type:'buyer',priority:'medium',probability:20});setSelectedDeal(null);setShowModal(true)}}
                    style={{ padding:'8px', fontSize:12, color:'var(--text-4)', background:'none', border:'1px dashed var(--border)', borderRadius:7, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-4)'}}>
                    + Add Deal
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal" style={{ width:'90%', maxWidth:580, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
            <div className="modal-header">
              <p className="page-label">{selectedDeal?'Edit':'New'} Deal</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <h2 style={{ fontFamily:'var(--serif)', fontSize:'1.4rem', fontWeight:400, color:'var(--text)' }}>{selectedDeal?selectedDeal.title:'Create Deal'}</h2>
                <button className="btn-ghost" style={{padding:6}} onClick={()=>setShowModal(false)}><X size={18}/></button>
              </div>
            </div>
            <div className="modal-body" style={{ flex:1, overflowY:'auto' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div><label className="form-label">Deal Title *</label><input className="crm-input" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Smith Family — Ocean Crest Villa"/></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div><label className="form-label">Contact</label><select className="crm-select" value={form.contact_id||''} onChange={e=>setForm({...form,contact_id:e.target.value})}><option value="">Select contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div>
                  <div><label className="form-label">Property</label><select className="crm-select" value={form.property_id||''} onChange={e=>setForm({...form,property_id:e.target.value})}><option value="">Select property</option>{properties.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
                  <div><label className="form-label">Stage</label><select className="crm-select" value={form.stage||'new_lead'} onChange={e=>setForm({...form,stage:e.target.value})}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
                  <div><label className="form-label">Type</label><select className="crm-select" value={form.deal_type||'buyer'} onChange={e=>setForm({...form,deal_type:e.target.value})}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="rental">Rental</option><option value="both">Both</option></select></div>
                  <div><label className="form-label">Priority</label><select className="crm-select" value={form.priority||'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div><label className="form-label">Expected Value ($)</label><input type="number" className="crm-input" value={form.expected_value||''} onChange={e=>setForm({...form,expected_value:Number(e.target.value)})} placeholder="2500000"/></div>
                  <div><label className="form-label">Probability (%)</label><input type="number" min="0" max="100" className="crm-input" value={form.probability||20} onChange={e=>setForm({...form,probability:Number(e.target.value)})}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div><label className="form-label">Expected Close Date</label><input type="date" className="crm-input" value={form.expected_close_date||''} onChange={e=>setForm({...form,expected_close_date:e.target.value})}/></div>
                  <div><label className="form-label">Commission ($)</label><input type="number" className="crm-input" value={form.commission_amount||''} onChange={e=>setForm({...form,commission_amount:Number(e.target.value)})} placeholder="75000"/></div>
                </div>
                <div><label className="form-label">Notes</label><textarea className="crm-input" rows={3} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Deal notes..."/></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveDeal} disabled={saving||!form.title}>
                {saving?<><span className="spinner" style={{width:14,height:14}}/>Saving...</>:selectedDeal?'Update Deal':'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
