const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY
const DASHSCOPE_BASE_URL = (
  process.env.DASHSCOPE_BASE_URL ||
  process.env.QWEN_BASE_URL ||
  'https://dashscope.aliyuncs.com'
).replace(/\/$/, '')
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
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

async function uploadBlob(name, contentType, base64) {
  if (!NETLIFY_TOKEN || !SITE_ID) return null
  const url = `https://api.netlify.com/api/v1/sites/${SITE_ID}/blobs?name=${encodeURIComponent(name)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      'Content-Type': contentType
    },
    body: Buffer.from(base64, 'base64')
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Netlify Blob 上传失败: ${response.status} ${text}`)
  }

  const payload = await response.json().catch(() => ({}))
  return payload
}

async function downloadImageAsBase64(url) {
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Qwen 图片下载失败: ${response.status} ${text}`)
  }

  const contentType = response.headers.get('content-type') || 'image/png'
  const arrayBuffer = await response.arrayBuffer()
  return {
    base64: Buffer.from(arrayBuffer).toString('base64'),
    contentType
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const prompt = body.prompt || '民族纹案，对称构图，纹样层叠'
    const size = body.size || '1024*1024'
    const negativePrompt = body.negativePrompt || DEFAULT_NEGATIVE_PROMPT

    if (!DASHSCOPE_API_KEY) {
      const fallbackBase64 = makeFallbackSvg(prompt)
      return json(200, {
        success: true,
        imageBase64: fallbackBase64,
        mimeType: 'image/svg+xml',
        model: 'fallback-svg',
        fallback: true,
        message: '未配置 DASHSCOPE_API_KEY，已返回本地 SVG 占位图。'
      })
    }

    const response = await fetch(`${DASHSCOPE_BASE_URL}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`
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
      const text = await response.text()
      throw new Error(`Qwen 图片生成失败: ${response.status} ${text}`)
    }

    const payload = await response.json()
    const imageUrl = payload?.output?.choices?.[0]?.message?.content?.find((item) => item?.image)?.image || ''
    if (!imageUrl) {
      throw new Error(payload?.message || 'Qwen 未返回图片地址')
    }

    const downloaded = await downloadImageAsBase64(imageUrl)
    const imageBase64 = downloaded.base64
    const mimeType = downloaded.contentType || 'image/png'
    let persistedImageUrl = ''
    if (NETLIFY_TOKEN && SITE_ID) {
      const extension = mimeType.includes('jpeg') ? 'jpg' : 'png'
      const fileName = `pattern-${Date.now()}.${extension}`
      const blob = await uploadBlob(fileName, mimeType, imageBase64)
      persistedImageUrl = blob?.url || blob?.public_url || ''
    }

    return json(200, {
      success: true,
      imageBase64,
      mimeType,
      imageUrl: persistedImageUrl || imageUrl,
      sourceUrl: imageUrl,
      model: QWEN_IMAGE_MODEL,
      requestId: payload?.request_id || ''
    })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
