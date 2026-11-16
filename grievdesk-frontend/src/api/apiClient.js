const rawBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '')

// Normalize localhost to 127.0.0.1 to prevent Windows IPv6 (::1) connection dropouts
const normalizedBase = rawBase.replace('://localhost', '://127.0.0.1')
const BASE = normalizedBase || (import.meta.env.DEV ? '' : 'http://127.0.0.1:5000')

const TOKEN_KEY = 'grievdesk_token'

export class ApiError extends Error {
  constructor(status, code, message, data) {
    super(message || 'An error occurred')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

let onUnauthorizedCallback = null
export function setUnauthorizedHandler(fn) {
  onUnauthorizedCallback = fn
}

/**
 * Universal backend API client for GrievDesk Flask Backend.
 * Supports:
 * - JWT Bearer Authorization header
 * - Automatic JSON serialization
 * - Multipart/form-data uploads (without setting Content-Type, allowing browser boundary creation)
 * - Standardized error extraction & response parsing
 * - Automatic logout on 401 Unauthorized / Token Expiration
 */
export async function apiClient(endpoint, {
  method = 'GET',
  body,
  form,
  auth = true,
  signal,
  headers: customHeaders = {},
} = {}) {
  const headers = { ...customHeaders }
  const token = tokenStore.get()

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`
  }

  let payload
  if (form) {
    // Form data upload: DO NOT set Content-Type header so browser adds proper multipart boundary
    payload = form
    delete headers['Content-Type']
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  // Ensure leading slash
  const url = `${BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  let response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(0, 'network', 'Cannot connect to backend server. Please check your connection.', null)
  }

  let data = null
  const responseText = await response.text()
  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { raw: responseText }
    }
  }

  if (!response.ok) {
    const isTokenProblem = auth && data?.msg && !data?.error && (response.status === 401 || response.status === 422)
    const isInactiveAccount = auth && response.status === 401 && data?.error === 'unauthorized'

    if ((isTokenProblem || isInactiveAccount) && onUnauthorizedCallback) {
      onUnauthorizedCallback()
    }

    const errorCode = data?.error || (data?.msg ? 'token_error' : 'http_error')
    const errorMessage = data?.message || data?.msg || data?.detail || `Request failed with status ${response.status}`

    throw new ApiError(response.status, errorCode, errorMessage, data)
  }

  return data
}

export const get = (endpoint, options) => apiClient(endpoint, { ...options, method: 'GET' })
export const post = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'POST', body })
export const put = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'PUT', body })
export const patch = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'PATCH', body })
export const del = (endpoint, options) => apiClient(endpoint, { ...options, method: 'DELETE' })
export const postForm = (endpoint, form, options) => apiClient(endpoint, { ...options, method: 'POST', form })
