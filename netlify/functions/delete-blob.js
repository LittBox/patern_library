import { canUseBlobStore, deleteImageBlob } from './blob-store.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const key = body.key || ''

    if (!key) {
      return json(400, { success: false, message: '缺少 Blob key' })
    }

    if (!canUseBlobStore()) {
      return json(200, { success: true, fallback: true, deleted: false })
    }

    await deleteImageBlob(key)
    return json(200, { success: true, deleted: true, key })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
