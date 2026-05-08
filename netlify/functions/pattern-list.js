function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

export async function handler() {
  return json(200, {
    success: true,
    patterns: [],
    products: [],
    creator: {
      id: 'creator_001',
      name: '默认创作者',
      avatar: '',
      bio: '专注民族纹案与文创设计',
      joinedAt: '2026-03-28T12:00:00.000Z'
    }
  })
}
