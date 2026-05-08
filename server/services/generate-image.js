import { saveBase64Image } from './upload.js'

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY
const DASHSCOPE_BASE_URL = (
  process.env.DASHSCOPE_BASE_URL ||
  process.env.QWEN_BASE_URL ||
  'https://dashscope.aliyuncs.com'
).replace(/\/$/, '')

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

function makeFallbackSvg(prompt = '民族纹案') {
  const safePrompt = String(prompt).slice(0, 24)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" rx="56" fill="#f7efe1"/>
      <circle cx="512" cy="512" r="256" fill="none" stroke="#6d4424" stroke-width="24" stroke-dasharray="28 18"/>
      <circle cx="512" cy="512" r="168" fill="none" stroke="#9d6b3a" stroke-width="18"/>
      <path d="M220 620 Q512 260 804 620" fill="none" stroke="#b56d3d" stroke-width="22" stroke-linecap="round"/>
      <text x="50%" y="860" text-anchor="middle" fill="#4f2f18" font-size="42" font-family="sans-serif">${safePrompt}</text>
    </svg>
  `
  return Buffer.from(svg).toString('base64')
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

export async function generateImage(body = {}) {
  const prompt = body.prompt || '民族纹案，对称构图，纹样层叠'
  const size = body.size || '1024*1024'
  const negativePrompt = body.negativePrompt || DEFAULT_NEGATIVE_PROMPT

  if (!DASHSCOPE_API_KEY) {
    const fallbackBase64 = makeFallbackSvg(prompt)
    const saved = await saveBase64Image({
      prefix: 'ai',
      fileName: 'fallback.svg',
      contentType: 'image/svg+xml',
      base64: fallbackBase64
    })

    return {
      imageBase64: '',
      mimeType: 'image/svg+xml',
      imageUrl: saved.imageUrl,
      imageBlobKey: saved.imageBlobKey,
      model: 'fallback-svg',
      fallback: true,
      message: '未配置 DASHSCOPE_API_KEY，已返回本地 SVG 占位图。'
    }
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
  const saved = await saveBase64Image({
    prefix: 'ai',
    fileName: 'pattern.png',
    contentType: downloaded.contentType,
    base64: downloaded.base64
  })

  return {
    imageBase64: '',
    mimeType: downloaded.contentType,
    imageUrl: saved.imageUrl,
    imageBlobKey: saved.imageBlobKey,
    sourceUrl: imageUrl,
    model: QWEN_IMAGE_MODEL,
    requestId: payload?.request_id || ''
  }
}