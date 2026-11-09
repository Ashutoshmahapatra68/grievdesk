import { get, patch } from './apiClient'

export const complaintApi = {
  /**
   * List complaints with filtering and pagination
   * @param {Object} params - { status?, category?, severity?, block?, limit?, offset? }
   */
  listComplaints: async (params = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.category) query.set('category', params.category)
    if (params.severity) query.set('severity', params.severity)
    if (params.block) query.set('block', params.block)
    if (params.limit !== undefined) query.set('limit', params.limit)
    if (params.offset !== undefined) query.set('offset', params.offset)

    const qs = query.toString()
    return get(`/api/complaints${qs ? `?${qs}` : ''}`)
  },

  /**
   * Get complaint by ID with full details & timeline
   * @param {number} complaintId
   */
  getComplaint: async (complaintId) => {
    return get(`/api/complaints/${complaintId}`)
  },

  /**
   * Update complaint status (Committee or Secretary)
   * @param {number} complaintId
   * @param {Object} data - { status: 'new'|'in_progress'|'resolved'|'escalated', resolution_notes?: string }
   */
  updateStatus: async (complaintId, data) => {
    return patch(`/api/complaints/${complaintId}/status`, data)
  },

  /**
   * Assign complaint to staff member (Committee or Secretary)
   * @param {number} complaintId
   * @param {number|null} assignedTo - user ID of assignee or null to unassign
   */
  assign: async (complaintId, assignedTo) => {
    return patch(`/api/complaints/${complaintId}/assign`, { assigned_to: assignedTo })
  },

  /**
   * Link or unlink complaint as duplicate (Committee or Secretary)
   * @param {number} complaintId
   * @param {number|null} duplicateOf - ID of root complaint or null to unlink
   */
  setDuplicate: async (complaintId, duplicateOf) => {
    return patch(`/api/complaints/${complaintId}/duplicate`, { duplicate_of: duplicateOf })
  },

  /**
   * URL endpoint for streaming recorded audio
   */
  getAudioUrl: (complaintId) => {
    const base = (
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:5000'
    ).replace(/\/$/, '')
    return `${base}/api/complaints/${complaintId}/audio`
  },
}
