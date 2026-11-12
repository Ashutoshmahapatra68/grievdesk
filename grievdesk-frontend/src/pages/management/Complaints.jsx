import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Layers,
  Volume2,
  UserCheck,
  Edit,
  ArrowRight,
  Link as LinkIcon,
} from 'lucide-react'
import { complaintApi } from '@/api/complaintApi'
import { userApi } from '@/api/userApi'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { AudioPlayer } from '@/components/common/AudioPlayer'
import { CATEGORIES, COMPLAINT_STATUSES, SEVERITIES } from '@/lib/constants'

export function ManagementComplaints() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')

  const [complaints, setComplaints] = useState([])
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [blockFilter, setBlockFilter] = useState('all')

  // Selected Detail Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Action Modals State
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('in_progress')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assigneeId, setAssigneeId] = useState('')

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateTargetId, setDuplicateTargetId] = useState('')

  const fetchComplaints = () => {
    setLoading(true)
    Promise.all([
      complaintApi.listComplaints({ limit: 100 }),
      userApi.getDirectory('approved').catch(() => ({ users: [] })),
    ])
      .then(([cRes, uRes]) => {
        const list = cRes.complaints || []
        setComplaints(list)
        // Filter staff members (committee and secretary)
        const staff = (uRes.users || []).filter(
          (u) => u.role === 'committee' || u.role === 'secretary'
        )
        setStaffMembers(staff)

        if (initialId) {
          const match = list.find((c) => String(c.id) === String(initialId))
          if (match) openDetail(match)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchComplaints()
  }, [initialId])

  const openDetail = async (complaint) => {
    setSelectedComplaint(complaint)
    setDetailLoading(true)
    try {
      const full = await complaintApi.getComplaint(complaint.id)
      setSelectedComplaint(full)
    } catch {
      // Keep existing
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const res = await complaintApi.updateStatus(selectedComplaint.id, {
        status: newStatus,
        resolution_notes: resolutionNotes.trim() || undefined,
      })
      toast.success(res.message || 'Status updated.')
      setStatusModalOpen(false)
      openDetail({ id: selectedComplaint.id })
      fetchComplaints()
    } catch (err) {
      toast.error(err.message || 'Failed to update status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const target = assigneeId === 'unassigned' || !assigneeId ? null : Number(assigneeId)
      const res = await complaintApi.assign(selectedComplaint.id, target)
      toast.success(res.message || 'Assignment updated.')
      setAssignModalOpen(false)
      openDetail({ id: selectedComplaint.id })
      fetchComplaints()
    } catch (err) {
      toast.error(err.message || 'Failed to update assignment.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetDuplicate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      const target = duplicateTargetId === 'unlink' || !duplicateTargetId ? null : Number(duplicateTargetId)
      const res = await complaintApi.setDuplicate(selectedComplaint.id, target)
      toast.success(res.message || 'Duplicate linkage updated.')
      setDuplicateModalOpen(false)
      openDetail({ id: selectedComplaint.id })
      fetchComplaints()
    } catch (err) {
      toast.error(err.message || 'Failed to link duplicate.')
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false
    if (blockFilter !== 'all' && c.block_no !== blockFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = String(c.id).includes(q)
      const matchText = (c.translated_text || '').toLowerCase().includes(q)
      const matchCat = (c.category || '').toLowerCase().includes(q)
      const matchUser = (c.submitted_by || '').toLowerCase().includes(q)
      const matchFlat = (c.flat_no || '').toLowerCase().includes(q)
      if (!matchId && !matchText && !matchCat && !matchUser && !matchFlat) return false
    }
    return true
  })

  const blocks = Array.from(new Set(complaints.map((c) => c.block_no).filter(Boolean))).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Complaints Center</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review, assign, escalate, and resolve community complaints. Link duplicates and inspect audio notes.
        </p>
      </div>

      {/* Multi-criteria Filter Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, flat, resident name, description…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">All Statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">All Severities</option>
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev.toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
            >
              <option value="all">All Blocks</option>
              {blocks.map((b) => (
                <option key={b} value={b}>
                  Block {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Ticket #</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Summary</th>
                <th className="px-4 py-3.5">Reporter & Unit</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assignee</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No complaints match the selected criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openDetail(c)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      #{c.id}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {c.category}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs text-xs text-slate-700 truncate">
                      {c.translated_text}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block truncate">
                        {c.submitted_by || 'Resident'}
                      </span>
                      <span>Block {c.block_no} · Flat {c.flat_no}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={c.severity} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={c.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {c.assigned_to || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openDetail(c)
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complaint Detail & Operations Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Complaint #${selectedComplaint.id}`}
          description={`Reported by ${selectedComplaint.submitted_by || 'Resident'} · Unit: Block ${selectedComplaint.block_no}, Flat ${selectedComplaint.flat_no}`}
          maxWidth="max-w-3xl"
          icon={AlertTriangle}
        >
          <div className="space-y-5">
            {/* Action Buttons Toolbar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setNewStatus(selectedComplaint.status)
                  setResolutionNotes(selectedComplaint.resolution_notes || '')
                  setStatusModalOpen(true)
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Update Status</span>
              </button>

              <button
                onClick={() => {
                  setAssigneeId('')
                  setAssignModalOpen(true)
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Assign Ticket</span>
              </button>

              <button
                onClick={() => {
                  setDuplicateTargetId(selectedComplaint.duplicate_of || '')
                  setDuplicateModalOpen(true)
                }}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{selectedComplaint.duplicate_of ? 'Change Duplicate Link' : 'Mark as Duplicate'}</span>
              </button>
            </div>

            {/* Badges Overview */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selectedComplaint.status} />
              <Badge variant={selectedComplaint.severity} />
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                Category: {selectedComplaint.category}
              </span>
              {selectedComplaint.is_anonymous && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Anonymous to Residents (Revealed to Staff)
                </span>
              )}
              {selectedComplaint.duplicate_of && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  Linked Duplicate of #{selectedComplaint.duplicate_of}
                </span>
              )}
            </div>

            {/* Complaint Text */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Formal Summary</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.translated_text}
              </p>
            </div>

            {/* Audio Recording if available */}
            {selectedComplaint.audio_available && (
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1.5">Voice Note</p>
                <AudioPlayer complaintId={selectedComplaint.id} />
              </div>
            )}

            {/* Resolution Notes */}
            {selectedComplaint.resolution_notes && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Resolution Notes
                </span>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {selectedComplaint.resolution_notes}
                </p>
              </div>
            )}

            {/* Assignee Box */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Handler:</span>
              <span className="font-bold text-slate-800">
                {selectedComplaint.assigned_to || 'Unassigned'}
              </span>
            </div>

            {/* Linked Reports if root complaint */}
            {selectedComplaint.linked_reports && selectedComplaint.linked_reports.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-blue-900 block">
                  Other Reports Linked to This Complaint ({selectedComplaint.linked_reports.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedComplaint.linked_reports.map((rid) => (
                    <span key={rid} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      #{rid}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Event Timeline */}
            <div>
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">Audit Timeline</p>
              {selectedComplaint.timeline && selectedComplaint.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedComplaint.timeline.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold capitalize text-slate-800">
                            {evt.action?.replace('_', ' ')}
                          </span>
                          <span className="text-slate-400">
                            {(evt.at || evt.created_at) ? new Date(evt.at || evt.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {evt.detail && <p className="text-slate-600 mt-0.5 capitalize">{evt.detail.replace('_', ' ')}</p>}
                        {evt.note && <p className="text-slate-600 mt-0.5 italic">"{evt.note}"</p>}
                        {(evt.by || evt.actor_name) && (
                          <p className="text-slate-400 text-[11px] mt-0.5">By {evt.by || evt.actor_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No events logged.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Action 1: Status Update Modal */}
      {statusModalOpen && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Update Complaint #${selectedComplaint.id} Status`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              >
                {COMPLAINT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Resolution Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the corrective action taken for the resident…"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {actionLoading ? 'Updating…' : 'Save Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Action 2: Ticket Assignment Modal */}
      {assignModalOpen && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Assign Complaint #${selectedComplaint.id}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assign To Staff Member
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              >
                <option value="unassigned">-- Unassigned --</option>
                {staffMembers.map((sm) => (
                  <option key={sm.id} value={sm.id}>
                    {sm.name} ({sm.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {actionLoading ? 'Saving…' : 'Update Assignee'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Action 3: Duplicate Link Modal */}
      {duplicateModalOpen && (
        <Modal
          isOpen={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          title={`Duplicate Link for #${selectedComplaint.id}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSetDuplicate} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Link this report as a duplicate of an existing root complaint. The original will aggregate the affected resident count.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Root Complaint Ticket ID
              </label>
              <input
                type="number"
                placeholder="Enter root complaint ID (or blank to unlink)"
                value={duplicateTargetId}
                onChange={(e) => setDuplicateTargetId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {actionLoading ? 'Saving…' : duplicateTargetId ? 'Link Duplicate' : 'Unlink'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
