import { connectLambda, getStore } from '@netlify/blobs'
import { createHash, randomUUID } from 'node:crypto'

const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const SITE_ID = process.env.NETLIFY_SITE_ID
const STORE_NAME = 'ai-image-runtime'
const ACTIVE_TASK_TTL_MS = 1000 * 60 * 8
const COMPLETED_CACHE_TTL_MS = 1000 * 60 * 30

function createStore(event) {
  if (NETLIFY_TOKEN && SITE_ID) {
    return getStore({
      name: STORE_NAME,
      siteID: SITE_ID,
      token: NETLIFY_TOKEN
    })
  }

  if (event) {
    connectLambda(event)
  }

  return getStore(STORE_NAME)
}

function taskKey(taskId) {
  return `tasks/${taskId}.json`
}

function cacheKey(cacheId) {
  return `cache/${cacheId}.json`
}

function now() {
  return new Date().toISOString()
}

function normalizeText(value = '') {
  return String(value).trim().replace(/\s+/g, ' ')
}

export function buildImageCacheKey({ prompt, size, negativePrompt }) {
  const payload = JSON.stringify({
    prompt: normalizeText(prompt),
    size: String(size || '').trim(),
    negativePrompt: normalizeText(negativePrompt)
  })

  return createHash('sha256').update(payload).digest('hex')
}

export function createImageTaskRecord({ prompt, size, negativePrompt, cacheKey: relatedCacheKey }) {
  const createdAt = now()

  return {
    id: `imgtask_${Date.now()}_${randomUUID().slice(0, 8)}`,
    cacheKey: relatedCacheKey,
    prompt: normalizeText(prompt),
    size: String(size || '').trim(),
    negativePrompt: normalizeText(negativePrompt),
    status: 'queued',
    imageUrl: '',
    imageBase64: '',
    sourceUrl: '',
    mimeType: '',
    model: '',
    fallback: false,
    message: '',
    requestId: '',
    createdAt,
    updatedAt: createdAt
  }
}

export async function readImageTask(event, taskId) {
  if (!taskId) return null
  return createStore(event).get(taskKey(taskId), { type: 'json' })
}

export async function writeImageTask(event, task) {
  const store = createStore(event)
  const record = {
    ...task,
    updatedAt: task.updatedAt || now()
  }

  await store.setJSON(taskKey(record.id), record)
  return record
}

export async function patchImageTask(event, taskId, patch) {
  const current = await readImageTask(event, taskId)
  if (!current) return null

  const next = {
    ...current,
    ...patch,
    updatedAt: now()
  }

  await writeImageTask(event, next)
  return next
}

export async function readImageCache(event, relatedCacheKey) {
  if (!relatedCacheKey) return null
  return createStore(event).get(cacheKey(relatedCacheKey), { type: 'json' })
}

export async function writeImageCache(event, relatedCacheKey, record) {
  if (!relatedCacheKey) return null
  const next = {
    ...record,
    cacheKey: relatedCacheKey,
    updatedAt: record.updatedAt || now()
  }

  await createStore(event).setJSON(cacheKey(relatedCacheKey), next)
  return next
}

export function buildActiveCacheRecord(task) {
  return {
    taskId: task.id,
    status: task.status,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt
  }
}

export function buildCompletedCacheRecord(task) {
  return {
    taskId: task.id,
    status: 'completed',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    expiresAt: new Date(Date.now() + COMPLETED_CACHE_TTL_MS).toISOString(),
    imageUrl: task.imageUrl || '',
    imageBase64: task.imageBase64 || '',
    sourceUrl: task.sourceUrl || '',
    mimeType: task.mimeType || '',
    model: task.model || '',
    fallback: Boolean(task.fallback),
    message: task.message || '',
    requestId: task.requestId || ''
  }
}

export function buildFailedCacheRecord(task) {
  return {
    taskId: task.id,
    status: 'failed',
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    message: task.message || ''
  }
}

export function isReusableImageCache(record) {
  if (!record || !record.taskId) return false

  if (record.status === 'completed') {
    return Boolean(record.expiresAt) && Date.parse(record.expiresAt) > Date.now()
  }

  if (record.status === 'queued' || record.status === 'processing') {
    const updatedAt = Date.parse(record.updatedAt || record.createdAt || '')
    return Number.isFinite(updatedAt) && updatedAt + ACTIVE_TASK_TTL_MS > Date.now()
  }

  return false
}

export function toClientImageTask(task, extras = {}) {
  return {
    success: true,
    taskId: task?.id || extras.taskId || '',
    status: task?.status || extras.status || 'queued',
    cached: Boolean(extras.cached),
    imageUrl: task?.imageUrl || '',
    imageBase64: task?.imageBase64 || '',
    sourceUrl: task?.sourceUrl || '',
    mimeType: task?.mimeType || '',
    model: task?.model || '',
    fallback: Boolean(task?.fallback),
    message: task?.message || '',
    requestId: task?.requestId || '',
    size: task?.size || extras.size || '',
    negativePrompt: task?.negativePrompt || extras.negativePrompt || ''
  }
}
