import { getStore } from '@netlify/blobs'

const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID
const IMAGE_STORE_NAME = 'pattern-images'
const NETLIFY_API_BASE_URL = 'https://api.netlify.com'
const SIGNED_URL_ACCEPT_HEADER = 'application/json;type=signed-url'

function createStore() {
  if (NETLIFY_TOKEN && SITE_ID) {
    return getStore({
      name: IMAGE_STORE_NAME,
      siteID: SITE_ID,
      token: NETLIFY_TOKEN
    })
  }

  return getStore(IMAGE_STORE_NAME)
}

function sanitizeFileName(fileName = 'image.png') {
  return String(fileName)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image.png'
}

function inferExtension(contentType = '') {
  if (contentType.includes('svg')) return 'svg'
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'png'
}

function makeBlobKey(prefix, fileName, contentType) {
  const safeFileName = sanitizeFileName(fileName)
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(safeFileName)
  const finalFileName = hasExtension ? safeFileName : `${safeFileName}.${inferExtension(contentType)}`
  return `${prefix}/${Date.now()}-${finalFileName}`
}

function buildBlobImageUrl(key) {
  return `/.netlify/functions/blob-image?key=${encodeURIComponent(key)}`
}

function buildStoreApiPath(key = '') {
  const encodedKey = String(key)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')

  return `${NETLIFY_API_BASE_URL}/api/v1/blobs/${SITE_ID}/site:${IMAGE_STORE_NAME}/${encodedKey}`
}

function normalizeBlobError(error) {
  const message = error?.message || '未知错误'
  return `Netlify Blob 上传失败: ${message}`
}

export function canUseBlobStore() {
  return Boolean(NETLIFY_TOKEN && SITE_ID)
}

export async function saveImageBlob({ prefix = 'uploads', fileName, contentType, base64 }) {
  const key = makeBlobKey(prefix, fileName, contentType)
  const store = createStore()

  try {
    await store.set(key, Buffer.from(base64, 'base64'), {
      metadata: {
        contentType,
        fileName: sanitizeFileName(fileName)
      }
    })
  } catch (error) {
    throw new Error(normalizeBlobError(error))
  }

  return {
    key,
    url: buildBlobImageUrl(key)
  }
}

export async function readImageBlob(key) {
  const store = createStore()

  try {
    const blob = await store.getWithMetadata(key, { type: 'arrayBuffer' })
    if (!blob) return null

    return {
      data: blob.data,
      metadata: blob.metadata || {},
      etag: blob.etag || ''
    }
  } catch (error) {
    throw new Error(`Netlify Blob 读取失败: ${error?.message || '未知错误'}`)
  }
}

export async function getImageBlobRedirectUrl(key) {
  if (!NETLIFY_TOKEN || !SITE_ID) {
    throw new Error('Netlify Blob 环境变量未配置完整')
  }

  const response = await fetch(buildStoreApiPath(key), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
      Accept: SIGNED_URL_ACCEPT_HEADER
    }
  })

  if (response.status === 404) {
    return ''
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Netlify Blob 读取失败: ${response.status} ${text}`.trim())
  }

  const payload = await response.json()
  return payload?.url || ''
}

export async function deleteImageBlob(key) {
  const store = createStore()

  try {
    await store.delete(key)
  } catch (error) {
    throw new Error(`Netlify Blob 删除失败: ${error?.message || '未知错误'}`)
  }
}
