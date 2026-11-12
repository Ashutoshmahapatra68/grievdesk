import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Search,
  Filter,
  MessageSquarePlus,
  Clock,
  User,
  CheckCircle2,
  Share2,
  Calendar,
  Volume2,
  X,
  Layers,
} from 'lucide-react'
import { ticketApi } from '@/api/ticketApi'
import { complaintApi } from '@/api/complaintApi'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { AudioPlayer } from '@/components/common/AudioPlayer'
import { CATEGORIES, COMPLAINT_STATUSES } from '@/lib/constants'

export function ResidentComplaints() {
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')

  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchComplaints = () => {
    setLoading(true)
    ticketApi.getMyTickets()
      .then((res) => {
        const list = res.complaints || []
        setComplaints(list)

        if (initialId) {
          const target = list.find((c) => String(c.id) === String(initialId))
          if (target) setSelectedComplaint(target)
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
      // Keep existing complaint object
    } finally {
      setDetailLoading(false)
    }
  }

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = String(c.id).includes(q)
      const matchText = (c.translated_text || '').toLowerCase().includes(q)
      const matchCat = (c.category || '').toLowerCase().includes(q)
      if (!matchId && !matchText && !matchCat) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Complaints</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track issues raised, assigned committee members, and resolution timeline.
          </p>
        </div>

        <Link
          to="/resident/ai-assistant?type=complaint"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors self-start"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Complaint via AI</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, category, description…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-blue-600"
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
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-blue-600"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No complaints match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try resetting the filter criteria above.'
              : 'You have not submitted any complaints yet.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
              className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => openDetail(c)}
              className="bg-card border border-border/80 hover:border-blue-400 hover:shadow-elevation rounded-2xl p-5 shadow-card transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      #{c.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">· {c.category || 'Other'}</span>
                  </div>
                  <Badge variant={c.status} size="sm" />
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-3">
                  {c.translated_text || 'No description recorded.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Badge variant={c.severity} size="sm" />
                  {c.audio_available && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Volume2 className="w-3 h-3" /> Voice Note
                    </span>
                  )}
                  {c.duplicate_of && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      <Layers className="w-3 h-3" /> Linked to #{c.duplicate_of}
                    </span>
                  )}
                </div>

                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={!!selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          title={`Complaint #${selectedComplaint.id} Details`}
          description={`Category: ${selectedComplaint.category || 'General'} · Flat ${selectedComplaint.flat_no || 'Hidden'}`}
          maxWidth="max-w-2xl"
          icon={AlertTriangle}
        >
          <div className="space-y-5">
            {/* Badges Overview */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selectedComplaint.status} />
              <Badge variant={selectedComplaint.severity} />
              {selectedComplaint.is_anonymous && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Submitted Anonymously
                </span>
              )}
              {selectedComplaint.duplicate_of && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  Duplicate of Ticket #{selectedComplaint.duplicate_of}
                </span>
              )}
              {selectedComplaint.reports_count && selectedComplaint.reports_count > 1 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {selectedComplaint.reports_count} Residents Impacted
                </span>
              )}
            </div>

            {/* Description Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider">Complaint Summary</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedComplaint.translated_text}
              </p>
            </div>

            {/* Audio Recording Player if attached */}
            {selectedComplaint.audio_available && (
              <div>
                <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-1.5">Voice Note Recording</p>
                <AudioPlayer complaintId={selectedComplaint.id} />
              </div>
            )}

            {/* Resolution Notes if resolved */}
            {selectedComplaint.resolution_notes && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolution Notes
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  {selectedComplaint.resolution_notes}
                </p>
              </div>
            )}

            {/* Assignee Information */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500">Assigned Committee Handler:</span>
              <span className="font-bold text-slate-800">
                {selectedComplaint.assigned_to || 'Unassigned'}
              </span>
            </div>

            {/* Resolution Timeline */}
            <div>
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">Event Timeline</p>
              {selectedComplaint.timeline && selectedComplaint.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedComplaint.timeline.map((event, idx) => (
                    <div key={event.id || idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold capitalize text-slate-800">{event.action?.replace('_', ' ')}</span>
                          <span className="text-slate-400">
                            {(event.at || event.created_at) ? new Date(event.at || event.created_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {event.detail && (
                          <p className="text-slate-600 mt-0.5 capitalize">{event.detail.replace('_', ' ')}</p>
                        )}
                        {event.note && (
                          <p className="text-slate-600 mt-0.5 italic">"{event.note}"</p>
                        )}
                        {(event.by || event.actor_name) && (
                          <p className="text-slate-400 text-[11px] mt-0.5">By {event.by || event.actor_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No events logged yet.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
