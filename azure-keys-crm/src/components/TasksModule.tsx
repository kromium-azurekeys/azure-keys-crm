'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, CheckSquare, Square, Clock, AlertCircle, Phone, Mail, Video, Eye, FileText, Users, MoreHorizontal } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/Modal'

interface TasksModuleProps { profile: Profile | null }

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4a8c7a', medium: '#c9a84c', high: '#c97a1e', urgent: '#ff6b6b'
}

const TASK_TYPE_ICONS: Record<string, any> = {
  call: Phone, email: Mail, meeting: Users, viewing: Eye,
  follow_up: Clock, document: FileText, other: MoreHorizontal
}

const TASK_TYPES = ['call', 'email', 'meeting', 'viewing', 'follow_up', 'document', 'other']

export default function TasksModule({ profile }: TasksModuleProps) {
  const isMobile = useIsMobile()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [form, setForm] = useState<any>({ status: 'pending', priority: 'medium', type: 'other' })
  const [saving, setSaving] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [filter, setFilter] = useState('pending')

  useEffect(() => { loadData() }, [filter])

  const loadData = async () => {
    setLoading(true)
    const [{ data: t }, { data: c }, { data: a }] = await Promise.all([
      (() => {
        let q = supabase.from('tasks')
          .select('*, profiles!assigned_to(full_name), contacts(first_name, last_name)')
          .order('due_date', { ascending: true, nullsFirst: false })
        if (filter !== 'all') q = q.eq('status', filter)
        return q.limit(100)
      })(),
      supabase.from('contacts').select('id, first_name, last_name').order('first_name'),
      supabase.from('profiles').select('id, full_name').order('full_name')
    ])
    setTasks(t || [])
    setContacts(c || [])
    setAgents(a || [])
    setLoading(false)
  }

  const saveTask = async () => {
    setSaving(true)
    try {
      if (selectedTask) {
        await supabase.from('tasks').update(form).eq('id', selectedTask.id)
      } else {
        await supabase.from('tasks').insert({ ...form, created_by: profile?.id, assigned_to: form.assigned_to || profile?.id })
      }
      setShowModal(false)
      loadData()
    } finally { setSaving(false) }
  }

  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }).eq('id', task.id)
    loadData()
  }

  const isOverdue = (task: any) =>
    task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  const p = isMobile ? '16px' : '28px 32px'

  return (
    <div className="animate-fade-up" style={{ padding: p }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Workflow</p>
          <h1 className="page-title">Task <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Management</em></h1>
          <p className="page-sub">
            {tasks.filter(t => t.status === 'pending').length} pending · {tasks.filter(t => isOverdue(t)).length} overdue
          </p>
        </div>
        <button
          onClick={() => { setForm({ status: 'pending', priority: 'medium', type: 'other' }); setSelectedTask(null); setShowModal(true) }}
          className="btn-gold" style={{ flexShrink: 0 }}
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: isMobile ? 16 : 20 }}>
        {['pending', 'in_progress', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`}>
            {f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><CheckSquare size={20} /></div>
          <p className="empty-title">No tasks found</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Add your first task to stay on top of your workflow</p>
          <button onClick={() => { setForm({ status: 'pending', priority: 'medium', type: 'other' }); setSelectedTask(null); setShowModal(true) }} className="btn-gold">
            Add Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => {
            const TypeIcon = TASK_TYPE_ICONS[task.type] || MoreHorizontal
            const overdue = isOverdue(task)
            const done = task.status === 'completed'
            return (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: isMobile ? '12px 14px' : '14px 18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  opacity: done ? 0.55 : 1,
                  borderLeft: overdue ? '2px solid #ff6b6b' : done ? '2px solid var(--green)' : '2px solid transparent',
                  transition: 'opacity 0.15s, border-color 0.15s',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(task)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, paddingTop: 2, flexShrink: 0, color: done ? 'var(--green)' : 'var(--text-4)' }}
                >
                  {done ? <CheckSquare size={17} /> : <Square size={17} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Row 1: title + badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <p style={{
                      color: 'var(--text)',
                      fontFamily: 'var(--sans)',
                      fontSize: 13.5,
                      fontWeight: 500,
                      textDecoration: done ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {overdue && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ff6b6b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          <AlertCircle size={11} /> Overdue
                        </span>
                      )}
                      <span style={{
                        background: `${PRIORITY_COLORS[task.priority] || '#888'}18`,
                        color: PRIORITY_COLORS[task.priority] || '#888',
                        border: `1px solid ${PRIORITY_COLORS[task.priority] || '#888'}35`,
                        fontSize: '0.62rem', letterSpacing: '0.09em', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
                      }}>
                        {task.priority}
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'var(--surface-2)', color: 'var(--text-3)',
                        border: '1px solid var(--border)', borderRadius: 3,
                        fontSize: '0.62rem', padding: '2px 7px', whiteSpace: 'nowrap',
                      }}>
                        <TypeIcon size={10} />
                        {(task.type || 'other').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.5 }}>
                      {task.description}
                    </p>
                  )}

                  {/* Row 3: meta */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    {task.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: overdue ? '#ff6b6b' : 'var(--text-3)' }}>
                        <Clock size={11} />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' at '}
                        {new Date(task.due_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {task.contacts && (
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Contact: {task.contacts.first_name} {task.contacts.last_name}
                      </span>
                    )}
                    {task.profiles && (
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Assigned: {task.profiles.full_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => { setForm(task); setSelectedTask(task); setShowModal(true) }}
                  style={{
                    background: 'rgba(201,169,110,0.08)', color: 'var(--gold)',
                    border: '1px solid rgba(201,169,110,0.18)', cursor: 'pointer',
                    fontSize: 12, padding: '4px 10px', borderRadius: 5, flexShrink: 0,
                    fontFamily: 'var(--sans)',
                  }}
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: '90%', maxWidth: 560 }}>
            <div className="modal-header">
              <div>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>
                  {selectedTask ? 'Edit' : 'New'} Task
                </p>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Title *</label>
                <input className="crm-input" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
                <div>
                  <label className="form-label">Type</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.type || 'other'} onChange={e => setForm({ ...form, type: e.target.value })}>
                      {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {['pending', 'in_progress', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="datetime-local" className="crm-input" value={form.due_date ? form.due_date.slice(0, 16) : ''} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Assign To</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.assigned_to || ''} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                      <option value="">Select agent</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Related Contact</label>
                <div className="crm-select-wrap">
                  <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                    <option value="">None</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea className="crm-input" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task details..." />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveTask} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
