import { get, post, del } from './apiClient'

export const amenityApi = {
  /**
   * List all society amenities
   */
  listAmenities: async () => {
    return get('/api/amenities')
  },

  /**
   * Create new amenity (Committee or Secretary)
   * @param {Object} data - { name: string, description?: string }
   */
  createAmenity: async (data) => {
    return post('/api/amenities', data)
  },

  /**
   * Get booked slots / availability for an amenity on a specific date
   * @param {number} amenityId
   * @param {string} date - 'YYYY-MM-DD'
   */
  getAvailability: async (amenityId, date) => {
    return get(`/api/amenities/${amenityId}/availability?date=${encodeURIComponent(date)}`)
  },

  /**
   * Book an amenity
   * @param {Object} data - { amenity_id: number, date: 'YYYY-MM-DD', start_time: 'HH:MM', end_time: 'HH:MM' }
   */
  createBooking: async (data) => {
    return post('/api/amenity-bookings', data)
  },

  /**
   * Get current resident's bookings
   */
  getMyBookings: async () => {
    return get('/api/amenity-bookings/me')
  },

  /**
   * Get all society bookings (Committee or Secretary)
   * @param {Object} params - { date?, amenity_id?, status? }
   */
  listAllBookings: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.date) query.set('date', params.date)
    if (params.amenity_id) query.set('amenity_id', params.amenity_id)
    if (params.status) query.set('status', params.status)
    const qs = query.toString()
    return get(`/api/amenity-bookings${qs ? `?${qs}` : ''}`)
  },

  /**
   * Cancel booking (Owner or Staff)
   * @param {number} bookingId
   */
  cancelBooking: async (bookingId) => {
    return del(`/api/amenity-bookings/${bookingId}`)
  },
}
