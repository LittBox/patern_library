import api from './api.js'
import {
  createCreator,
  createPatternRecord,
  createProductFromPattern,
  createSeedPatterns,
  deriveCreatorMetrics,
  filterPatterns,
  getRecentPatterns,
  loadAppState,
  saveAppState,
  state
} from './state.js'
import {
  escapeHtml,
  formatCurrency,
  formatDate,
  parseDataUrl,
  toBase64
} from './utils.js'

const pages = [...document.querySelectorAll('.page')]
const navItems = [...document.querySelectorAll('.nav li')]
const creatorSection = document.getElementById('creator')
const creatorDetailSection = document.getElementById('creator-detail')
const aiResult = document.getElementById('aiResult')
const uploadResult = document.getElementById('uploadResult')

const PLACEHOLDER_SVG = (width = 640, height = 640, text = '非遗剪纸纹样') => {
  const safeText = escapeHtml(text)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#f4ede0"/>
          <stop offset="100%" stop-color="#d8b883"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="24" fill="url(#bg)"/>
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="none" stroke="#7f5539" stroke-width="10" stroke-dasharray="14 12"/>
      <path d="M${width * 0.2} ${height * 0.7} Q${width * 0.5} ${height * 0.2} ${width * 0.8} ${height * 0.7}" fill="none" stroke="#b5653b" stroke-width="8" stroke-linecap="round"/>
      <text x="50%" y="84%" text-anchor="middle" fill="#5b371d" font-size="32" font-family="sans-serif">${safeText}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

let carouselImages = [
  {
    title: '锦绣回纹',
    imageUrl: PLACEHOLDER_SVG(800, 960, '锦绣回纹'),
    description: '取材民族回纹与对称构图，让传统纹样更适合数字展示与文创延展。'
  },
  {
    title: '苗岭蝶影',
    imageUrl: PLACEHOLDER_SVG(800, 960, '苗岭蝶影'),
    description: '蝴蝶母题结合刺绣质感，保留节庆仪式感与生命叙事。'
  },
  {
    title: '蓝白云锦',
    imageUrl: PLACEHOLDER_SVG(800, 960, '蓝白云锦'),
    description: '蓝白色阶与几何层叠适合包装、织物与空间装饰。'
  },
  {
    title: '山海吉纹',
    imageUrl: PLACEHOLDER_SVG(800, 960, '山海吉纹'),
    description: '将山形、水纹与吉祥符号融合，形成新的视觉叙事。'
  }
]

let currentCarouselIndex = 0
let carouselTimer = null
let activePatternId = null
let activeCreatorId = null

function resetAiResultPanel() {
  if (!aiResult) return
  aiResult.innerHTML = `
    <div class="empty-state tall">
      <p>填写左侧描述后，这里会展示作品名称、简介、讲解词和生成的纹案图片。</p>
    </div>
  `
}

function normalizeAssetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('/')) return url
  return `/${String(url).replace(/^\.\//, '').replace(/^\/+/, '')}`
}

function getActionIcon(action) {
  const icons = {
    detail: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `,
    edit: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        <path d="M13.5 7 17 10.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `,
    shelf: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v4H4zM5 9h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
      </svg>
    `,
    price: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18M16.5 7.5c0-1.7-1.8-3-4.5-3S7.5 5.8 7.5 7.5 9.3 10.5 12 10.5s4.5 1.3 4.5 3-1.8 3-4.5 3-4.5-1.3-4.5-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    delete: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M9 7V5h6v2M8 7v12m8-12v12M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
    `,
    revoke: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 7H5v3M5 10a7 7 0 1 0 2-4.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `
  }
  return icons[action] || ''
}

function getActionText(action, pattern) {
  const map = {
    detail: '详情',
    edit: '修改信息',
    shelf: pattern?.onShelf ? '修改价格' : '放入货架',
    price: '修改价格',
    delete: '删除作品',
    revoke: '撤回商品'
  }
  return map[action] || ''
}

function removeMiniModal() {
  document.getElementById('miniModalOverlay')?.remove()
}

function openMiniModal({ title, subtitle = '', content = '', actions = '', closeOnOverlay = true }) {
  removeMiniModal()
  const overlay = document.createElement('div')
  overlay.id = 'miniModalOverlay'
  overlay.className = 'mini-modal-overlay'
  overlay.innerHTML = `
    <div class="mini-modal-window" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <button class="mini-modal-close" aria-label="关闭">×</button>
      <div class="mini-modal-header">
        <h3>${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="mini-modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <div class="mini-modal-body">${content}</div>
      <div class="mini-modal-actions">${actions}</div>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.addEventListener('click', (event) => {
    if (event.target.closest('.mini-modal-close')) {
      removeMiniModal()
      return
    }
    if (closeOnOverlay && event.target === overlay) {
      removeMiniModal()
    }
  })

  return overlay
}

function showNotice(title, message) {
  const overlay = openMiniModal({
    title,
    subtitle: '请确认提示信息',
    content: `<p class="mini-modal-message">${escapeHtml(message)}</p>`,
    actions: `<button class="btn-primary" data-mini-action="ok">我知道了</button>`
  })

  overlay.querySelector('[data-mini-action="ok"]')?.addEventListener('click', removeMiniModal)
}

function showToast(message, { type = 'success', duration = 2200 } = {}) {
  const existing = document.getElementById('appToast')
  existing?.remove()

  const toast = document.createElement('div')
  toast.id = 'appToast'
  toast.className = `app-toast ${type}`
  toast.textContent = message
  document.body.appendChild(toast)

  const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16))
  scheduleFrame(() => toast.classList.add('visible'))

  window.setTimeout(() => {
    toast.classList.remove('visible')
    window.setTimeout(() => toast.remove(), 220)
  }, duration)
}

