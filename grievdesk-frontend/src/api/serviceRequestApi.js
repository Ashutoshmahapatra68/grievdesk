import { get, patch } from './apiClient'

export const serviceRequestApi = {
  /**
   * List service requests (resident gets own, staff gets all)
   */
  listServiceRequests: async () => {
    return get('/api/service-requests')
  },

  /**
   * Get single service request details and timeline
   * @param {number} requestId
   */
  getServiceRequest: async (requestId) => {
    return get(`/api/service-requests/${requestId}`)
  },

  /**
   * Update status of service request (Committee or Secretary)
   * @param {number} requestId
   * @param {'new'|'in_progress'|'resolved'} status
   */
  updateStatus: async (requestId, status) => {
    return patch(`/api/service-requests/${requestId}/status`, { status })
  },
}
