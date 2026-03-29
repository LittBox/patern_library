const STORAGE_KEY = 'pattern-library-state-v2'

export const state = {
  patterns: [],
  products: [],
  creator: null,
  aiDraft: null
}

function now() {
  return new Date().toISOString()
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createCreator() {
  return {
    id: 'creator_001',
    name: '默认创作者',
    avatar: '',
    bio: '专注非遗剪纸纹样与文创设计，将传统图样转译为更适合数字传播与商品化的视觉作品。',
    joinedAt: '2026-03-28T12:00:00.000Z'
  }
}

export function createPatternRecord(input) {
  const createdAt = input.createdAt || now()
  return {
    id: input.id || randomId('pt'),
    title: input.title || '未命名纹案',
    description: input.description || '',
    explanation: input.explanation || '',
    imageUrl: input.imageUrl || '',
    sourceType: input.sourceType || 'upload',
    prompt: input.prompt || '',
    tags: Array.isArray(input.tags) ? input.tags : [],
    price: typeof input.price === 'number' ? input.price : null,
    onShelf: Boolean(input.onShelf),
    creatorId: input.creatorId || 'creator_001',
    createdAt,
    updatedAt: input.updatedAt || createdAt,
    imageModel: input.imageModel || '',
    textModel: input.textModel || ''
  }
}

export function createProductFromPattern(pattern, price) {
  return {
    id: randomId('prod'),
    patternId: pattern.id,
    title: pattern.title,
    price,
    imageUrl: pattern.imageUrl,
    status: 'on_shelf',
    createdAt: now(),
    updatedAt: now()
  }
}

export function createSeedPatterns(placeholder) {
  return [
    createPatternRecord({
      id: 'pt_seed_1',
      title: '锦绣回纹',
      description: '以民族回纹为灵感设计的装饰纹案，适合包装、海报与织物应用。',
      explanation: '回旋结构象征延续与团圆，视觉上兼具节奏感与庄重感。',
      imageUrl: '/img/patterns/lanbai.jpg',
      sourceType: 'upload',
      prompt: '民族回纹、红金配色、对称构图、层叠装饰感',
      tags: ['回纹', '红金', '对称'],
      onShelf: true,
      price: 129,
      imageModel: 'gpt-image-1.5',
      textModel: 'deepseek-chat',
      createdAt: '2026-03-28T08:00:00.000Z'
    }),
    createPatternRecord({
      id: 'pt_seed_2',
      title: '苗岭蝶影',
      description: '融合蝴蝶母题与苗绣节奏线条的系列纹案，适合文创衍生。',
      explanation: '蝴蝶元素象征生命与迁徙，常用于富有故事感的民族图样中。',
      imageUrl: placeholder(720, 900, '苗岭蝶影'),
      sourceType: 'ai',
      prompt: '苗族风格、蓝白配色、蝴蝶图腾、刺绣质感、细节丰富',
      tags: ['苗族', '蝴蝶', '刺绣'],
      imageModel: 'gpt-image-1.5',
      textModel: 'deepseek-chat',
      createdAt: '2026-03-27T09:20:00.000Z'
    }),
    createPatternRecord({
      id: 'pt_seed_3',
      title: '蓝白云锦',
      description: '自主整理的蓝白几何纹样，可用于边框、背景与文创包装。',
      explanation: '蓝白色系更易用于现代场景，同时保留传统织锦的层叠秩序。',
      imageUrl: placeholder(720, 900, '蓝白云锦'),
      sourceType: 'upload',
      prompt: '',
      tags: ['自主上传', '蓝白', '几何'],
      createdAt: '2026-03-26T11:10:00.000Z'
    })
  ]
}

export function loadAppState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return state
    const parsed = JSON.parse(raw)
    state.patterns = Array.isArray(parsed.patterns) ? parsed.patterns : []
    state.products = Array.isArray(parsed.products) ? parsed.products : []
    state.creator = parsed.creator || createCreator()
    state.aiDraft = parsed.aiDraft || null
  } catch (error) {
    console.warn('读取本地状态失败，使用默认状态。', error)
  }
  return state
}

export function saveAppState() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      patterns: state.patterns,
      products: state.products,
      creator: state.creator,
      aiDraft: state.aiDraft
    })
  )
}

export function filterPatterns(patterns, { searchTerm = '', sourceType = '' } = {}) {
  const lowered = searchTerm.trim().toLowerCase()
  return patterns.filter((pattern) => {
    const sourceMatches = !sourceType || pattern.sourceType === sourceType
    if (!sourceMatches) return false
    if (!lowered) return true
    return [
      pattern.title,
      pattern.description,
      pattern.explanation,
      pattern.prompt,
      ...(pattern.tags || [])
    ].some((value) => String(value || '').toLowerCase().includes(lowered))
  })
}

export function deriveCreatorMetrics(patterns, products) {
  const aiPatterns = patterns.filter((pattern) => pattern.sourceType === 'ai').length
  const uploadPatterns = patterns.filter((pattern) => pattern.sourceType === 'upload').length
  const noDescriptionPatterns = patterns.filter((pattern) => !pattern.description?.trim()).length
  const notOnShelfPatterns = patterns.filter((pattern) => !pattern.onShelf).length
  const zeroPriceProducts = products.filter((product) => !product.price).length
  const monthlyNewPatterns = patterns.filter((pattern) => isThisMonth(pattern.createdAt)).length

  return {
    totalPatterns: patterns.length,
    aiPatterns,
    uploadPatterns,
    onShelfProducts: products.length,
    notOnShelfPatterns,
    noDescriptionPatterns,
    zeroPriceProducts,
    monthlyNewPatterns
  }
}

function isThisMonth(input) {
  const date = new Date(input)
  const nowDate = new Date()
  return date.getFullYear() === nowDate.getFullYear() && date.getMonth() === nowDate.getMonth()
}

export function getRecentPatterns(patterns, limit = 3) {
  return [...patterns]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}