function openConfirmDialog({ title, message, confirmText = '确认', danger = false, onConfirm }) {
  const overlay = openMiniModal({
    title,
    subtitle: '请确认是否继续',
    content: `<p class="mini-modal-message">${escapeHtml(message)}</p>`,
    actions: `
      <button class="btn-secondary" data-mini-action="cancel">取消</button>
      <button class="btn-secondary ${danger ? 'danger' : ''}" data-mini-action="confirm">${escapeHtml(confirmText)}</button>
    `
  })

  overlay.querySelector('[data-mini-action="cancel"]')?.addEventListener('click', removeMiniModal)
  overlay.querySelector('[data-mini-action="confirm"]')?.addEventListener('click', () => {
    removeMiniModal()
    onConfirm?.()
  })
}

function refreshPatternDetailModal(patternId) {
  const latest = getPatternById(patternId)
  if (!latest) {
    document.getElementById('patternModalOverlay')?.remove()
    return
  }
  document.getElementById('patternModalOverlay')?.remove()
  createPatternDetailModal(latest)
}

function openPatternEditDialog(pattern, { reopenDetail = false } = {}) {
  const overlay = openMiniModal({
    title: '修改作品信息',
    subtitle: '建议补充准确名称和简介，便于搜索与展示',
    content: `
      <label class="mini-form-field">
        <span>作品名称</span>
        <input id="miniPatternTitle" type="text" value="${escapeHtml(pattern.title)}" maxlength="30">
      </label>
      <label class="mini-form-field">
        <span>作品简介</span>
        <textarea id="miniPatternDesc" rows="5" maxlength="120">${escapeHtml(pattern.description || '')}</textarea>
      </label>
    `,
    actions: `
      <button class="btn-secondary" data-mini-action="cancel">取消</button>
      <button class="btn-primary" data-mini-action="save">保存修改</button>
    `
  })

  overlay.querySelector('[data-mini-action="cancel"]')?.addEventListener('click', removeMiniModal)
  overlay.querySelector('[data-mini-action="save"]')?.addEventListener('click', () => {
    const title = overlay.querySelector('#miniPatternTitle')?.value.trim()
    const description = overlay.querySelector('#miniPatternDesc')?.value.trim() || ''
    if (!title) {
      showNotice('名称不能为空', '请先填写作品名称，再保存修改。')
      return
    }
    updatePattern(pattern.id, { title, description })
    removeMiniModal()
    if (reopenDetail) refreshPatternDetailModal(pattern.id)
  })
}

function openPatternShelfDialog(pattern, { reopenDetail = false, title = '设置货架价格', confirmText = '保存并上架' } = {}) {
  const overlay = openMiniModal({
    title,
    subtitle: '建议设置清晰的价格，方便商品展览统一展示',
    content: `
      <label class="mini-form-field">
        <span>价格（元）</span>
        <input id="miniPatternPrice" type="number" min="0" step="0.01" value="${pattern.price ?? 99}">
      </label>
    `,
    actions: `
      <button class="btn-secondary" data-mini-action="cancel">取消</button>
      <button class="btn-primary" data-mini-action="save">${escapeHtml(confirmText)}</button>
    `
  })

  overlay.querySelector('[data-mini-action="cancel"]')?.addEventListener('click', removeMiniModal)
  overlay.querySelector('[data-mini-action="save"]')?.addEventListener('click', () => {
    const price = Number(overlay.querySelector('#miniPatternPrice')?.value)
    if (!Number.isFinite(price) || price < 0) {
      showNotice('价格格式不正确', '请输入大于或等于 0 的有效价格。')
      return
    }
    updatePattern(pattern.id, { onShelf: true, price })
    removeMiniModal()
    if (reopenDetail) refreshPatternDetailModal(pattern.id)
  })
}

function openProductPriceDialog(product) {
  const overlay = openMiniModal({
    title: '修改商品价格',
    subtitle: '价格会同步更新到对应作品状态',
    content: `
      <label class="mini-form-field">
        <span>最新价格（元）</span>
        <input id="miniProductPrice" type="number" min="0" step="0.01" value="${product.price}">
      </label>
    `,
    actions: `
      <button class="btn-secondary" data-mini-action="cancel">取消</button>
      <button class="btn-primary" data-mini-action="save">保存价格</button>
    `
  })

  overlay.querySelector('[data-mini-action="cancel"]')?.addEventListener('click', removeMiniModal)
  overlay.querySelector('[data-mini-action="save"]')?.addEventListener('click', () => {
    const price = Number(overlay.querySelector('#miniProductPrice')?.value)
    if (!Number.isFinite(price) || price < 0) {
      showNotice('价格格式不正确', '请输入大于或等于 0 的有效价格。')
      return
    }
    product.price = price
    product.updatedAt = new Date().toISOString()
    const pattern = getPatternById(product.patternId)
    if (pattern) {
      pattern.price = price
      pattern.onShelf = true
      pattern.updatedAt = new Date().toISOString()
    }
    saveAppState()
    rerender()
    removeMiniModal()
  })
}

