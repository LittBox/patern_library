import { saveImageFile } from './storage.js'

export async function uploadPatternImage({ fileName, contentType, base64 }) {
  if (!fileName || !contentType || !base64) {
    throw new Error('fileName、contentType、base64 不能为空')
  }

  const saved = await saveImageFile({
    fileName,
    contentType,
    base64,
    prefix: 'upload'
  })

  return {
    imageUrl: saved.url,
    imageBlobKey: saved.key,
    fallback: false,
    model: 'local-upload'
  }
}
