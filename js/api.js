import { createCreator, createPatternRecord } from './state.js'

const BASE = '/.netlify/functions'

async function request(path, options = {}) {
  const response = await fetch(`${BASE}/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `${path} 请求失败`)
  }
  return payload
}

function buildMetaFallback(fields) {
  const parts = [
    fields.theme || '民族纹案',
    fields.ethnicStyle || '传统民族风格',
    fields.palette || '层次分明的综合色彩',
    fields.composition || '对称装饰构图',
    fields.usage || '适用于文创包装与展陈'
  ].filter(Boolean)

  const title = [fields.ethnicStyle, fields.theme].filter(Boolean).join(' ') || 'AI 纹案作品'
  const description = `围绕${fields.theme || '民族文化'}构建纹案主体，融入${fields.ethnicStyle || '民族传统'}的装饰语言，并结合${fields.usage || '文创展示'}场景优化构图。`
  const explanation = `纹案以${fields.theme || '民族纹样'}为核心意象，通过${fields.palette || '综合色彩'}强化视觉节奏，适合用于${fields.usage || '文创设计'}。`.slice(0, 100)

  return {
    title,
    description,
    image_prompt: parts.join('，'),
    explanation,
    tags: [fields.theme, fields.ethnicStyle, fields.palette].filter(Boolean),
    textModel: 'deepseek-chat'
  }
}

const api = {
  async getPatterns() {
    try {
      return await request('pattern-list')
    } catch (error) {
      return {
        success: true,
        patterns: [],
        products: [],
        creator: createCreator()
      }
    }
  },

  async uploadPatternImage({ fileName, contentType, base64 }) {
    const payload = await request('pattern-upload', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType, base64 })
    })

    if (payload.imageUrl) {
      return payload
    }

    return {
      ...payload,
      imageUrl: payload.base64 ? `data:${payload.contentType};base64,${payload.base64}` : ''
    }
  },

  async generatePatternMeta(fields) {
    try {
      const payload = await request('ai-generate-meta', {
        method: 'POST',
        body: JSON.stringify(fields)
      })
      return payload.data
    } catch (error) {
      return buildMetaFallback(fields)
    }
  },

  async generatePatternImage(prompt) {
    const payload = await request('ai-generate-image', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    })

    if (payload.imageUrl || payload.imageBase64) return payload

    throw new Error('图片接口未返回可用图片数据')
  },

  async savePattern(pattern) {
    try {
      return await request('ai-save-pattern', {
        method: 'POST',
        body: JSON.stringify({ pattern })
      })
    } catch (error) {
      return {
        success: true,
        pattern: createPatternRecord(pattern)
      }
    }
  }
}

export default api
