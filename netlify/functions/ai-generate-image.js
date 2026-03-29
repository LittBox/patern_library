const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID

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

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const prompt = body.prompt || '民族纹案，对称构图，纹样层叠'

    if (!OPENAI_API_KEY) {
      const fallbackBase64 = makeFallbackSvg(prompt)
      return json(200, {
        success: true,
        imageBase64: fallbackBase64,
        mimeType: 'image/svg+xml',
        model: 'fallback-svg'
      })
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1.5',
        prompt,
        size: '1024x1024'
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI 图片生成失败: ${response.status} ${text}`)
    }

    const payload = await response.json()
    const imageBase64 = payload?.data?.[0]?.b64_json
    if (!imageBase64) {
      throw new Error('OpenAI 未返回图片内容')
    }

    let imageUrl = ''
    if (NETLIFY_TOKEN && SITE_ID) {
      const fileName = `pattern-${Date.now()}.png`
      const blob = await uploadBlob(fileName, 'image/png', imageBase64)
      imageUrl = blob?.url || blob?.public_url || ''
    }

    return json(200, {
      success: true,
      imageBase64,
      mimeType: 'image/png',
      imageUrl,
      model: 'gpt-image-1.5'
    })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
