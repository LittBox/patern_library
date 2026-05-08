const API_BASE = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.success === false) {
    throw new Error(data.message || '请求失败')
  }

  return data
}

const api = {
  async getPatterns() {
    return request('/pattern-list')
  },

  async savePattern(pattern) {
    return request('/pattern', {
      method: 'POST',
      body: JSON.stringify({ pattern })
    })
  },

  async uploadPatternImage(payload) {
    return request('/pattern-upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async deletePatternBlob(key) {
    return request('/delete-blob', {
      method: 'POST',
      body: JSON.stringify({ key })
    })
  },

  async generatePatternMeta(fields) {
    const result = await request('/generate-meta', {
      method: 'POST',
      body: JSON.stringify(fields)
    })

    return result.data
  },

  async generatePatternImage(prompt) {
    return request('/ai-generate-image', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        size: '1024*1024'
      })
    })
  }
}

export default api