import React, { useState, useEffect } from 'react'
import {
  Wrench,
  Search,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  Home,
} from 'lucide-react'
import { serviceRequestApi } from '@/api/serviceRequestApi'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { SERVICE_TYPES, SERVICE_STATUSES } from '@/lib/constants'

export function ManagementServices() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedRequest, setSelectedRequest] = useState(null)
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('in_progress')
  const [updating, setUpdating] = useState(false)

  const fetchServices = () => {
    setLoading(true)
    serviceRequestApi.listServiceRequests()
      .then((res) => setRequests(res.service_requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    setUpdating(true)
    try {
      await serviceRequestApi.updateStatus(selectedRequest.id, newStatus)
      toast.success('Service status updated.')
      setStatusModalOpen(false)
      fetchServices()
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: newStatus })
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update status.')
    } finally {
      setUpdating(false)
    }
  }

  const filtered = requests.filter((r) => {
    if (typeFilter !== 'all' && r.service_type !== typeFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = String(r.id).includes(q)
      const matchText = (r.description || '').toLowerCase().includes(q)
      const matchRequester = (r.requested_by || '').toLowerCase().includes(q)
      const matchFlat = (r.flat_no || '').toLowerCase().includes(q)
      if (!matchId && !matchText && !matchRequester && !matchFlat) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Service Requests</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Coordinate maintenance handymen (plumber, electrician, AC mechanic, laundry, vehicle servicing).
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, flat, resident, service description…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
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
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
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

      {/* Service Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Ticket #</th>
                <th className="px-4 py-3.5">Service Type</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Resident & Unit</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Requested At</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">
                    No service requests match the filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      #{r.id}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold capitalize text-slate-800 whitespace-nowrap">
                      {r.service_type?.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs text-xs text-slate-700 truncate">
                      {r.description}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block truncate">
                        {r.requested_by || 'Resident'}
                      </span>
                      <span>Block {r.block_no} · Flat {r.flat_no}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge variant={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedRequest(r)
                          setNewStatus(r.status)
                          setStatusModalOpen(true)
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Modal */}
      {statusModalOpen && selectedRequest && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title={`Update Service Ticket #${selectedRequest.id}`}
          maxWidth="max-w-md"
          icon={Wrench}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
              <p><strong>Resident:</strong> {selectedRequest.requested_by} (Block {selectedRequest.block_no}, Flat {selectedRequest.flat_no})</p>
              <p><strong>Service:</strong> {selectedRequest.service_type?.replace('_', ' ')}</p>
              <p className="text-slate-600">{selectedRequest.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              >
                {SERVICE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
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
                disabled={updating}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {updating ? 'Saving…' : 'Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
