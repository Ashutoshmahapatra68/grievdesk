import { get, post, patch } from './apiClient'

export const notificationApi = {
  /**
   * Get current user's notifications
   * @param {Object} params - { limit?, offset? }
   */
  getMyNotifications: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.limit !== undefined) query.set('limit', params.limit)
    if (params.offset !== undefined) query.set('offset', params.offset)
    const qs = query.toString()
    return get(`/api/notifications/me${qs ? `?${qs}` : ''}`)
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId
   */
  markRead: async (notificationId) => {
    return patch(`/api/notifications/${notificationId}/read`)
  },

  /**
   * Mark all notifications as read
   */
  markAllRead: async () => {
    return post('/api/notifications/read-all')
  },
}
