import { get, post, postForm } from './apiClient'

export const chatApi = {
  /**
   * Send message or voice note to AI Assistant
   * @param {Object} options
   * @param {'complaint'|'service'|'rules'|'committee_action'} options.selected_type
   * @param {string} [options.text]
   * @param {File|Blob} [options.audio]
   * @param {string} [options.session_id]
   * @param {boolean} [options.anonymous]
   * @param {'announcement'|'dues_reminder'} [options.action]
   * @param {boolean} [options.pin]
   * @param {string} [options.flat_no]
   * @param {string} [options.block_no]
   */
  sendMessage: async ({
    selected_type,
    text,
    audio,
    session_id,
    anonymous,
    action,
    pin,
    flat_no,
    block_no,
    preview,
    tone,
    title,
    message,
  }) => {
    if (audio) {
      const formData = new FormData()
      formData.append('selected_type', selected_type)
      if (session_id) formData.append('session_id', session_id)
      formData.append('audio', audio, audio.name || 'recording.webm')
      if (anonymous !== undefined) formData.append('anonymous', anonymous ? 'true' : 'false')
      if (action) formData.append('action', action)
      if (pin !== undefined) formData.append('pin', pin ? 'true' : 'false')
      if (flat_no) formData.append('flat_no', flat_no)
      if (block_no) formData.append('block_no', block_no)
      if (preview !== undefined) formData.append('preview', preview ? 'true' : 'false')
      if (tone) formData.append('tone', tone)
      if (title) formData.append('title', title)
      if (message) formData.append('message', message)

      return postForm('/api/chat/message', formData)
    }

    const payload = {
      selected_type,
      text: (text || '').trim(),
      session_id,
    }
    if (anonymous !== undefined) payload.anonymous = !!anonymous
    if (action) payload.action = action
    if (pin !== undefined) payload.pin = !!pin
    if (flat_no) payload.flat_no = flat_no
    if (block_no) payload.block_no = block_no
    if (preview !== undefined) payload.preview = !!preview
    if (tone) payload.tone = tone
    if (title) payload.title = title
    if (message) payload.message = message

    return post('/api/chat/message', payload)
  },

  /**
   * List recent chat conversation threads
   */
  getRecents: async () => {
    return get('/api/chat/recents')
  },

  /**
   * Get specific chat thread messages by session_id
   * @param {string} sessionId
   */
  getRecentThread: async (sessionId) => {
    return get(`/api/chat/recents/${sessionId}`)
  },
}
