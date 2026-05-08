import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads')

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

async function ensureUploadDir(prefix = 'uploads') {
  const dir = path.join(UPLOAD_DIR, prefix)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function saveBase64Image({ prefix = 'uploads', fileName, contentType, base64 }) {
  if (!base64) {
    throw new Error('base64 不能为空')
  }

  const safeName = sanitizeFileName(fileName)
  const hasExt = /\.[a-zA-Z0-9]+$/.test(safeName)
  const finalName = hasExt ? safeName : `${safeName}.${inferExtension(contentType)}`
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${finalName}`

  const dir = await ensureUploadDir(prefix)
  const filePath = path.join(dir, id)

  await fs.writeFile(filePath, Buffer.from(base64, 'base64'))

  const key = `${prefix}/${id}`

  return {
    imageBlobKey: key,
    imageUrl: `/uploads/${key}`
  }
}

export async function uploadPatternImage(body = {}) {
  const { fileName, contentType, base64 } = body

  if (!fileName || !contentType || !base64) {
    throw new Error('fileName、contentType、base64 不能为空')
  }

  const saved = await saveBase64Image({
    prefix: 'uploads',
    fileName,
    contentType,
    base64
  })

  return {
    fileName,
    contentType,
    ...saved
  }
}

export async function deleteUploadedImage(key = '') {
  if (!key) {
    throw new Error('缺少图片 key')
  }

  const safeKey = String(key).replace(/^\/?uploads\//, '')
  const filePath = path.join(UPLOAD_DIR, safeKey)

  await fs.unlink(filePath).catch(() => {})

  return {
    deleted: true,
    key
  }
}