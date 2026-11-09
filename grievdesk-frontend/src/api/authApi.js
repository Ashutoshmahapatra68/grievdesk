import { apiClient } from './apiClient'

export const authApi = {
  /**
   * Log in user
   * @param {Object} credentials - { gmail, password }
   */
  login: async (credentials) => {
    return apiClient('/api/auth/login', {
      method: 'POST',
      body: credentials,
      auth: false,
    })
  },

  /**
   * Register new user
   * @param {Object} userData - { role, name, phone, flat_no, block_no, gmail, preferred_language, password }
   */
  register: async (userData) => {
    return apiClient('/api/auth/register', {
      method: 'POST',
      body: userData,
      auth: false,
    })
  },
}
