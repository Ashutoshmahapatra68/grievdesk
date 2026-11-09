import { get, patch, del } from './apiClient'

export const announcementApi = {
  /**
   * List announcements (pinned and general)
   * @param {Object} params - { limit?, offset? }
   */
  listAnnouncements: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.limit !== undefined) query.set('limit', params.limit)
    if (params.offset !== undefined) query.set('offset', params.offset)
    const qs = query.toString()
    return get(`/api/announcements${qs ? `?${qs}` : ''}`)
  },

  /**
   * Pin or unpin announcement (Committee or Secretary)
   * @param {number} announcementId
   * @param {boolean} pinned
   */
  pinAnnouncement: async (announcementId, pinned) => {
    return patch(`/api/announcements/${announcementId}/pin`, { pinned })
  },

  /**
   * Edit announcement title/message (Committee or Secretary)
   * @param {number} announcementId
   * @param {Object} data - { title?: string, message?: string }
   */
  editAnnouncement: async (announcementId, data) => {
    return patch(`/api/announcements/${announcementId}`, data)
  },

  /**
   * Delete announcement (Committee or Secretary)
   * @param {number} announcementId
   */
  deleteAnnouncement: async (announcementId) => {
    return del(`/api/announcements/${announcementId}`)
  },
}
