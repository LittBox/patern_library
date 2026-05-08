import { normalizeImageRequest, requestQwenImage } from './ai-image-service.js'
import { saveImageFile } from './storage.js'

export async function generateImage(input = {}) {
  const request = normalizeImageRequest(input)
  const result = await requestQwenImage(request)

  if (result.fallback || !result.imageBase64) {
    return result
  }

  try {
    const saved = await saveImageFile({
      fileName: 'ai-pattern.png',
      contentType: result.mimeType || 'image/png',
      base64: result.imageBase64,
      prefix: 'ai'
    })

    return {
      ...result,
      imageUrl: saved.url,
      imageBlobKey: saved.key,
      imageBase64: ''
    }
  } catch (error) {
    return {
      ...result,
      message: result.message || `保存图片失败: ${error.message}`
    }
  }
}
