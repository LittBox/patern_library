const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

async function uploadBlob(name, contentType, base64) {
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/blobs?name=${encodeURIComponent(name)}`, {
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

  return response.json().catch(() => ({}))
}

export async function handler(event) {
  try {
    const { fileName, contentType, base64 } = JSON.parse(event.body || '{}')
    if (!fileName || !contentType || !base64) {
      return json(400, { success: false, message: 'fileName、contentType、base64 不能为空' })
    }

    if (!NETLIFY_TOKEN || !SITE_ID) {
      return json(200, {
        success: true,
        fallback: true,
        fileName,
        contentType,
        base64,
        imageUrl: `data:${contentType};base64,${base64}`
      })
    }

    const blob = await uploadBlob(fileName, contentType, base64)
    return json(200, {
      success: true,
      blob,
      imageUrl: blob?.url || blob?.public_url || ''
    })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