function ensureStateLoaded() {
  const loaded = loadAppState()
  if (loaded.patterns.length === 0) {
    loaded.patterns = createSeedPatterns(PLACEHOLDER_SVG)
  }
  if (!loaded.creator) {
    loaded.creator = createCreator()
  }
  if (!loaded.creator.avatar) {
    loaded.creator.avatar = '/img/avatar/example.png'
  }
  if (!loaded.creator.name || loaded.creator.name === '默认创作者') {
    loaded.creator.name = '林知夏'
  }
  if (!Array.isArray(loaded.products)) {
    loaded.products = []
  }
  if (loaded.products.length === 0) {
    loaded.products = loaded.patterns
      .filter((pattern) => pattern.onShelf && typeof pattern.price === 'number')
      .map((pattern) => createProductFromPattern(pattern, pattern.price))
  }
  saveAppState()
}

async function fetchLocalJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`无法读取 ${path}`)
  }
  return response.json()
}

async function bootstrapLocalAssets() {
  try {
    const [carouselData, patternData, goodsData] = await Promise.all([
      fetchLocalJson('/img/carousel.json'),
      fetchLocalJson('/img/url.json'),
      fetchLocalJson('/img/goods.json')
    ])

    if (Array.isArray(carouselData) && carouselData.length) {
      carouselImages = carouselData.map((item, index) => ({
        title: item.name || `轮播作品 ${index + 1}`,
        imageUrl: normalizeAssetUrl(item.url) || PLACEHOLDER_SVG(800, 960, item.name || `轮播作品 ${index + 1}`),
        description: item.description || `${item.ethnic || '民族'}纹案作品展示`
      }))
    }

    const hasOnlySeedPatterns = state.patterns.every((pattern) => pattern.id.startsWith('pt_seed_'))
    if (Array.isArray(patternData) && patternData.length && hasOnlySeedPatterns) {
      state.patterns = patternData.map((item, index) => createPatternRecord({
        id: `pt_asset_${index + 1}`,
        title: item.name || `纹案作品 ${index + 1}`,
        description: item.description || `${item.ethnic || '民族'}纹案作品。`,
        explanation: item.description || `${item.ethnic || '民族'}元素纹案，适合用于展示、文创衍生与图样参考。`,
        imageUrl: normalizeAssetUrl(item.url) || PLACEHOLDER_SVG(720, 900, item.name || `纹案作品 ${index + 1}`),
        sourceType: String(item.type || '').includes('AI') ? 'ai' : 'upload',
        prompt: `${item.ethnic || '民族'}纹样、非遗风格、装饰构图`,
        tags: [item.ethnic || '民族纹样', item.type || '自主上传'],
        onShelf: false
      }))
    }

    const hasOnlyDerivedProducts = state.products.every((product) => String(product.id).startsWith('prod_'))
    if (Array.isArray(goodsData) && goodsData.length && hasOnlyDerivedProducts) {
      state.products = goodsData.map((item, index) => {
        const matchedPattern = state.patterns.find((pattern) => pattern.title === item.name)
        if (matchedPattern) {
          matchedPattern.description = item.description || matchedPattern.description || ''
          matchedPattern.onShelf = true
          matchedPattern.price = item.price || 0
        }

        return {
          id: `prod_asset_${index + 1}`,
          patternId: matchedPattern?.id || `pt_asset_${index + 1}`,
          title: item.name || `商品 ${index + 1}`,
          description: item.description || matchedPattern?.description || '',
          price: item.price || 0,
          imageUrl: normalizeAssetUrl(item.url) || matchedPattern?.imageUrl || PLACEHOLDER_SVG(720, 720, item.name || `商品 ${index + 1}`),
          status: 'on_shelf',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }

    saveAppState()
  } catch (error) {
    console.warn('本地图像资源读取失败，继续使用当前状态。', error)
  }
}

function getPatternById(patternId) {
  return state.patterns.find((pattern) => pattern.id === patternId) || null
}

function getDisplayPatterns() {
  const searchTerm = document.getElementById('searchInput')?.value || ''
  const filterType = document.getElementById('filterSelect')?.value || ''
  return filterPatterns(state.patterns, { searchTerm, sourceType: filterType })
}

function renderFeaturedPatterns() {
  const container = document.getElementById('featuredPatterns')
  if (!container) return

  const featured = [...state.patterns]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)

  container.innerHTML = featured.map((pattern) => `
    <article class="pattern-card featured-card" data-pattern-id="${pattern.id}">
      <img src="${pattern.imageUrl}" alt="${escapeHtml(pattern.title)}" class="pattern-card-image">
      <div class="pattern-card-info">
        <p class="pattern-card-source">${pattern.sourceType === 'ai' ? 'AI 生成' : '自主上传'}</p>
        <h4 class="pattern-card-title">${escapeHtml(pattern.title)}</h4>
        <p class="pattern-card-desc">${escapeHtml(pattern.description || '待补充作品简介')}</p>
      </div>
    </article>
  `).join('')
}

function renderPatterns() {
  const filtered = getDisplayPatterns()
  const aiContainer = document.getElementById('aiPatterns')
  const uploadContainer = document.getElementById('uploadPatterns')
  if (!aiContainer || !uploadContainer) return

  const renderCards = (patterns, emptyCopy) => {
    if (!patterns.length) {
      return `<div class="empty-state"><p>${emptyCopy}</p></div>`
    }

    return patterns.map((pattern) => `
      <article class="pattern-card" data-pattern-id="${pattern.id}">
        <img src="${pattern.imageUrl}" alt="${escapeHtml(pattern.title)}" class="pattern-card-image">
        <div class="pattern-card-info">
          <div class="title-row">
            <h3 class="pattern-card-title">${escapeHtml(pattern.title)}</h3>
            <span class="pill ${pattern.onShelf ? 'status-on-shelf' : 'status-off-shelf'}">${pattern.onShelf ? '已上架' : '未上架'}</span>
          </div>
          <p class="pattern-card-desc">${escapeHtml(pattern.description || '待补充作品简介')}</p>
          <div class="pattern-meta">
            <span>${pattern.tags?.slice(0, 3).join(' / ') || '未设置标签'}</span>
            <span>${formatDate(pattern.createdAt)}</span>
          </div>
          <div class="pattern-actions">
            <button class="btn-secondary icon-action" data-action="detail" data-id="${pattern.id}" aria-label="查看详情" title="查看详情">${getActionIcon('detail')}</button>
            <button class="btn-secondary icon-action" data-action="edit" data-id="${pattern.id}" aria-label="修改信息" title="修改信息">${getActionIcon('edit')}</button>
            <button class="btn-secondary icon-action" data-action="shelf" data-id="${pattern.id}" aria-label="${pattern.onShelf ? '调整价格' : '放入货架'}" title="${pattern.onShelf ? '调整价格' : '放入货架'}">${getActionIcon(pattern.onShelf ? 'price' : 'shelf')}</button>
            <button class="btn-secondary danger icon-action" data-action="delete" data-id="${pattern.id}" aria-label="删除作品" title="删除作品">${getActionIcon('delete')}</button>
          </div>
        </div>
      </article>
    `).join('')
  }

  aiContainer.innerHTML = renderCards(
    filtered.filter((pattern) => pattern.sourceType === 'ai'),
    '当前没有匹配的 AI 纹案作品。'
  )
  uploadContainer.innerHTML = renderCards(
    filtered.filter((pattern) => pattern.sourceType === 'upload'),
    '当前没有匹配的自主上传作品。'
  )
}

function renderProducts() {
  const container = document.getElementById('productsGrid')
  if (!container) return

  const sortValue = document.getElementById('sortSelect')?.value || ''
  const products = [...state.products].sort((a, b) => {
    if (sortValue === 'price') return a.price - b.price
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  if (!products.length) {
    container.innerHTML = '<div class="empty-state"><p>还没有上架商品，先去剪纸纹样库选择作品上架吧。</p></div>'
    return
  }

  container.innerHTML = products.map((product) => `
    <article class="product-card" data-product-id="${product.id}">
      <img src="${product.imageUrl}" alt="${escapeHtml(product.title)}" class="product-card-image">
      <div class="product-card-content">
        <h3 class="product-card-name">${escapeHtml(product.title)}</h3>
        <p class="product-card-desc">${escapeHtml(product.description || '待补充作品简介')}</p>
        <div class="product-card-meta">
          <span class="product-price">${formatCurrency(product.price)}</span>
          <span class="product-date">${formatDate(product.createdAt)}</span>
        </div>
        <div class="product-actions">
          <button class="product-text-action" data-product-action="detail" data-pattern-id="${product.patternId}">详情</button>
          <span class="product-action-sep" aria-hidden="true">|</span>
          <button class="product-text-action" data-product-action="price" data-id="${product.id}">修改价格</button>
          <span class="product-action-sep" aria-hidden="true">|</span>
          <button class="product-text-action danger" data-product-action="revoke" data-id="${product.id}">撤回</button>
        </div>
      </div>
    </article>
  `).join('')
}

function renderCreatorOverview() {
  if (!creatorSection) return
  const creator = state.creator

  creatorSection.querySelector('#creatorsGrid').innerHTML = `
    <article class="creator-card creator-summary-card">
      <div class="creator-card-header">
        <div class="creator-card-avatar">
          <img src="${creator.avatar || PLACEHOLDER_SVG(220, 220, creator.name)}" alt="${escapeHtml(creator.name)}">
        </div>
        <div class="creator-card-info">
          <h2 class="creator-card-name">${escapeHtml(creator.name)}</h2>
          <p class="creator-card-bio">${escapeHtml(creator.bio)}</p>
          <p class="creator-card-join">入驻时间 ${formatDate(creator.joinedAt)}</p>
        </div>
      </div>
      <div class="creator-card-footer">
        <button class="btn-primary" id="viewCreatorDetailBtn">详情</button>
      </div>
    </article>
  `

  const detailBtn = document.getElementById('viewCreatorDetailBtn')
  if (detailBtn) {
    detailBtn.addEventListener('click', () => {
      activeCreatorId = creator.id
      showPage('creator-detail')
      renderCreatorDetail()
    })
  }
}

function renderCreatorDetail() {
  if (!creatorDetailSection || !state.creator || activeCreatorId !== state.creator.id) return

  const creator = state.creator
  const metrics = deriveCreatorMetrics(state.patterns, state.products)
  const recentPatterns = getRecentPatterns(state.patterns, 4)
  const tips = []

  if (metrics.noDescriptionPatterns > 0) tips.push(`还有 ${metrics.noDescriptionPatterns} 个作品没有完善简介，建议补充后再推广。`)
  if (metrics.notOnShelfPatterns > 0) tips.push(`仍有 ${metrics.notOnShelfPatterns} 个作品未上架，可以挑选其中的主推款进入商品展览。`)
  if (metrics.zeroPriceProducts > 0) tips.push(`有 ${metrics.zeroPriceProducts} 个商品未设置有效价格，请尽快修正。`)
  if (!tips.length) tips.push('当前作品信息完整度较高，可以继续扩充系列作品并测试不同题材。')

  document.getElementById('detailCreatorName').textContent = creator.name
  document.getElementById('detailCreatorBio').textContent = creator.bio
  document.getElementById('detailCreatorAvatar').src = creator.avatar || PLACEHOLDER_SVG(220, 220, creator.name)
  document.querySelector('.creator-joindate').textContent = `入驻时间：${formatDate(creator.joinedAt)}`

  document.getElementById('totalPatterns').textContent = String(metrics.totalPatterns)
  document.getElementById('aiPatternCount').textContent = String(metrics.aiPatterns)
  document.getElementById('uploadPatternCount').textContent = String(metrics.uploadPatterns)
  document.getElementById('publishedProducts').textContent = String(metrics.onShelfProducts)
  document.getElementById('unpublishedPatterns').textContent = String(metrics.notOnShelfPatterns)
  document.getElementById('monthlyNew').textContent = String(metrics.monthlyNewPatterns)

  document.getElementById('recentWorks').innerHTML = recentPatterns.length
    ? recentPatterns.map((pattern) => `
      <div class="work-item">
        <div>
          <div class="work-item-name">${escapeHtml(pattern.title)}</div>
          <div class="work-item-sub">${pattern.sourceType === 'ai' ? 'AI 生成' : '自主上传'} · ${formatDate(pattern.createdAt)}</div>
        </div>
        <div class="work-item-actions">
          <button class="btn-tiny" data-action="detail" data-id="${pattern.id}">详情</button>
          <button class="btn-tiny" data-action="shelf" data-id="${pattern.id}">${pattern.onShelf ? '价格' : '上架'}</button>
        </div>
      </div>
    `).join('')
    : '<div class="empty-state small"><p>最近还没有新的作品记录。</p></div>'

  document.getElementById('operationTips').innerHTML = tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')
}

function renderCarousel() {
  const image = document.getElementById('carouselImage')
  const dots = document.querySelector('.carousel-dots')
  if (!image || !dots) return

  dots.innerHTML = carouselImages.map((item, index) => `
    <button class="dot ${index === currentCarouselIndex ? 'active' : ''}" data-carousel-index="${index}" aria-label="${escapeHtml(item.title)}"></button>
  `).join('')

  const current = carouselImages[currentCarouselIndex]
  image.src = current.imageUrl
  image.alt = current.title
}

function startCarousel() {
  clearInterval(carouselTimer)
  carouselTimer = window.setInterval(() => {
    currentCarouselIndex = (currentCarouselIndex + 1) % carouselImages.length
    renderCarousel()
  }, 4800)
  carouselTimer?.unref?.()
}

function bindCarousel() {
  document.querySelector('.carousel-prev')?.addEventListener('click', () => {
    currentCarouselIndex = (currentCarouselIndex - 1 + carouselImages.length) % carouselImages.length
    renderCarousel()
    startCarousel()
  })

  document.querySelector('.carousel-next')?.addEventListener('click', () => {
    currentCarouselIndex = (currentCarouselIndex + 1) % carouselImages.length
    renderCarousel()
    startCarousel()
  })

  document.querySelector('.carousel-dots')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-carousel-index]')
    if (!button) return
    currentCarouselIndex = Number(button.dataset.carouselIndex)
    renderCarousel()
    startCarousel()
  })
}

function showPage(pageId) {
  pages.forEach((page) => page.classList.toggle('hidden', page.id !== pageId))
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.target === pageId))

  if (pageId === 'creator-detail') {
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.target === 'creator'))
  }
}

