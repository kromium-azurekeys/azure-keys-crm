'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  FileText, Plus, X, Search, Upload, Download, Eye,
  FolderOpen, File, FileCheck, FileLock, FileImage,
  AlertCircle, Building2, Users, GitBranch
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import Modal from '@/components/Modal'

interface DocumentsModuleProps { profile: any }

interface Doc {
  id: string
  name: string
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  category: string
  contact_id: string | null
  deal_id: string | null
  property_id: string | null
  uploaded_by: string | null
  created_at: string
  contacts?: { first_name: string; last_name: string } | null
  deals?: { title: string } | null
  properties?: { title: string } | null
  profiles?: { full_name: string } | null
}

interface Contact { id: string; first_name: string; last_name: string }
interface Deal { id: string; title: string }
interface Property { id: string; title: string }

const CATEGORIES = ['contract','agreement','report','identity','financial','legal','marketing','other']

const catIcon: Record<string, any> = {
  contract: FileCheck,
  agreement: FileText,
  report: FileText,
  identity: FileLock,
  financial: FileText,
  legal: FileLock,
  marketing: FileImage,
  other: File,
}

const catColor: Record<string, string> = {
  contract: 'var(--green)',
  agreement: 'var(--azure)',
  report: 'var(--purple)',
  identity: 'var(--orange)',
  financial: 'var(--gold)',
  legal: 'var(--red)',
  marketing: 'var(--azure)',
  other: 'var(--text-3)',
}

