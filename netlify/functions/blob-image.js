import { getImageBlobRedirectUrl } from './blob-store.js'

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
}

async function serveBlobImage(key) {
  if (!key) {
    return json({ success: false, message: 'key 不能为空' }, 400)
  }

  try {
    const redirectUrl = await getImageBlobRedirectUrl(key)
    if (!redirectUrl) {
      return json({ success: false, message: '图片不存在或已被删除' }, 404)
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    return json({ success: false, message: error.message }, 500)
  }
}

export default async function blobImage(request) {
  const url = new URL(request.url)
  return serveBlobImage(url.searchParams.get('key') || '')
}

export async function handler(event) {
  const response = await serveBlobImage(event.queryStringParameters?.key || '')
  const headers = Object.fromEntries(response.headers.entries())
  const contentType = headers['content-type'] || ''
  const arrayBuffer = await response.arrayBuffer()
  const isBinary = !contentType.startsWith('application/json')

  return {
    statusCode: response.status,
    headers,
    isBase64Encoded: isBinary,
    body: isBinary
      ? Buffer.from(arrayBuffer).toString('base64')
      : Buffer.from(arrayBuffer).toString('utf8')
  }
}
