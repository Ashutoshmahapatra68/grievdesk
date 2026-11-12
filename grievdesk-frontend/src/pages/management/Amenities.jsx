import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  AlertCircle,
  Building,
} from 'lucide-react'
import { amenityApi } from '@/api/amenityApi'
import { useToast } from '@/context/ToastContext'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export function ManagementAmenities() {
  const toast = useToast()
  const [amenities, setAmenities] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('bookings') // 'bookings' | 'facilities'

  // Filter
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Add Amenity Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)

  // Cancel Booking
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchData = () => {
    setLoading(true)
    const params = {}
    if (dateFilter) params.date = dateFilter
    if (statusFilter !== 'all') params.status = statusFilter

    Promise.all([
      amenityApi.listAmenities().catch(() => ({ amenities: [] })),
      amenityApi.listAllBookings(params).catch(() => ({ bookings: [] })),
    ])
      .then(([aRes, bRes]) => {
        setAmenities(aRes.amenities || [])
        setBookings(bRes.bookings || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [dateFilter, statusFilter])

  const handleCreateAmenity = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      await amenityApi.createAmenity({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast.success('Facility added successfully.')
      setAddModalOpen(false)
      setName('')
      setDescription('')
      fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to add amenity.')
    } finally {
      setAdding(false)
    }
  }

  const handleCancelBooking = async () => {
    if (!cancelTargetId) return
    setCancelling(true)
    try {
      await amenityApi.cancelBooking(cancelTargetId)
      toast.success('Reservation cancelled and resident notified.')
      setCancelTargetId(null)
      fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel reservation.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Amenities & Facilities</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Oversee community facility reservations, add amenities, and manage slot schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Facility</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl self-start max-w-xs">
        <button
          onClick={() => setTab('bookings')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Community Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setTab('facilities')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            tab === 'facilities' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Facility Catalog ({amenities.length})
        </button>
      </div>

      {tab === 'bookings' ? (
        <div className="space-y-4">
          {/* Booking Filters */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Date:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-bold text-slate-600 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl"
              >
                <option value="all">All</option>
                <option value="booked">Booked (Active)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                  <tr>
                    <th className="px-4 py-3.5">Booking #</th>
                    <th className="px-4 py-3.5">Facility</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Time Slot</th>
                    <th className="px-4 py-3.5">Resident</th>
                    <th className="px-4 py-3.5">Status</th>
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
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">
                        No community bookings recorded.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          #{b.id}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                          {b.amenity || b.amenity_name || 'Facility'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {b.date}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {b.start_time} - {b.end_time}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">{b.booked_by || b.user_name || 'Resident'}</span>
                          {(b.block_no || b.flat_no) && (
                            <span className="text-slate-500">Block {b.block_no} · Flat {b.flat_no}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={b.status} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {b.status === 'booked' && (
                            <button
                              onClick={() => setCancelTargetId(b.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Facilities Catalog Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {amenities.map((a) => (
            <div
              key={a.id}
              className="bg-card border border-border/80 rounded-2xl p-6 shadow-card space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{a.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed min-h-[2.5rem]">
                {a.description || 'Community facility.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Amenity Modal */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add Community Facility"
          description="Register a new facility available for resident reservations."
          icon={Building}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateAmenity} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Facility Name
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Squash Court, Clubhouse Lounge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Description (Max 300 chars)
              </label>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="Guidelines, equipment available, capacity…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
              >
                {adding ? 'Saving…' : 'Save Facility'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={!!cancelTargetId}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleCancelBooking}
        title="Cancel Resident Reservation"
        description="Are you sure you want to cancel this booking? The resident will be sent an automated notification."
        confirmText="Cancel Reservation"
        danger
        loading={cancelling}
      />
    </div>
  )
}