function upsertProduct(pattern, price) {
  const existing = state.products.find((product) => product.patternId === pattern.id)
  if (existing) {
    existing.price = price
    existing.title = pattern.title
    existing.description = pattern.description || ''
    existing.imageUrl = pattern.imageUrl
    existing.updatedAt = new Date().toISOString()
    return existing
  }

  const created = createProductFromPattern(pattern, price)
  state.products.unshift(created)
  return created
}

function updatePattern(patternId, updates) {
  const pattern = getPatternById(patternId)
  if (!pattern) return null

  Object.assign(pattern, updates, { updatedAt: new Date().toISOString() })
  if (pattern.onShelf && typeof pattern.price === 'number') {
    upsertProduct(pattern, pattern.price)
  }
  saveAppState()
  rerender()
  return pattern
}

function removePattern(patternId) {
  state.patterns = state.patterns.filter((pattern) => pattern.id !== patternId)
  state.products = state.products.filter((product) => product.patternId !== patternId)
  saveAppState()
  rerender()
}

function rerender() {
  renderFeaturedPatterns()
  renderPatterns()
  renderProducts()
  renderCreatorOverview()
  if (!creatorDetailSection.classList.contains('hidden')) {
    renderCreatorDetail()
  }
}

function createPatternDetailModal(pattern) {
  const existing = document.getElementById('patternModalOverlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'patternModalOverlay'
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal detail-modal">
      <button class="modal-close" aria-label="关闭">×</button>
      <div class="detail-layout">
        <div class="detail-visual">
          <img src="${pattern.imageUrl}" alt="${escapeHtml(pattern.title)}" class="detail-image">
        </div>
        <div class="detail-content">
          <h2>${escapeHtml(pattern.title)}</h2>
          <p class="detail-desc">${escapeHtml(pattern.description || '待补充作品简介')}</p>
          <dl class="detail-grid">
            <div><dt>讲解词</dt><dd>${escapeHtml(pattern.explanation || '暂无讲解词')}</dd></div>
            <div><dt>来源类型</dt><dd>${pattern.sourceType === 'ai' ? 'AI 生成' : '自主上传'}</dd></div>
            <div><dt>创建时间</dt><dd>${formatDate(pattern.createdAt)}</dd></div>
            <div><dt>标签</dt><dd>${escapeHtml(pattern.tags?.join(' / ') || '未设置')}</dd></div>
            <div><dt>状态</dt><dd>${pattern.onShelf ? `已上架 · ${formatCurrency(pattern.price || 0)}` : '未上架'}</dd></div>
            <div><dt>提示词</dt><dd>${escapeHtml(pattern.prompt || '无')}</dd></div>
          </dl>
          <div class="detail-actions">
            <button class="btn-secondary action-plain action-plain-edit" data-modal-action="edit" aria-label="修改名称和简介" title="修改名称和简介">
              ${getActionIcon('edit')}
              <span>${getActionText('edit', pattern)}</span>
            </button>
            <button class="btn-secondary action-plain action-plain-price" data-modal-action="shelf" aria-label="${pattern.onShelf ? '修改价格' : '放入货架'}" title="${pattern.onShelf ? '修改价格' : '放入货架'}">
              ${getActionIcon(pattern.onShelf ? 'price' : 'shelf')}
              <span>${getActionText(pattern.onShelf ? 'price' : 'shelf', pattern)}</span>
            </button>
            <button class="btn-secondary danger action-plain action-plain-delete" data-modal-action="delete" aria-label="删除作品" title="删除作品">
              ${getActionIcon('delete')}
              <span>${getActionText('delete', pattern)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || event.target.closest('.modal-close')) {
      overlay.remove()
      return
    }

    const actionBtn = event.target.closest('[data-modal-action]')
    if (!actionBtn) return

    if (actionBtn.dataset.modalAction === 'edit') {
      openPatternEditDialog(pattern, { reopenDetail: true })
    }

    if (actionBtn.dataset.modalAction === 'shelf') {
      openPatternShelfDialog(pattern, {
        reopenDetail: true,
        title: pattern.onShelf ? '修改货架价格' : '放入货架',
        confirmText: pattern.onShelf ? '保存价格' : '保存并上架'
      })
    }

    if (actionBtn.dataset.modalAction === 'delete') {
      openConfirmDialog({
        title: '删除作品',
        message: `确认删除《${pattern.title}》吗？删除后将同时移除商品记录。`,
        confirmText: '确认删除',
        danger: true,
        onConfirm: () => {
          removePattern(pattern.id)
          overlay.remove()
        }
      })
    }
  })
}

