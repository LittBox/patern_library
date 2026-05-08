import { normalizeImageRequest, requestQwenPreview } from './ai-image-service.js'
import {
  buildCompletedCacheRecord,
  buildFailedCacheRecord,
  patchImageTask,
  readImageTask,
  writeImageCache
} from './ai-image-store.js'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

async function runImageTask(event, taskId) {
  const task = await readImageTask(event, taskId)
  if (!task) {
    return json(404, { success: false, message: '任务不存在' })
  }

  if (task.status === 'completed') {
    return json(200, { success: true, taskId, status: 'completed' })
  }

  const processingTask = await patchImageTask(event, taskId, { status: 'processing', message: '' })
  if (!processingTask) {
    return json(404, { success: false, message: '任务不存在' })
  }

  try {
    const request = normalizeImageRequest(processingTask)
    const result = await requestQwenPreview(request)
    const completedTask = await patchImageTask(event, taskId, {
      status: 'completed',
      imageUrl: result.imageUrl || '',
      imageBase64: result.imageBase64 || '',
      sourceUrl: result.sourceUrl || result.imageUrl || '',
      mimeType: result.mimeType || '',
      model: result.model || '',
      fallback: Boolean(result.fallback),
      message: result.message || '',
      requestId: result.requestId || ''
    })

    if (completedTask?.cacheKey) {
      await writeImageCache(event, completedTask.cacheKey, buildCompletedCacheRecord(completedTask))
    }

    return json(200, { success: true, taskId, status: 'completed' })
  } catch (error) {
    const failedTask = await patchImageTask(event, taskId, {
      status: 'failed',
      message: error.message || '图片生成失败'
    })

    if (failedTask?.cacheKey) {
      await writeImageCache(event, failedTask.cacheKey, buildFailedCacheRecord(failedTask))
    }

    return json(500, { success: false, message: failedTask?.message || error.message })
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')
    const taskId = body.taskId || ''
    if (!taskId) {
      return json(400, { success: false, message: '缺少 taskId' })
    }

    return await runImageTask(event, taskId)
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
