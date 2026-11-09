import { post, postForm } from './apiClient'

export const rulesApi = {
  /**
   * Upload society rulebook via file or text content (Committee or Secretary)
   * @param {File|Blob|string} content - File/Blob for multipart, or string for content_text JSON
   */
  uploadRulebook: async (content) => {
    if (content instanceof File || content instanceof Blob) {
      const formData = new FormData()
      formData.append('file', content, content.name || 'rules.txt')
      return postForm('/api/rules/upload', formData)
    }
    return post('/api/rules/upload', { content_text: content })
  },

  /**
   * Ask question to the society rulebook via AI
   * @param {string} question
   */
  askQuestion: async (question) => {
    return post('/api/rules/ask', { text: question })
  },
}
