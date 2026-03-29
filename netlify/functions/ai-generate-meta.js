const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  }
}

function buildFallback(body = {}) {
  const theme = body.theme || '民族纹案'
  const ethnicStyle = body.ethnicStyle || '民族传统'
  const palette = body.palette || '综合色彩'
  const composition = body.composition || '对称构图'
  const usage = body.usage || '文创展示'
  const extra = body.extra || ''

  return {
    title: `${ethnicStyle}${theme}`.slice(0, 18),
    description: `围绕${theme}构建主体图样，结合${ethnicStyle}的装饰语言，并针对${usage}场景优化层次、节奏与细节表达。`,
    image_prompt: [theme, ethnicStyle, palette, composition, usage, extra].filter(Boolean).join('，'),
    explanation: `纹案通过${palette}强化视觉识别，用${composition}组织元素关系，适合${usage}场景下的民族文化表达。`.slice(0, 100),
    tags: [theme, ethnicStyle, palette].filter(Boolean),
    textModel: 'deepseek-chat'
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}')

    if (!DEEPSEEK_API_KEY) {
      return json(200, { success: true, data: buildFallback(body), fallback: true })
    }

    const prompt = `
你是民族纹案策划助手。请根据输入生成 JSON，不要输出额外说明。
字段要求：
- title: 作品名称，12字以内
- description: 作品简介，60字以内
- image_prompt: 用于图片模型的高质量中文提示词
- explanation: 不超过100字的纹案讲解词
- tags: 3到5个标签数组

输入信息：
${JSON.stringify(body, null, 2)}
    `.trim()

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是擅长民族纹案策划与文案生成的助手。' },
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`DeepSeek 请求失败: ${response.status} ${text}`)
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)
    return json(200, { success: true, data: { ...parsed, textModel: 'deepseek-chat' } })
  } catch (error) {
    return json(200, {
      success: true,
      data: buildFallback(JSON.parse(event.body || '{}')),
      fallback: true,
      message: error.message
    })
  }
}
