import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Ticket,
  Wrench,
  Search,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquarePlus,
  AlertCircle,
} from 'lucide-react'
import { ticketApi } from '@/api/ticketApi'
import { serviceRequestApi } from '@/api/serviceRequestApi'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { SERVICE_TYPES, SERVICE_STATUSES } from '@/lib/constants'

export function ResidentTickets() {
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)

  useEffect(() => {
    ticketApi.getMyTickets()
      .then((res) => {
        const list = res.service_requests || []
        setRequests(list)
        if (initialId) {
          const match = list.find((s) => String(s.id) === String(initialId))
          if (match) setSelectedRequest(match)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialId])

  const openDetail = async (req) => {
    setSelectedRequest(req)
    try {
      const full = await serviceRequestApi.getServiceRequest(req.id)
      setSelectedRequest(full)
    } catch {
      // Keep req as is
    }
  }

  const filtered = requests.filter((r) => {
    if (typeFilter !== 'all' && r.service_type !== typeFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = String(r.id).includes(q)
      const matchText = (r.description || '').toLowerCase().includes(q)
      const matchType = (r.service_type || '').toLowerCase().includes(q)
      if (!matchId && !matchText && !matchType) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Requests</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track society handyman & technical service requests (Plumber, Electrician, AC, etc.).
          </p>
        </div>

        <Link
          to="/resident/ai-assistant?type=service"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors self-start"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Request Service via AI</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service requests…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-blue-600"
          >
            <option value="all">All Service Types</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:border-blue-600"
          >
            <option value="all">All Statuses</option>
            {SERVICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-card animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-6 bg-slate-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No service requests found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Need an electrician, plumber or AC technician? Request one via AI assistant.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => (
            <div
              key={req.id}
              onClick={() => openDetail(req)}
              className="bg-card border border-border/80 hover:border-blue-400 hover:shadow-elevation rounded-2xl p-5 shadow-card transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                      #{req.id}
                    </span>
                    <span className="text-xs font-bold text-slate-600 capitalize">
                      · {req.service_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant={req.status} size="sm" />
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">
                  {req.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  {req.created_at ? new Date(req.created_at).toLocaleDateString() : ''}
                </span>
                <span className="text-[11px] text-blue-600 font-semibold">
                  View Timeline →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Service Request #${selectedRequest.id}`}
          description={`Service: ${selectedRequest.service_type?.replace('_', ' ')?.toUpperCase()}`}
          maxWidth="max-w-xl"
          icon={Wrench}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase">Current Status</span>
              <Badge variant={selectedRequest.status} />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Requirement Description</p>
              <p className="text-sm text-slate-800 leading-relaxed">{selectedRequest.description}</p>
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-slate-500 tracking-wider mb-3">Service Timeline</p>
              {selectedRequest.timeline && selectedRequest.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedRequest.timeline.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold capitalize text-slate-800">{evt.action?.replace('_', ' ')}</span>
                          <span className="text-slate-400">{evt.created_at ? new Date(evt.created_at).toLocaleString() : ''}</span>
                        </div>
                        {evt.detail && <p className="text-slate-600 mt-0.5">{evt.detail}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No events recorded.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
