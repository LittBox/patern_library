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
    if (!body.pattern) {
      return json(400, { success: false, message: '缺少 pattern 数据' })
    }

    return json(200, {
      success: true,
      pattern: {
        ...body.pattern,
        updatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    return json(500, { success: false, message: error.message })
  }
}
