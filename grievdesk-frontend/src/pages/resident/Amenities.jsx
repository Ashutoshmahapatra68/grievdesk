import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'
import { amenityApi } from '@/api/amenityApi'
import { useToast } from '@/context/ToastContext'
import { Modal } from '@/components/common/Modal'
import { Badge } from '@/components/common/Badge'

export function ResidentAmenities() {
  const toast = useToast()
  const [tab, setTab] = useState('explore') // 'explore' | 'my_bookings'
  const [amenities, setAmenities] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Booking Modal State
  const [selectedAmenity, setSelectedAmenity] = useState(null)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [availability, setAvailability] = useState(null)
  const [availLoading, setAvailLoading] = useState(false)

  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      amenityApi.listAmenities().catch(() => ({ amenities: [] })),
      amenityApi.getMyBookings().catch(() => ({ bookings: [] })),
    ])
      .then(([aRes, bRes]) => {
        setAmenities(aRes.amenities || [])
        setMyBookings(bRes.bookings || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [])

  const loadAvailability = (amenityId, date) => {
    setAvailLoading(true)
    amenityApi.getAvailability(amenityId, date)
      .then((res) => {
        setAvailability(res)
      })
      .catch(() => setAvailability(null))
      .finally(() => setAvailLoading(false))
  }

  const handleOpenBooking = (amenity) => {
    setSelectedAmenity(amenity)
    setBookingError(null)
    loadAvailability(amenity.id, selectedDate)
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    if (selectedAmenity) {
      loadAvailability(selectedAmenity.id, newDate)
    }
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setBookingError(null)
    setBookingSubmitting(true)

    try {
      await amenityApi.createBooking({
        amenity_id: selectedAmenity.id,
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
      })
      toast.success(`${selectedAmenity.name} has been booked successfully!`)
      setSelectedAmenity(null)
      fetchData()
    } catch (err) {
      setBookingError(err.message || 'Unable to complete reservation.')
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return
    try {
      await amenityApi.cancelBooking(bookingId)
      toast.success('Reservation cancelled.')
      fetchData()
    } catch (err) {
      toast.error(err.message || 'Failed to cancel reservation.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Community Amenities</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse clubhouse, gym, sports courts, and reserve slots in advance.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl self-start">
          <button
            onClick={() => setTab('explore')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'explore' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Explore Amenities
          </button>
          <button
            onClick={() => setTab('my_bookings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'my_bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            My Reservations ({myBookings.length})
          </button>
        </div>
      </div>

      {tab === 'explore' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="bg-card border border-border rounded-2xl p-6 shadow-card animate-pulse space-y-3">
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : amenities.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-card">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No amenities registered yet</h3>
              <p className="text-xs text-slate-500 mt-1">The society management has not listed facilities yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {amenities.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-border/80 rounded-2xl p-6 shadow-card flex flex-col justify-between hover:border-blue-400 hover:shadow-elevation transition-all"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed min-h-[2.5rem]">
                      {item.description || 'Community facility available for resident booking.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Max 4 hours / slot</span>
                    <button
                      onClick={() => handleOpenBooking(item)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                    >
                      Book Facility
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Reservations Tab */
        <div className="bg-card border border-border/80 rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-border bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">My Facility Bookings</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b border-border">
                <tr>
                  <th className="px-4 py-3.5">Facility</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Time Slot</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {myBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-xs">
                      You have no active or previous amenity bookings.
                    </td>
                  </tr>
                ) : (
                  myBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{b.amenity_name}</td>
                      <td className="px-4 py-3.5 text-slate-600">{b.date}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {b.start_time} - {b.end_time}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={b.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {b.status === 'booked' && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                          >
                            Cancel
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
      )}

      {/* Booking Dialog Modal */}
      {selectedAmenity && (
        <Modal
          isOpen={!!selectedAmenity}
          onClose={() => setSelectedAmenity(null)}
          title={`Reserve ${selectedAmenity.name}`}
          description="Select date and preferred hours. Maximum reservation length is 4 hours."
          maxWidth="max-w-lg"
          icon={CalendarDays}
        >
          <form onSubmit={handleCreateBooking} className="space-y-4">
            {bookingError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reservation Date
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600"
              />
            </div>

            {/* Existing Booked Slots on that day */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">Existing Reservations on {selectedDate}:</span>
              {availLoading ? (
                <p className="text-xs text-slate-400">Checking availability…</p>
              ) : availability?.booked?.length === 0 ? (
                <p className="text-xs text-emerald-600 font-medium">All slots open throughout the day.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availability?.booked?.map((slot, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-100 text-rose-800 font-semibold"
                    >
                      {slot.start_time} - {slot.end_time} {slot.mine ? '(Your booking)' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Start Time (24h)
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  End Time (24h)
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-blue-600 font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAmenity(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookingSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {bookingSubmitting ? 'Confirming…' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
