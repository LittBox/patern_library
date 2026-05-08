import { canUseBlobStore, saveImageBlob } from './blob-store.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

export async function handler(event) {
  try {
    const { fileName, contentType, base64 } = JSON.parse(event.body || '{}')
    if (!fileName || !contentType || !base64) {
      return json(400, { success: false, message: 'fileName、contentType、base64 不能为空' })
    }

    if (!canUseBlobStore()) {
      return json(200, {
        success: true,
        fallback: true,
        fileName,
        contentType,
        base64,
        imageUrl: `data:${contentType};base64,${base64}`
      })
    }

    const blob = await saveImageBlob({
      prefix: 'uploads',
      fileName,
      contentType,
      base64
    })
    return json(200, {
      success: true,
      blob,
      imageBlobKey: blob?.key || '',
      imageUrl: blob?.url || ''
    })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
