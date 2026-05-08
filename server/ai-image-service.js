const QWEN_IMAGE_MODEL = 'qwen-image-2.0'
const DEFAULT_NEGATIVE_PROMPT = [
  '低清晰度',
  '模糊',
  '文字乱码',
  '比例失衡',
  '肢体畸形',
  '过度光滑',
  '画面杂乱',
  '边缘重复',
  '明显AI伪影'
].join('，')

function resolveDashscopeConfig() {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || ''
  const baseUrl = (
    process.env.DASHSCOPE_BASE_URL ||
    process.env.QWEN_BASE_URL ||
    'https://dashscope.aliyuncs.com'
  ).replace(/\/$/, '')

  return { apiKey, baseUrl }
}

function makeFallbackSvg(prompt = '民族纹案') {
  const safePrompt = String(prompt).slice(0, 24)
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
      <text x="50%" y="860" text-anchor="middle" fill="#4f2f18" font-size="42" font-family="sans-serif">${safePrompt}</text>
    </svg>
  `
  return Buffer.from(svg).toString('base64')
}

async function downloadImageAsBase64(url) {
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Qwen 图片下载失败: ${response.status} ${text}`.trim())
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const arrayBuffer = await response.arrayBuffer()
  return {
    base64: Buffer.from(arrayBuffer).toString('base64'),
    contentType
  }
}

export function normalizeImageRequest(input = {}) {
  return {
    prompt: String(input.prompt || '民族纹案，对称构图，纹样层叠').trim(),
    size: String(input.size || '1024*1024').trim() || '1024*1024',
    negativePrompt: String(input.negativePrompt || DEFAULT_NEGATIVE_PROMPT).trim() || DEFAULT_NEGATIVE_PROMPT
  }
}

export async function requestQwenImage({ prompt, size, negativePrompt }) {
  const { apiKey, baseUrl } = resolveDashscopeConfig()
  if (!apiKey) {
    return {
      imageBase64: makeFallbackSvg(prompt),
      mimeType: 'image/svg+xml',
      imageUrl: '',
      sourceUrl: '',
      model: 'fallback-svg',
      fallback: true,
      message: '未配置 DASHSCOPE_API_KEY，已返回本地 SVG 占位图。',
      requestId: ''
    }
  }

  const response = await fetch(`${baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: QWEN_IMAGE_MODEL,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }]
          }
        ]
      },
      parameters: {
        size,
        watermark: false,
        prompt_extend: true,
        negative_prompt: negativePrompt
      }
    })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Qwen 图片生成失败: ${response.status} ${text}`.trim())
  }

  const payload = await response.json()
  const imageUrl = payload?.output?.choices?.[0]?.message?.content?.find((item) => item?.image)?.image || ''
  if (!imageUrl) {
    throw new Error(payload?.message || 'Qwen 未返回图片地址')
  }

  const downloaded = await downloadImageAsBase64(imageUrl)

  return {
    imageBase64: downloaded.base64,
    mimeType: downloaded.contentType || 'image/png',
    imageUrl,
    sourceUrl: imageUrl,
    model: QWEN_IMAGE_MODEL,
    fallback: false,
    message: '',
    requestId: payload?.request_id || ''
  }
}