async function handleUpload(file) {
  const base64 = await toBase64(file)
  const payload = parseDataUrl(base64)
  const uploaded = await api.uploadPatternImage({
    fileName: file.name,
    contentType: payload.mimeType,
    base64: payload.base64
  })

  const newPattern = createPatternRecord({
    title: file.name.replace(/\.[^.]+$/, ''),
    description: '自主上传的非遗剪纸纹样作品，等待补充更多讲解信息。',
    explanation: '上传作品已进入剪纸纹样库，可继续完善名称、简介和货架价格。',
    imageUrl: uploaded.imageUrl || base64,
    sourceType: 'upload',
    prompt: '',
    tags: ['自主上传', '本地素材'],
    imageModel: uploaded.model || '',
    textModel: '',
    createdAt: new Date().toISOString()
  })

  state.patterns.unshift(newPattern)
  saveAppState()
  rerender()
  uploadResult.innerHTML = `<p class="inline-feedback success">已导入作品《${escapeHtml(newPattern.title)}》，现在可以继续编辑或上架。</p>`
}

async function handleGenerate() {
  const fields = {
    theme: document.getElementById('themeInput')?.value.trim() || '',
    ethnicStyle: document.getElementById('styleInput')?.value.trim() || '',
    palette: document.getElementById('paletteInput')?.value.trim() || '',
    composition: document.getElementById('compositionInput')?.value.trim() || '',
    usage: document.getElementById('usageInput')?.value.trim() || '',
    extra: document.getElementById('aiPrompt')?.value.trim() || ''
  }

  if (!Object.values(fields).some(Boolean)) {
    showNotice('请先填写内容', '先填写一点主题或风格描述，我们再帮你生成纹案。')
    return
  }

  const button = document.getElementById('generateBtn')
  button.disabled = true
  button.textContent = '生成中...'
  aiResult.innerHTML = '<div class="inline-feedback">正在生成结构化文案与纹案图片，请稍候。</div>'

  try {
    const meta = await api.generatePatternMeta(fields)
    const image = await api.generatePatternImage(meta.image_prompt)
    const previewUrl = image.imageUrl || `data:${image.mimeType};base64,${image.imageBase64}`
    const defaultAiPrice = 99

    state.aiDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: meta.title,
      description: meta.description,
      explanation: meta.explanation,
      prompt: meta.image_prompt,
      imageUrl: previewUrl,
      imageModel: image.model || 'qwen-image-2.0',
      textModel: meta.textModel || 'deepseek-chat',
      tags: meta.tags || [],
      price: defaultAiPrice,
      onShelf: true,
      saving: false,
      fallback: Boolean(image.fallback),
      debugMessage: image.message || ''
    }

    aiResult.innerHTML = `
      <article class="ai-result-card">
        <div class="ai-result-visual">
          <img src="${previewUrl}" alt="${escapeHtml(meta.title)}" class="ai-result-image">
        </div>
        <div class="ai-result-content">
          <p class="eyebrow">AI 生成结果</p>
          <h3>${escapeHtml(meta.title)}</h3>
          <p>${escapeHtml(meta.description)}</p>
          ${state.aiDraft.fallback ? `<div class="inline-feedback">${escapeHtml(state.aiDraft.debugMessage || '当前展示的是本地占位图，请检查本地函数服务。')}</div>` : ''}
          <div class="result-block">
            <strong>纹案讲解词</strong>
            <p>${escapeHtml(meta.explanation)}</p>
          </div>
          <div class="result-block">
            <strong>图片提示词</strong>
            <p>${escapeHtml(meta.image_prompt)}</p>
          </div>
          <div class="result-block">
            <strong>上架价格</strong>
            <label class="result-price-field">
              <span>保存到商品展览时使用这个价格</span>
              <input id="aiPatternPrice" type="number" min="0" step="0.01" value="${defaultAiPrice}">
            </label>
          </div>
          <div class="result-actions">
            <button class="btn-primary" id="saveAiPatternBtn">保存并加入商品展览</button>
            <button class="ai-discard-btn" id="discardAiPatternBtn" aria-label="丢弃本次结果" title="丢弃本次结果">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7h14M9 7V5h6v2M8 7v12m8-12v12M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `

    document.getElementById('saveAiPatternBtn')?.addEventListener('click', async () => {
      if (!state.aiDraft || state.aiDraft.saved || state.aiDraft.saving) {
        showToast('这次结果已经加入商品展览，请重新生成新的作品。', { type: 'info' })
        return
      }

      const price = Number(document.getElementById('aiPatternPrice')?.value)
      if (!Number.isFinite(price) || price < 0) {
        showToast('请输入大于或等于 0 的有效价格。', { type: 'error', duration: 2600 })
        return
      }

      const saveBtn = document.getElementById('saveAiPatternBtn')
      state.aiDraft = { ...state.aiDraft, saving: true }
      saveBtn?.setAttribute('disabled', 'true')
      saveBtn?.classList.add('is-disabled')
      if (saveBtn) saveBtn.textContent = '保存中...'

      const savedPattern = createPatternRecord({
        title: state.aiDraft.title,
        description: state.aiDraft.description,
        explanation: state.aiDraft.explanation,
        imageUrl: state.aiDraft.imageUrl,
        sourceType: 'ai',
        prompt: state.aiDraft.prompt,
        tags: state.aiDraft.tags,
        imageModel: state.aiDraft.imageModel,
        textModel: state.aiDraft.textModel,
        price,
        onShelf: state.aiDraft.onShelf
      })

      try {
        const existingPattern = state.patterns.find((pattern) =>
          pattern.title === savedPattern.title &&
          pattern.imageUrl === savedPattern.imageUrl &&
          pattern.prompt === savedPattern.prompt
        )

        const finalPattern = existingPattern
          ? updatePattern(existingPattern.id, {
              description: savedPattern.description,
              explanation: savedPattern.explanation,
              tags: savedPattern.tags,
              imageModel: savedPattern.imageModel,
              textModel: savedPattern.textModel,
              price: savedPattern.price,
              onShelf: savedPattern.onShelf
            })
          : createPatternRecord((await api.savePattern(savedPattern)).pattern || savedPattern)

        if (!existingPattern) {
          state.patterns.unshift(finalPattern)
        }
        if (finalPattern?.onShelf && typeof finalPattern.price === 'number') {
          upsertProduct(finalPattern, finalPattern.price)
        }

        state.aiDraft = { ...state.aiDraft, saved: true, saving: false }
        if (saveBtn) saveBtn.textContent = '已加入商品展览'
        saveBtn?.classList.add('is-saved')
        saveAppState()
        rerender()
        showToast(`《${finalPattern.title}》已按 ${formatCurrency(finalPattern.price || 0)} 加入商品展览。`)
      } catch (error) {
        state.aiDraft = { ...state.aiDraft, saving: false }
        saveBtn?.removeAttribute('disabled')
        saveBtn?.classList.remove('is-disabled')
        if (saveBtn) saveBtn.textContent = '保存并加入商品展览'
        showToast(error.message || '加入商品展览失败，请重试。', { type: 'error', duration: 2600 })
      }
    })

    document.getElementById('discardAiPatternBtn')?.addEventListener('click', () => {
      state.aiDraft = null
      saveAppState()
      resetAiResultPanel()
    })
  } catch (error) {
    aiResult.innerHTML = `<div class="inline-feedback error">${escapeHtml(error.message || '生成失败，请稍后重试。')}</div>`
  } finally {
    button.disabled = false
    button.textContent = '生成图片'
  }
}

