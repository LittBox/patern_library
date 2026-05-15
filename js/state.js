const STORAGE_KEY = 'pattern-library-state-v2'
const DEFAULT_CREATORS = [
  {
    id: 'creator_001',
    name: '高庆',
    avatar: '/创作人图片/高庆.jpg',
    bio: '省级非遗传承人，剪纸世家第六代传人，目前已经剪了三四件作品，始终坚持对剪纸的热爱。',
    joinedAt: '2026-05-15T00:00:00.000Z'
  },
  {
    id: 'creator_002',
    name: '李艳丽',
    avatar: '/创作人图片/李艳丽.jpg',
    bio: '滇派剪纸传承人，一分耕耘一分收获，始终坚守在守护剪纸文化的路上。',
    joinedAt: '2026-05-15T00:00:00.000Z'
  },
  {
    id: 'creator_003',
    name: '王天宝',
    avatar: '/创作人图片/王天宝.jpg',
    bio: '区级非遗剪纸项目代表性传承人之一，精通木刻版画，后将雕刻经验逐步融合到剪纸创作中，形成独属于自己的剪纸风格。',
    joinedAt: '2026-05-15T00:00:00.000Z'
  }
]
const CREATORS_VERSION = 2

export const state = {
  patterns: [],
  products: [],
  creator: null,
  creators: [],
  creatorsVersion: CREATORS_VERSION,
  aiDraft: null
}

const DATA_URL_STORAGE_LIMIT = 10_000

function now() {
  return new Date().toISOString()
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createCreator() {
  return { ...DEFAULT_CREATORS[0] }
}

export function createCreators() {
  return DEFAULT_CREATORS.map((creator) => ({ ...creator }))
}

export function createPatternRecord(input) {
  const createdAt = input.createdAt || now()
  return {
    id: input.id || randomId('pt'),
    title: input.title || '未命名纹案',
    description: input.description || '',
    explanation: input.explanation || '',
    imageUrl: input.imageUrl || '',
    imageBlobKey: input.imageBlobKey || '',
    imageStorageKey: input.imageStorageKey || '',
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
    description: pattern.description || '',
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
      imageModel: 'qwen-image-2.0',
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
      imageModel: 'qwen-image-2.0',
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
    state.creators = Array.isArray(parsed.creators) && parsed.creators.length
      ? parsed.creators
      : (parsed.creator ? [parsed.creator] : createCreators())
    state.creatorsVersion = parsed.creatorsVersion || 1
    state.aiDraft = parsed.aiDraft || null
    migrateLegacyState()
  } catch (error) {
    console.warn('读取本地状态失败，使用默认状态。', error)
  }
  return state
}

function isOversizedDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:') && value.length > DATA_URL_STORAGE_LIMIT
}

function compactImageUrl(imageUrl, imageBlobKey = '') {
  if (!imageBlobKey && imageUrl && imageUrl.startsWith('data:')) {
    return ''
  }

  if (!imageBlobKey && isOversizedDataUrl(imageUrl)) {
    return ''
  }

  return imageUrl || ''
}

function createStoragePayload({ compact = false, dropDraft = false } = {}) {
  const patterns = state.patterns.map((pattern) => ({
    ...pattern,
    imageUrl: compact ? compactImageUrl(pattern.imageUrl, pattern.imageBlobKey) : pattern.imageUrl
  }))

  const products = state.products.map((product) => {
    const linkedPattern = patterns.find((pattern) => pattern.id === product.patternId)
    return {
      ...product,
      imageUrl: compact ? compactImageUrl(product.imageUrl, linkedPattern?.imageBlobKey || '') : product.imageUrl
    }
  })

  const aiDraft = dropDraft || !state.aiDraft
    ? null
    : {
        ...state.aiDraft,
        imageUrl: compact ? compactImageUrl(state.aiDraft.imageUrl, state.aiDraft.imageBlobKey || '') : state.aiDraft.imageUrl
      }

  return {
    patterns,
    products,
    creator: state.creator,
    creators: state.creators,
    creatorsVersion: state.creatorsVersion,
    aiDraft
  }
}

export function saveAppState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoragePayload()))
  } catch (error) {
    if (error?.name !== 'QuotaExceededError') {
      throw error
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoragePayload({ compact: true })))
      console.warn('本地存储空间不足，已自动裁剪过大的图片缓存。')
    } catch (compactError) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(createStoragePayload({ compact: true, dropDraft: true })))
      console.warn('本地存储空间不足，已裁剪图片缓存并清除当前 AI 草稿。', compactError)
    }
  }
}

function migrateLegacyState() {

  // creators 数据版本迁移
  if (state.creatorsVersion !== CREATORS_VERSION) {
    state.creators = createCreators()
    state.creator = state.creators[0]
    state.creatorsVersion = CREATORS_VERSION
  }

  if (!state.creator) {
    state.creator = createCreator()
  }

  if (!Array.isArray(state.creators) || state.creators.length === 0) {
    state.creators = createCreators()
  }

  state.patterns = state.patterns.map((pattern) => ({
    ...pattern,
    imageBlobKey: pattern.imageBlobKey || '',
    imageStorageKey: pattern.imageStorageKey || ''
  }))

  const fallbackCreators = createCreators()

  const normalizeCreator = (creator) => {
    const fallback =
      fallbackCreators.find((item) => item.id === creator.id)
      || fallbackCreators[0]

    if (!creator.name || creator.name === '默认创作者') {
      creator.name = fallback.name
    }

    if (!creator.avatar) {
      creator.avatar = fallback.avatar
    }

    if (
      !creator.bio ||
      creator.bio === '专注非遗剪纸纹样与文创设计，将传统图样转译为更适合数字传播与商品化的视觉作品。'
    ) {
      creator.bio = fallback.bio
    }

    if (!creator.joinedAt) {
      creator.joinedAt = fallback.joinedAt
    }

    return creator
  }

  state.creators = state.creators.map(
    (creator) => normalizeCreator({ ...creator })
  )

  if (!state.creator) {
    state.creator = state.creators[0]
  } else {
    state.creator = normalizeCreator({ ...state.creator })
  }

  const hasPrimary = state.creators.some(
    (creator) => creator.id === state.creator.id
  )

  if (!hasPrimary) {
    state.creator = state.creators[0]
  }

  state.products = state.products.map((product) => {
    if (
      typeof product.description === 'string' &&
      product.description.trim()
    ) {
      return product
    }

    const linkedPattern = state.patterns.find(
      (pattern) => pattern.id === product.patternId
    )

    return {
      ...product,
      description: linkedPattern?.description || ''
    }
  })
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
