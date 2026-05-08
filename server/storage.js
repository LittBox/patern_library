import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const DATA_DIR = path.join(ROOT, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const STORE_FILE = path.join(DATA_DIR, 'server-store.json')

const DEFAULT_STORE = {
  patterns: [],
  products: [],
  creator: {
    id: 'creator_001',
    name: '默认创作者',
    avatar: '',
    bio: '专注民族纹案与文创设计',
    joinedAt: '2026-03-28T12:00:00.000Z'
  }
}

function sanitizeFileName(fileName = 'image.png') {
  const cleaned = String(fileName)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'image.png'
}

function inferExtension(contentType = '', fallback = 'png') {
  if (contentType.includes('svg')) return 'svg'
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('png')) return 'png'

  const ext = String(fallback || '').replace(/^\./, '')
  return ext || 'png'
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

export async function readStore() {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      creator: parsed.creator || DEFAULT_STORE.creator
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { ...DEFAULT_STORE }
    }
    throw error
  }
}

export async function writeStore(next) {
  await ensureDirs()
  const payload = JSON.stringify(next, null, 2)
  await fs.writeFile(STORE_FILE, payload, 'utf8')
  return next
}

export async function updateStore(updater) {
  const current = await readStore()
  const updated = await updater({ ...current })
  return writeStore(updated)
}

export async function saveImageFile({ fileName, contentType, base64, prefix = 'upload' }) {
  if (!base64) {
    throw new Error('base64 不能为空')
  }

  await ensureDirs()

  const safeName = sanitizeFileName(fileName)
  const ext = inferExtension(contentType, path.extname(safeName))
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const finalName = `${prefix}-${stamp}-${safeName.replace(/\.[^.]+$/, '')}.${ext}`
  const filePath = path.join(UPLOAD_DIR, finalName)

  const buffer = Buffer.from(base64, 'base64')
  await fs.writeFile(filePath, buffer)

  return {
    key: finalName,
    url: `/uploads/${finalName}`
  }
}

export async function deleteImageFile(key) {
  if (!key) return false

  const filePath = path.join(UPLOAD_DIR, key)
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export function getUploadDir() {
  return UPLOAD_DIR
}
