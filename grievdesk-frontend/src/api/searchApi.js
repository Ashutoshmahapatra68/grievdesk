import { get } from './apiClient'

export const searchApi = {
  /**
   * Search globally across complaints, service requests, announcements, and rules
   * @param {string} query
   * @param {number} [limit=10]
   */
  search: async (query, limit = 10) => {
    return get(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  },
}
