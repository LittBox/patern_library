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

  const rawText = await response.text()
  let payload = {}
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    payload = rawText ? { message: rawText } : {}
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `${path} 请求失败`)
  }
  return payload
}

function buildImageFallback(prompt = '非遗剪纸纹样', reason = '') {
  const safeText = String(prompt || '非遗剪纸纹样').slice(0, 24)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f7efe1" />
          <stop offset="100%" stop-color="#d6b17f" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="56" fill="url(#bg)" />
      <circle cx="512" cy="512" r="256" fill="none" stroke="#6d4424" stroke-width="24" stroke-dasharray="28 18" />
      <circle cx="512" cy="512" r="168" fill="none" stroke="#9d6b3a" stroke-width="18" />
      <path d="M220 620 Q512 260 804 620" fill="none" stroke="#b56d3d" stroke-width="22" stroke-linecap="round"/>
      <path d="M220 404 Q512 764 804 404" fill="none" stroke="#8f5730" stroke-width="18" stroke-linecap="round"/>
      <text x="50%" y="860" text-anchor="middle" fill="#4f2f18" font-size="42" font-family="sans-serif">${safeText}</text>
    </svg>
  `

  return {
    success: true,
    imageBase64: btoa(unescape(encodeURIComponent(svg))),
    mimeType: 'image/svg+xml',
    imageUrl: '',
    model: 'fallback-svg',
    fallback: true,
    message: reason || '当前未连通本地函数服务，已返回本地占位图用于页面联调。'
  }
}

function buildMetaFallback(fields) {
  const parts = [
    fields.theme || '非遗剪纸纹样',
    fields.ethnicStyle || '传统剪纸风格',
    fields.palette || '层次分明的综合色彩',
    fields.composition || '对称装饰构图',
    fields.usage || '适用于文创包装与展陈'
  ].filter(Boolean)

  const title = [fields.ethnicStyle, fields.theme].filter(Boolean).join(' ') || 'AI 纹案作品'
  const description = `围绕${fields.theme || '非遗剪纸文化'}构建纹样主体，融入${fields.ethnicStyle || '传统剪纸'}的装饰语言，并结合${fields.usage || '文创展示'}场景优化构图。`
  const explanation = `纹样以${fields.theme || '非遗剪纸纹样'}为核心意象，通过${fields.palette || '综合色彩'}强化视觉节奏，适合用于${fields.usage || '文创设计'}。`.slice(0, 100)

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
    let payload
    try {
      payload = await request('ai-generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      })
    } catch (error) {
      return buildImageFallback(prompt, `图片服务暂不可用，已切换为占位图。原因：${error.message || '未知错误'}`)
    }

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