const catBadge: Record<string, string> = {
  contract: 'badge-green',
  agreement: 'badge-blue',
  report: 'badge-purple',
  identity: 'badge-orange',
  financial: 'badge-gold',
  legal: 'badge-red',
  marketing: 'badge-blue',
  other: 'badge-gray',
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function DocumentsModule({ profile }: DocumentsModuleProps) {
  const isMobile = useIsMobile()
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Linked entity lists
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [form, setForm] = useState<{
    name: string
    category: string
    contact_id: string
    deal_id: string
    property_id: string
    file_path: string
    file_size: number | null
    mime_type: string
    notes: string
  }>({
    name: '', category: 'other', contact_id: '', deal_id: '',
    property_id: '', file_path: '', file_size: null, mime_type: '', notes: ''
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => { loadDocs(); loadEntities() }, [search, catFilter])

  const loadDocs = async () => {
    setLoading(true)
    let q = supabase
      .from('documents')
      .select(`
        *,
        contacts(first_name, last_name),
        deals(title),
        properties(title),
        profiles!uploaded_by(full_name)
      `)
      .order('created_at', { ascending: false })

    if (search) q = q.ilike('name', `%${search}%`)
    if (catFilter !== 'all') q = q.eq('category', catFilter)

    const { data } = await q.limit(200)
    setDocs((data || []) as Doc[])
    setLoading(false)
  }

  const loadEntities = async () => {
    const [{ data: c }, { data: d }, { data: p }] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name').order('last_name').limit(200),
      supabase.from('deals').select('id, title').order('created_at', { ascending: false }).limit(200),
      supabase.from('properties').select('id, title').order('title').limit(200),
    ])
    setContacts((c || []) as Contact[])
    setDeals((d || []) as Deal[])
    setProperties((p || []) as Property[])
  }

  const resetForm = () => setForm({
    name: '', category: 'other', contact_id: '', deal_id: '',
    property_id: '', file_path: '', file_size: null, mime_type: '', notes: ''
  })

  const openNew = () => { resetForm(); setSelectedFile(null); setSelectedDoc(null); setShowModal(true) }
  const openEdit = (doc: Doc) => {
    setForm({
      name: doc.name,
      category: doc.category,
      contact_id: doc.contact_id || '',
      deal_id: doc.deal_id || '',
      property_id: doc.property_id || '',
      file_path: doc.file_path || '',
      file_size: doc.file_size,
      mime_type: doc.mime_type || '',
      notes: '',
    })
    setSelectedDoc(doc)
    setSelectedFile(null)
    setShowModal(true)
  }
  const openView = (doc: Doc) => { setSelectedDoc(doc); setShowViewModal(true) }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setForm(f => ({
      ...f,
      name: f.name || file.name.replace(/\.[^/.]+$/, ''),
      file_size: file.size,
      mime_type: file.type,
    }))
  }

  const uploadToStorage = async (file: File, docId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop()
    const path = `documents/${docId}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (error) return null
    return path
  }

  const saveDoc = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const payload: any = {
        name: form.name,
        category: form.category,
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        property_id: form.property_id || null,
        file_size: form.file_size,
        mime_type: form.mime_type || null,
        uploaded_by: profile?.id || null,
      }

      if (selectedDoc) {
        // Update
        if (selectedFile) {
          setUploading(true)
          const path = await uploadToStorage(selectedFile, selectedDoc.id)
          if (path) payload.file_path = path
          setUploading(false)
        }
        await supabase.from('documents').update(payload).eq('id', selectedDoc.id)
      } else {
        // Insert
        const { data: inserted } = await supabase.from('documents').insert(payload).select().single()
        if (inserted && selectedFile) {
          setUploading(true)
          const path = await uploadToStorage(selectedFile, inserted.id)
          if (path) {
            await supabase.from('documents').update({ file_path: path }).eq('id', inserted.id)
          }
          setUploading(false)
        }
        // Log activity
        if (inserted) {
          await supabase.from('activities').insert({
            type: 'document',
            title: `Document uploaded: ${form.name}`,
            description: `New ${form.category} document uploaded: "${form.name}"`,
            contact_id: form.contact_id || null,
            deal_id: form.deal_id || null,
            property_id: form.property_id || null,
            created_by: profile?.id,
          })
        }
      }
      setShowModal(false)
      loadDocs()
    } finally { setSaving(false) }
  }

  const deleteDoc = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await supabase.from('documents').delete().eq('id', id)
    loadDocs()
  }

  const getDownloadUrl = async (path: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // Stats
  const byCategory = CATEGORIES.reduce((acc, c) => {
    acc[c] = docs.filter(d => d.category === c).length
    return acc
  }, {} as Record<string, number>)

  const p = isMobile ? '16px' : '28px 32px 20px'

  const CatIcon = ({ cat, size = 16 }: { cat: string; size?: number }) => {
    const Icon = catIcon[cat] || File
    return <Icon size={size} />
  }

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div style={{ padding: p, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="page-label">Vault</p>
          <h1 className="page-title" style={{ fontSize: isMobile ? '1.6rem' : undefined }}>Document <em>Management</em></h1>
          <p className="page-sub">{docs.length} documents stored</p>
        </div>
        <button className="btn-primary" onClick={openNew}><Plus size={15} />Upload Document</button>
      </div>

      {/* Stats row */}
      {!isMobile && (
        <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 12, overflowX: 'auto' }}>
          {CATEGORIES.filter(c => byCategory[c] > 0).map(cat => {
            const Icon = catIcon[cat] || File
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(catFilter === cat ? 'all' : cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  borderRadius: 8, border: `1px solid ${catFilter === cat ? catColor[cat] : 'var(--border)'}`,
                  background: catFilter === cat ? `${catColor[cat]}12` : 'transparent',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  color: catFilter === cat ? catColor[cat] : 'var(--text-3)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={14} />
                <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'capitalize' }}>{cat}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: catFilter === cat ? catColor[cat] : 'var(--surface-2)', color: catFilter === cat ? '#fff' : 'var(--text-3)', borderRadius: 20, padding: '1px 7px' }}>
                  {byCategory[cat]}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ padding: isMobile ? '12px 16px' : '14px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 160, maxWidth: isMobile ? '100%' : 320 }}>
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-tabs" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {['all', ...CATEGORIES].map(c => (
            <button key={c} className={`filter-tab ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)} style={{ whiteSpace: 'nowrap' }}>
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>
        {loading ? (
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
        ) : docs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><FolderOpen size={22} /></div>
              <p className="empty-title">No documents found</p>
              <p className="empty-sub" style={{ marginBottom: 16 }}>Upload contracts, agreements, identity documents, and more</p>
              <button className="btn-primary" onClick={openNew}><Upload size={14} />Upload Document</button>
            </div>
          </div>
        ) : isMobile ? (
          // Mobile card list
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map(doc => {
              const Icon = catIcon[doc.category] || File
              return (
                <div key={doc.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => openView(doc)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: `${catColor[doc.category]}18`, color: catColor[doc.category], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 500, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{formatDate(doc.created_at)} · {formatSize(doc.file_size)}</p>
                    </div>
                    <span className={`badge ${catBadge[doc.category] || 'badge-gray'}`}>{doc.category}</span>
                  </div>
                  {(doc.contacts || doc.deals || doc.properties) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {doc.contacts && <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11} />{doc.contacts.first_name} {doc.contacts.last_name}</span>}
                      {doc.deals && <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={11} />{doc.deals.title}</span>}
                      {doc.properties && <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={11} />{doc.properties.title}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          // Desktop table
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="crm-table-wrap">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Category</th>
                    <th>Linked To</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => {
                    const Icon = catIcon[doc.category] || File
                    return (
                      <tr key={doc.id} style={{ cursor: 'pointer' }} onClick={() => openView(doc)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${catColor[doc.category]}18`, color: catColor[doc.category], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <p style={{ fontWeight: 500, color: 'var(--text)' }}>{doc.name}</p>
                              {doc.mime_type && <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{doc.mime_type}</p>}
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge ${catBadge[doc.category] || 'badge-gray'}`}>{doc.category}</span></td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {doc.contacts && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}><Users size={11} />{doc.contacts.first_name} {doc.contacts.last_name}</span>}
                            {doc.deals && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}><GitBranch size={11} />{doc.deals.title.length > 32 ? doc.deals.title.slice(0, 32) + '…' : doc.deals.title}</span>}
                            {doc.properties && <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}><Building2 size={11} />{doc.properties.title.length > 32 ? doc.properties.title.slice(0, 32) + '…' : doc.properties.title}</span>}
                            {!doc.contacts && !doc.deals && !doc.properties && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-3)' }}>{formatSize(doc.file_size)}</td>
                        <td style={{ color: 'var(--text-3)' }}>
                          <div>
                            <p>{formatDate(doc.created_at)}</p>
                            {doc.profiles && <p style={{ fontSize: 11, color: 'var(--text-4)' }}>{doc.profiles.full_name}</p>}
                          </div>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openView(doc)} title="View" style={{ color: 'var(--azure)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}><Eye size={15} /></button>
                            {doc.file_path && (
                              <button onClick={() => getDownloadUrl(doc.file_path!)} title="Download" style={{ color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}><Download size={15} /></button>
                            )}
                            <button onClick={() => openEdit(doc)} title="Edit" style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}><FileText size={15} /></button>
                            <button onClick={() => deleteDoc(doc.id)} title="Delete" style={{ color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 3, borderRadius: 4 }}><X size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Upload / Edit Modal ─────────────────────────────── */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth: 600, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <p className="page-label">{selectedDoc ? 'Edit' : 'Upload'} Document</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)' }}>
                  {selectedDoc ? 'Edit Document' : 'Upload New Document'}
                </h2>
                <button className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>

              {/* File drop zone */}
              <div
                style={{
                  border: '2px dashed var(--border-strong)', borderRadius: 10, padding: '24px 20px',
                  textAlign: 'center', marginBottom: 20, cursor: 'pointer',
                  background: selectedFile ? 'var(--green-pale)' : 'var(--surface-2)',
                  borderColor: selectedFile ? 'var(--green)' : 'var(--border-strong)',
                  transition: 'all 0.15s',
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input id="file-input" type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
                {selectedFile ? (
                  <>
                    <FileCheck size={28} color="var(--green)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 600, color: 'var(--green)', fontSize: 14 }}>{selectedFile.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{formatSize(selectedFile.size)}</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="var(--text-4)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 500, color: 'var(--text-2)', fontSize: 14 }}>Click to select a file</p>
                    <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>
                      {selectedDoc?.file_path ? 'Replace existing file or leave empty to keep current' : 'PDF, Word, Excel, images and more'}
                    </p>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                  <label className="form-label">Document Name *</label>
                  <input className="crm-input" placeholder="e.g. Purchase Agreement — Horizon Cove" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Link to Contact</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })}>
                      <option value="">— None —</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Link to Deal</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}>
                      <option value="">— None —</option>
                      {deals.map(d => <option key={d.id} value={d.id}>{d.title.length > 48 ? d.title.slice(0, 48) + '…' : d.title}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Link to Property</label>
                  <div className="crm-select-wrap">
                    <select className="crm-select" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })}>
                      <option value="">— None —</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title.length > 48 ? p.title.slice(0, 48) + '…' : p.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Note about storage */}
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--azure-pale)', border: '1px solid var(--azure-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={14} color="var(--azure)" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: 'var(--azure)', lineHeight: 1.5 }}>
                  Files are uploaded to Supabase Storage. Ensure a <strong>documents</strong> bucket exists in your Supabase project with appropriate policies. Document records are saved regardless.
                </p>
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={saveDoc}
                disabled={saving || uploading || !form.name}
              >
                {(saving || uploading)
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} />{uploading ? 'Uploading…' : 'Saving…'}</>
                  : <><Upload size={14} />{selectedDoc ? 'Update Document' : 'Save Document'}</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── View Modal ──────────────────────────────────────── */}
      {showViewModal && selectedDoc && (
        <Modal onClose={() => setShowViewModal(false)}>
          <div className="modal" style={{ width: isMobile ? '100%' : '90%', maxWidth: 520, display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <p className="page-label">Document Details</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${catColor[selectedDoc.category]}18`, color: catColor[selectedDoc.category], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CatIcon cat={selectedDoc.category} size={20} />
                  </div>
                  <h2 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 400, color: 'var(--text)' }}>
                    {selectedDoc.name}
                  </h2>
                </div>
                <button className="btn-ghost" style={{ padding: 6, flexShrink: 0 }} onClick={() => setShowViewModal(false)}><X size={18} /></button>
              </div>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Category', value: selectedDoc.category, badge: catBadge[selectedDoc.category] },
                  { label: 'File Size', value: formatSize(selectedDoc.file_size) },
                  { label: 'Type', value: selectedDoc.mime_type || '—' },
                  { label: 'Uploaded', value: formatDate(selectedDoc.created_at) },
                ].map(row => (
                  <div key={row.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{row.label}</p>
                    {row.badge
                      ? <span className={`badge ${row.badge}`}>{row.value}</span>
                      : <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{row.value}</p>
                    }
                  </div>
                ))}
              </div>

              {/* Linked entities */}
              {(selectedDoc.contacts || selectedDoc.deals || selectedDoc.properties) && (
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Linked To</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedDoc.contacts && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <Users size={14} color="var(--azure)" />
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 1 }}>Contact</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedDoc.contacts.first_name} {selectedDoc.contacts.last_name}</p>
                        </div>
                      </div>
                    )}
                    {selectedDoc.deals && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <GitBranch size={14} color="var(--gold)" />
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 1 }}>Deal</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedDoc.deals.title}</p>
                        </div>
                      </div>
                    )}
                    {selectedDoc.properties && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <Building2 size={14} color="var(--green)" />
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 1 }}>Property</p>
                          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedDoc.properties.title}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedDoc.profiles && (
                <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>Uploaded by</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{selectedDoc.profiles.full_name}</p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn-ghost" onClick={() => { setShowViewModal(false); openEdit(selectedDoc) }}><FileText size={14} />Edit</button>
              {selectedDoc.file_path && (
                <button className="btn-gold" onClick={() => getDownloadUrl(selectedDoc.file_path!)}><Download size={14} />Download</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
