import { get, post, patch, del } from './apiClient'

export const duesApi = {
  /**
   * Get current resident's dues summary
   */
  getMyDues: async () => {
    return get('/api/dues/me')
  },

  /**
   * List dues across society (Committee or Secretary)
   * @param {Object} params - { status?, month?, flat_no?, block_no? }
   */
  listDues: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.month) query.set('month', params.month)
    if (params.flat_no) query.set('flat_no', params.flat_no)
    if (params.block_no) query.set('block_no', params.block_no)
    const qs = query.toString()
    return get(`/api/dues${qs ? `?${qs}` : ''}`)
  },

  /**
   * Create a due record (Committee or Secretary)
   * @param {Object} data - { month: 'YYYY-MM', amount: number, due_date: 'YYYY-MM-DD', user_id?: number, flat_no?: string, block_no?: string }
   */
  createDue: async (data) => {
    return post('/api/dues', data)
  },

  /**
   * Mark due as paid (Committee or Secretary)
   * @param {number} dueId
   */
  markPaid: async (dueId) => {
    return patch(`/api/dues/${dueId}/mark-paid`)
  },

  /**
   * Mark due as unpaid (Committee or Secretary)
   * @param {number} dueId
   */
  markUnpaid: async (dueId) => {
    return patch(`/api/dues/${dueId}/mark-unpaid`)
  },

  /**
   * Delete due record (Committee or Secretary)
   * @param {number} dueId
   */
  deleteDue: async (dueId) => {
    return del(`/api/dues/${dueId}`)
  },
}