function bindNavigation() {
  navItems.forEach((item) => {
    item.addEventListener('click', () => showPage(item.dataset.target))
  })

  document.querySelector('.featured-more')?.addEventListener('click', (event) => {
    event.preventDefault()
    showPage('gallery')
  })
}

function bindGallery() {
  document.getElementById('importBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click()
  })

  document.getElementById('fileInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await handleUpload(file)
    } catch (error) {
      uploadResult.innerHTML = `<p class="inline-feedback error">${escapeHtml(error.message || '上传失败')}</p>`
    } finally {
      event.target.value = ''
    }
  })

  document.getElementById('searchInput')?.addEventListener('input', renderPatterns)
  document.getElementById('filterSelect')?.addEventListener('change', renderPatterns)

  document.getElementById('gallery')?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')
    if (!action) return

    const pattern = getPatternById(action.dataset.id)
    if (!pattern) return

    if (action.dataset.action === 'detail') {
      activePatternId = pattern.id
      createPatternDetailModal(pattern)
      return
    }

    if (action.dataset.action === 'edit') {
      openPatternEditDialog(pattern)
      return
    }

    if (action.dataset.action === 'shelf') {
      openPatternShelfDialog(pattern, {
        title: pattern.onShelf ? '修改货架价格' : '放入货架',
        confirmText: pattern.onShelf ? '保存价格' : '保存并上架'
      })
      return
    }

    if (action.dataset.action === 'delete') {
      openConfirmDialog({
        title: '删除作品',
        message: `确认删除《${pattern.title}》吗？删除后无法恢复。`,
        confirmText: '确认删除',
        danger: true,
        onConfirm: () => removePattern(pattern.id)
      })
    }
  })
}

