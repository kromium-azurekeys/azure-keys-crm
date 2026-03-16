'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { Plus, X, CheckSquare, Circle, Clock, AlertCircle } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface TasksModuleProps { profile: Profile | null }

const PRIORITY_COLORS: Record<string, string> = { low: '#4a8c7a', medium: '#c9a84c', high: '#c97a1e', urgent: '#ff6b6b' }
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
        let q = supabase.from('tasks').select('*, profiles!assigned_to(full_name), contacts(first_name, last_name)').order('due_date', { ascending: true, nullsFirst: false })
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
    } finally {
      setSaving(false)
    }
  }

  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('tasks').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', task.id)
    loadData()
  }

  const isOverdue = (task: any) => task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'

  return (
    <div className="animate-fade-up" style={{ padding: isMobile ? '16px' : '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: isMobile ? 16 : 24 }}>
        <div>
          <p className="page-label">Workflow</p>
          <h1 className="page-title">Task <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Management</em></h1>
          <p className="page-sub">
            {tasks.filter(t => t.status === 'pending').length} pending · {tasks.filter(t => isOverdue(t)).length} overdue
          </p>
        </div>
        <button onClick={() => { setForm({ status: 'pending', priority: 'medium', type: 'other' }); setSelectedTask(null); setShowModal(true) }} className="btn-gold" style={{ flexShrink: 0 }}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filter */}
      <div className="filter-tabs" style={{ marginBottom: isMobile ? 16 : 20 }}>
        {['pending', 'in_progress', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`filter-tab${filter === f ? ' active' : ''}`}>
            {f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon"><CheckSquare size={20} /></div>
          <p className="empty-title">No tasks found</p>
          <p className="empty-sub" style={{ marginBottom: 16 }}>Add your first task to stay on top of your workflow</p>
          <button onClick={() => { setForm({ status: 'pending', priority: 'medium', type: 'other' }); setSelectedTask(null); setShowModal(true) }} className="btn-gold">Add Task</button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`crm-card p-4 flex items-start gap-4 transition-all ${task.status === 'completed' ? 'opacity-50' : ''}`}>
              <button
                onClick={() => toggleComplete(task)}
                className="mt-0.5 flex-shrink-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: task.status === 'completed' ? '#4a8c4a' : 'rgba(248,245,240,0.2)', padding: 0 }}
              >
                {task.status === 'completed' ? <CheckSquare size={18} /> : <Circle size={18} />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through' : ''}`} style={{ color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 13.5 }}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOverdue(task) && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#ff6b6b' }}>
                        <AlertCircle size={12} /> Overdue
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 capitalize" style={{
                      background: `${PRIORITY_COLORS[task.priority] || '#888'}15`,
                      color: PRIORITY_COLORS[task.priority] || '#888',
                      border: `1px solid ${PRIORITY_COLORS[task.priority] || '#888'}30`,
                      fontSize: '0.65rem', letterSpacing: '0.08em'
                    }}>
                      {task.priority}
                    </span>
                    <span className="text-xs px-2 py-0.5 capitalize" style={{
                      background: 'var(--surface-2)', color: 'var(--text-3)',
                      border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.65rem'
                    }}>
                      {task.type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{task.description}</p>
                )}

                <div className="flex items-center gap-4 mt-2">
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock size={11} style={{ color: isOverdue(task) ? '#ff6b6b' : 'var(--muted)' }} />
                      <span className="text-xs" style={{ color: isOverdue(task) ? '#ff6b6b' : 'var(--muted)' }}>
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  {task.contacts && (
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Contact: {task.contacts.first_name} {task.contacts.last_name}
                    </span>
                  )}
                  {task.profiles && (
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      Assigned: {task.profiles.full_name}
                    </span>
                  )}
                </div>
              </div>

              <button onClick={() => { setForm(task); setSelectedTask(task); setShowModal(true) }} className="text-xs px-2 py-1 flex-shrink-0" style={{
                background: 'rgba(201,168,76,0.08)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.12)', cursor: 'pointer'
              }}>
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ width: "90%", maxWidth: 560, display: "flex", flexDirection: "column" }}>
            <div className="modal-header" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>{selectedTask ? 'Edit' : 'New'} Task</p>
                <h2 className="serif text-2xl font-light mt-1" style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>{selectedTask ? 'Update Task' : 'Create Task'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: "auto" }}>
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Title *</label>
                <input className="crm-input" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 12 }}>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Type</label>
                  <select className="crm-select" value={form.type || 'other'} onChange={e => setForm({...form, type: e.target.value})}>
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Priority</label>
                  <select className="crm-select" value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Status</label>
                  <select className="crm-select" value={form.status || 'pending'} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Due Date</label>
                  <input type="datetime-local" className="crm-input" value={form.due_date ? form.due_date.slice(0, 16) : ''} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Assign To</label>
                  <select className="crm-select" value={form.assigned_to || ''} onChange={e => setForm({...form, assigned_to: e.target.value})}>
                    <option value="">Select agent</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Related Contact</label>
                <select className="crm-select" value={form.contact_id || ''} onChange={e => setForm({...form, contact_id: e.target.value})}>
                  <option value="">None</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>Description</label>
                <textarea className="crm-input" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Task details..." />
              </div>
            </div>

            <div className="modal-footer" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={saveTask} className="btn-gold" disabled={saving}>
                {saving ? 'Saving...' : selectedTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
