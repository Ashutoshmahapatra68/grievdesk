import { get } from './apiClient'

export const ticketApi = {
  /**
   * Get all resident tickets (complaints & service requests with full timelines)
   */
  getMyTickets: async () => {
    return get('/api/my-tickets')
  },
}
