import { get, put, patch } from './apiClient'

export const userApi = {
  /**
   * Get current authenticated user's profile
   */
  getMe: async () => {
    return get('/api/users/me')
  },

  /**
   * Update current user profile
   * @param {Object} updates - { name?, phone?, preferred_language?, share_phone?, flat_no?, block_no?, current_password?, new_password?, confirm_reapproval? }
   */
  updateMe: async (updates) => {
    return put('/api/users/me', updates)
  },

  /**
   * Get society directory of users
   * @param {string} status - 'approved' | 'pending'
   */
  getDirectory: async (status = 'approved') => {
    return get(`/api/users/directory?status=${encodeURIComponent(status)}`)
  },

  /**
   * Get pending registrations (Secretary only)
   */
  getPending: async () => {
    return get('/api/users/pending')
  },

  /**
   * Approve a pending user (Secretary only)
   * @param {number} userId
   */
  approveUser: async (userId) => {
    return patch(`/api/users/${userId}/approve`)
  },

  /**
   * Promote resident to committee member (Committee or Secretary)
   * @param {number} userId
   */
  promoteToCommittee: async (userId) => {
    return patch(`/api/users/${userId}/promote-to-committee`)
  },

  /**
   * Demote committee member back to resident (Secretary only)
   * @param {number} userId
   */
  demoteUser: async (userId) => {
    return patch(`/api/users/${userId}/demote`)
  },

  /**
   * Transfer Secretary role to another approved member (Secretary only)
   * @param {number} userId
   */
  transferSecretary: async (userId) => {
    return patch(`/api/users/${userId}/transfer-secretary`, { confirm: true })
  },
}