function bindMarket() {
  document.getElementById('sortSelect')?.addEventListener('change', renderProducts)
  document.getElementById('productsGrid')?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-product-action]')
    if (!action) return

    if (action.dataset.productAction === 'detail') {
      const pattern = getPatternById(action.dataset.patternId)
      if (pattern) createPatternDetailModal(pattern)
      return
    }

    const product = state.products.find((item) => item.id === action.dataset.id)
    if (!product) return

    if (action.dataset.productAction === 'price') {
      openProductPriceDialog(product)
      return
    }

    if (action.dataset.productAction === 'revoke') {
      openConfirmDialog({
        title: '撤回商品',
        message: `确认将《${product.title}》从商品展览中撤回吗？`,
        confirmText: '确认撤回',
        danger: true,
        onConfirm: () => {
          state.products = state.products.filter((item) => item.id !== product.id)
          const pattern = getPatternById(product.patternId)
          if (pattern) {
            pattern.onShelf = false
            pattern.price = null
            pattern.updatedAt = new Date().toISOString()
          }
          saveAppState()
          rerender()
        }
      })
    }
  })
}

function bindCreatorCenter() {
  document.getElementById('backToCreator')?.addEventListener('click', () => showPage('creator'))
  document.getElementById('creator-detail')?.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')
    if (!action) return
    const pattern = getPatternById(action.dataset.id)
    if (!pattern) return

    if (action.dataset.action === 'detail') createPatternDetailModal(pattern)
    if (action.dataset.action === 'shelf') {
      openPatternShelfDialog(pattern, {
        title: pattern.onShelf ? '修改货架价格' : '放入货架',
        confirmText: pattern.onShelf ? '保存价格' : '保存并上架'
      })
    }
  })
}

function bindAi() {
  document.getElementById('generateBtn')?.addEventListener('click', handleGenerate)
}

async function bootstrapFromServer() {
  try {
    const data = await api.getPatterns()
    if (Array.isArray(data.patterns) && data.patterns.length) {
      state.patterns = data.patterns
    }
    if (Array.isArray(data.products) && data.products.length) {
      state.products = data.products
    }
    if (data.creator && !state.creator) {
      state.creator = data.creator
    }
    saveAppState()
  } catch (error) {
    console.warn('读取服务端数据失败，继续使用本地状态。', error)
  }
}

async function init() {
  ensureStateLoaded()
  await bootstrapFromServer()
  await bootstrapLocalAssets()

  bindNavigation()
  bindCarousel()
  bindGallery()
  bindMarket()
  bindCreatorCenter()
  bindAi()

  renderCarousel()
  startCarousel()
  rerender()
  resetAiResultPanel()
  showPage('home')
}

init()
