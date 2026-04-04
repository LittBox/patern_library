import api from './api.js'
import {
  deleteLocalImage,
  readLocalImage,
  saveLocalImage
} from './local-images.js'
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
const mobileNavItems = [...document.querySelectorAll('.nav-drawer-nav [data-target]')]
const creatorSection = document.getElementById('creator')
const creatorDetailSection = document.getElementById('creator-detail')
const aiResult = document.getElementById('aiResult')
const uploadResult = document.getElementById('uploadResult')
const navToggle = document.getElementById('navToggle')
const navDrawer = document.getElementById('mobileNavDrawer')
const navDrawerBackdrop = document.getElementById('navDrawerBackdrop')
const navDrawerClose = document.getElementById('navDrawerClose')
const solarDateLabel = document.getElementById('solarDateLabel')
const lunarDateLabel = document.getElementById('lunarDateLabel')
const solarTermLabel = document.getElementById('solarTermLabel')

const LUNAR_DAY_NAMES = [
  '',
  '初一', '初二', '初三', '初四', '初五',
  '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五',
  '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五',
  '廿六', '廿七', '廿八', '廿九', '三十'
]

const SOLAR_TERMS = [
  { name: '小寒', month: 1, coefficient: 5.4055 },
  { name: '大寒', month: 1, coefficient: 20.12 },
  { name: '立春', month: 2, coefficient: 3.87 },
  { name: '雨水', month: 2, coefficient: 18.73 },
  { name: '惊蛰', month: 3, coefficient: 5.63 },
  { name: '春分', month: 3, coefficient: 20.646 },
  { name: '清明', month: 4, coefficient: 4.81 },
  { name: '谷雨', month: 4, coefficient: 20.1 },
  { name: '立夏', month: 5, coefficient: 5.52 },
  { name: '小满', month: 5, coefficient: 21.04 },
  { name: '芒种', month: 6, coefficient: 5.678 },
  { name: '夏至', month: 6, coefficient: 21.37 },
  { name: '小暑', month: 7, coefficient: 7.108 },
  { name: '大暑', month: 7, coefficient: 22.83 },
  { name: '立秋', month: 8, coefficient: 7.5 },
  { name: '处暑', month: 8, coefficient: 23.13 },
  { name: '白露', month: 9, coefficient: 7.646 },
  { name: '秋分', month: 9, coefficient: 23.042 },
  { name: '寒露', month: 10, coefficient: 8.318 },
  { name: '霜降', month: 10, coefficient: 23.438 },
  { name: '立冬', month: 11, coefficient: 7.438 },
  { name: '小雪', month: 11, coefficient: 22.36 },
  { name: '大雪', month: 12, coefficient: 7.18 },
  { name: '冬至', month: 12, coefficient: 21.94 }
]

const EMPTY_IMAGE_SRC = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
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
let reportArticles = []

const REPORT_HOME_IMAGE_PATHS = [
  'report/首页用图/央视网用图.png',
  'report/首页用图/云南大学易班发展中心“‘易’心共庆，剪绎同心”国庆剪纸活动圆满落幕！首页用图.jpeg',
  'report/首页用图/“易”心共庆，剪绎同心.jpg',
  'report/首页用图/云大校史馆开展“2025年云南省社会科学普及宣传周”系列活动.png'
]

const REPORT_IMAGE_RULES = [
  {
    pattern: /央视网|非遗微课|云上.*青春.*学艺人.*非遗剪纸|学艺人.*非遗剪纸/u,
    path: REPORT_HOME_IMAGE_PATHS[0]
  },
  {
    pattern: /圆满落幕|易班发展中心.*国庆剪纸活动/u,
    path: REPORT_HOME_IMAGE_PATHS[1]
  },
  {
    pattern: /“易”心共庆，剪绎同心|国庆剪纸活动/u,
    path: REPORT_HOME_IMAGE_PATHS[2]
  },
  {
    pattern: /校史馆开展|社会科学普及宣传周/u,
    path: REPORT_HOME_IMAGE_PATHS[3]
  }
]

const AI_LOADING_STEPS = {
  meta: {
    title: '正在生成文案',
    detail: '整理作品名称、简介与讲解词'
  },
  image: {
    title: '正在生成纹案图片',
    detail: '调用模型生成预览图'
  },
  finalize: {
    title: '正在整理结果',
    detail: '组合图片、文案与上架信息'
  }
}

function renderCulturalLoaderFigure(layerClass = '') {
  const className = ['cultural-loader-figure', layerClass].filter(Boolean).join(' ')
  return `
    <img
      class="${className}"
      src="/img/svg/loading.svg"
      alt=""
      aria-hidden="true"
      decoding="async"
    >
  `
}

function renderCulturalLoaderMarkup(label = '纹样载入中') {
  return `
    <div class="cultural-image-loader" aria-hidden="true">
      <div class="cultural-loader-stage">
        <div class="cultural-loader-clouds" aria-hidden="true">
          ${renderCulturalLoaderFigure('cultural-loader-figure-far')}
          ${renderCulturalLoaderFigure('cultural-loader-figure-back')}
          <span class="cultural-loader-trace"></span>
          ${renderCulturalLoaderFigure('cultural-loader-figure-front')}
        </div>
        <div class="cultural-loader-lines" aria-hidden="true">
          <span class="cultural-loader-streak cultural-loader-streak-a"></span>
          <span class="cultural-loader-streak cultural-loader-streak-b"></span>
          <span class="cultural-loader-streak cultural-loader-streak-c"></span>
          <span class="cultural-loader-streak cultural-loader-streak-d"></span>
        </div>
      </div>
      <p class="cultural-loader-text">${escapeHtml(label)}</p>
    </div>
  `
}

function renderDeferredImageMarkup({
  src = '',
  srcCandidates = [],
  alt = '',
  className = '',
  shellClass = '',
  loadingLabel = '纹样载入中'
} = {}) {
  const shellClasses = ['cultural-image-shell', shellClass].filter(Boolean).join(' ')
  const candidatesAttr = srcCandidates.length
    ? ` data-deferred-candidates="${escapeHtml(JSON.stringify(srcCandidates))}"`
    : ''

  return `
    <div class="${shellClasses}">
      <img
        src="${EMPTY_IMAGE_SRC}"
        data-deferred-src="${escapeHtml(src || '')}"
        ${candidatesAttr}
        data-loading-label="${escapeHtml(loadingLabel)}"
        alt="${escapeHtml(alt)}"
        class="${className}"
        loading="lazy"
        decoding="async"
      >
      ${renderCulturalLoaderMarkup(loadingLabel)}
    </div>
  `
}

function ensureCulturalImageShell(image, { shellClass = '', loadingLabel = '纹样载入中' } = {}) {
  if (!image?.parentElement) return null

  let shell = image.closest('.cultural-image-shell')
  if (!shell) {
    shell = document.createElement('div')
    shell.className = ['cultural-image-shell', shellClass].filter(Boolean).join(' ')
    image.parentElement.insertBefore(shell, image)
    shell.appendChild(image)
    shell.insertAdjacentHTML('beforeend', renderCulturalLoaderMarkup(loadingLabel))
  } else if (shellClass) {
    shellClass.split(/\s+/).filter(Boolean).forEach((name) => shell.classList.add(name))
  }

  shell.querySelector('.cultural-loader-text')?.replaceChildren(document.createTextNode(loadingLabel))
  return shell
}

function setDeferredImage(
  image,
  targetSrc,
  {
    srcCandidates = [],
    alt = '',
    shellClass = '',
    loadingLabel = '纹样载入中',
    fallbackText = ''
  } = {}
) {
  if (!image) return Promise.resolve(false)

  const shell = ensureCulturalImageShell(image, { shellClass, loadingLabel })
  const resolvedSrc = typeof targetSrc === 'string' ? (targetSrc || image.dataset.deferredSrc || '') : (image.dataset.deferredSrc || '')
  let datasetCandidates = []
  try {
    datasetCandidates = JSON.parse(image.dataset.deferredCandidates || '[]')
  } catch {
    datasetCandidates = []
  }
  const resolvedCandidates = [...srcCandidates, ...datasetCandidates, resolvedSrc]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
  const safeFallbackText = fallbackText || alt || '非遗剪纸纹样'

  image.dataset.deferredSrc = resolvedSrc
  image.dataset.deferredCandidates = JSON.stringify(resolvedCandidates)
  image.dataset.loadingLabel = loadingLabel
  if (alt) {
    image.alt = alt
  }

  shell?.classList.add('is-loading')
  shell?.classList.remove('is-loaded', 'is-error')
  image.classList.remove('is-ready')

  if (!resolvedCandidates.length) {
    image.src = PLACEHOLDER_SVG(720, 720, safeFallbackText)
    image.classList.add('is-ready')
    shell?.classList.remove('is-loading')
    shell?.classList.add('is-loaded', 'is-error')
    return Promise.resolve(false)
  }

  const token = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  image.dataset.loadToken = token

  return new Promise((resolve) => {
    const finalize = (didLoad, loadedSrc = '') => {
      if (image.dataset.loadToken !== token) {
        resolve(false)
        return
      }

      image.src = didLoad ? loadedSrc : PLACEHOLDER_SVG(720, 720, safeFallbackText)
      image.classList.add('is-ready')
      shell?.classList.remove('is-loading')
      shell?.classList.add('is-loaded')
      shell?.classList.toggle('is-error', !didLoad)
      resolve(didLoad)
    }

    const tryLoadAt = (index) => {
      if (index >= resolvedCandidates.length) {
        finalize(false)
        return
      }

      const candidateSrc = resolvedCandidates[index]
      const preloader = new Image()
      preloader.decoding = 'async'
      preloader.onload = () => finalize(true, candidateSrc)
      preloader.onerror = () => tryLoadAt(index + 1)
      preloader.src = candidateSrc

      if (preloader.complete) {
        if (preloader.naturalWidth > 0) {
          finalize(true, candidateSrc)
        } else {
          tryLoadAt(index + 1)
        }
      }
    }

    tryLoadAt(0)
  })
}

function hydrateDeferredImages(root = document) {
  const images = root?.matches?.('img[data-deferred-src]')
    ? [root]
    : [...(root?.querySelectorAll?.('img[data-deferred-src]') || [])]

  images.forEach((image) => {
    let srcCandidates = []
    try {
      srcCandidates = JSON.parse(image.dataset.deferredCandidates || '[]')
    } catch {
      srcCandidates = []
    }

    setDeferredImage(image, image.dataset.deferredSrc, {
      srcCandidates,
      alt: image.alt,
      loadingLabel: image.dataset.loadingLabel || '纹样载入中',
      fallbackText: image.alt || '非遗剪纸纹样'
    }).catch(() => {})
  })
}

function resetAiResultPanel() {
  if (!aiResult) return
  aiResult.innerHTML = `
    <div class="empty-state tall">
      <p>填写左侧描述后，这里会展示作品名称、简介、讲解词和生成的纹案图片。</p>
    </div>
  `
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function renderAiLoadingState({ visibleSteps = ['meta'], activeStep = 'meta', completedSteps = [] } = {}) {
  if (!aiResult) return

  const completed = new Set(completedSteps)
  const stepsMarkup = visibleSteps
    .map((key) => {
      const step = AI_LOADING_STEPS[key]
      if (!step) return ''

      const status = completed.has(key) ? 'done' : key === activeStep ? 'loading' : 'waiting'
      const statusText = status === 'done'
        ? '已完成'
        : status === 'loading'
          ? '进行中'
          : '等待中'

      return `
        <li class="ai-task-item ai-task-item-${status}">
          <span class="ai-task-indicator ai-task-indicator-${status}" aria-hidden="true">
            ${status === 'done'
              ? `
                <svg viewBox="0 0 20 20" class="ai-task-check">
                  <path d="M4.5 10.5 8.2 14 15.5 6.5" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              `
              : status === 'loading'
                ? '<span class="ai-task-spinner"></span>'
                : '<span class="ai-task-dot"></span>'}
          </span>
          <div class="ai-task-body">
            <div class="ai-task-row">
              <strong>${escapeHtml(step.title)}</strong>
              <span>${escapeHtml(statusText)}</span>
            </div>
            <p>${escapeHtml(step.detail)}</p>
          </div>
        </li>
      `
    })
    .join('')

  const activeTitle = AI_LOADING_STEPS[activeStep]?.title || '正在生成中'

  aiResult.innerHTML = `
    <section class="ai-loading-card" aria-live="polite">
      <div class="ai-loading-visual">
        <figure class="ai-cut-scene" aria-hidden="true">
          <div class="ai-paper">
            <span class="ai-paper-main"></span>
            <span class="ai-paper-offcut"></span>
          </div>
          <div class="ai-scissors">
            <span class="ai-scissor-arm ai-scissor-arm-top"></span>
            <span class="ai-scissor-arm ai-scissor-arm-bottom"></span>
            <span class="ai-scissor-pivot"></span>
          </div>
        </figure>
        <div class="ai-loading-copy">
          <p class="eyebrow">AI 生成中</p>
          <h3>正在生成剪纸纹案</h3>
          <p>${escapeHtml(activeTitle)}，请稍候。</p>
        </div>
      </div>
      <div class="ai-task-board">
        <div class="ai-task-board-head">
          <strong>当前任务</strong>
          <span>完成一个任务后会自动进入下一步</span>
        </div>
        <ol class="ai-task-list">
          ${stepsMarkup}
        </ol>
      </div>
    </section>
  `
}

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatSolarDate(date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function formatLunarDate(date) {
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric'
    })
    const parts = formatter.formatToParts(date)
    const month = parts.find((part) => part.type === 'month')?.value || ''
    const dayNumber = Number(parts.find((part) => part.type === 'day')?.value || '')
    const day = LUNAR_DAY_NAMES[dayNumber] || ''
    return month && day ? `农历${month}${day}` : ''
  } catch {
    return ''
  }
}

function getSolarTermDay(year, index) {
  const yearWithinCentury = year % 100
  const coefficient = SOLAR_TERMS[index]?.coefficient || 0
  return Math.floor(yearWithinCentury * 0.2422 + coefficient) - Math.floor((yearWithinCentury - 1) / 4)
}

function getCurrentSolarTerm(date) {
  const year = date.getFullYear()
  const currentTerm = SOLAR_TERMS
    .map((term, index) => ({
      name: term.name,
      date: new Date(year, term.month - 1, getSolarTermDay(year, index), 12)
    }))
    .filter((term) => date >= term.date)
    .pop()

  return currentTerm?.name || '冬至'
}

function renderHeaderMeta() {
  if (!solarDateLabel || !lunarDateLabel || !solarTermLabel) return

  const now = new Date()
  solarDateLabel.textContent = formatSolarDate(now)
  lunarDateLabel.textContent = formatLunarDate(now) || '农历日期'
  solarTermLabel.textContent = `节气·${getCurrentSolarTerm(now)}`
}

function normalizeAssetUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('/')) return url
  return `/${String(url).replace(/^\.\//, '').replace(/^\/+/, '')}`
}

function parseCsvRows(text) {
  const rows = []
  let current = ''
  let row = []
  let inQuotes = false
  const source = String(text || '').replace(/^\uFEFF/, '')

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current)
      if (row.some((cell) => String(cell).trim())) {
        rows.push(row)
      }
      row = []
      current = ''
      continue
    }

    current += char
  }

  row.push(current)
  if (row.some((cell) => String(cell).trim())) {
    rows.push(row)
  }

  if (!rows.length) return []
  const headers = rows[0].map((header) => String(header || '').trim())

  return rows.slice(1).map((values) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = String(values[index] ?? '').replace(/\u00A0/g, ' ').trim()
    })
    return record
  })
}

function parseReportDate(input) {
  const value = String(input || '').replace(/\u00A0/g, ' ').trim()
  const match = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
  if (!match) return null

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  )

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getReportCategory(record) {
  return /转载/.test(String(record['简介'] || '')) ? '转载' : '原创'
}

function buildReportSummary(record) {
  const summary = String(record['简介'] || '').trim()
  if (summary && summary !== '转载') return summary

  const platform = String(record['平台'] || '相关平台').trim()
  const mediaType = String(record['种类(图文/视频)'] || '图文').trim()
  const author = String(record['作者'] || '').trim()

  return author
    ? `${platform}发布的${mediaType}内容，记录了${author}与项目相关的传播动态。`
    : `${platform}发布的${mediaType}内容，记录了项目相关的社会传播与关注情况。`
}

function resolveReportImage(article, fallbackIndex = 0) {
  const matchSource = `${article.title || ''} ${article.summary || ''}`
  const matched = REPORT_IMAGE_RULES.find((rule) => rule.pattern.test(matchSource))
  const fallbackPath = REPORT_HOME_IMAGE_PATHS[fallbackIndex % REPORT_HOME_IMAGE_PATHS.length] || REPORT_HOME_IMAGE_PATHS[0]
  return encodeURI(normalizeAssetUrl(matched?.path || fallbackPath))
}

function buildReportImageCandidates(article, fallbackIndex = 0) {
  const fileBases = [
    article.title,
    article.platform.includes('央视网') ? '央视网用图' : ''
  ].map((item) => String(item || '').trim()).filter(Boolean)

  const directories = ['/report/首页用图', '/report']
  const extensions = ['png', 'jpg', 'jpeg', 'webp']
  const candidates = []

  fileBases.forEach((baseName) => {
    directories.forEach((directory) => {
      extensions.forEach((extension) => {
        candidates.push(encodeURI(`${directory}/${baseName}.${extension}`))
      })
    })
  })

  candidates.push(resolveReportImage(article, fallbackIndex))

  return candidates.filter((item, index, list) => list.indexOf(item) === index)
}

function getReportPriority(article) {
  let score = 0
  if (article.platform.includes('央视网')) score += 1000
  if (article.platform.includes('全国高校思想政治教育网')) score += 300
  if (article.category === '原创') score += 60
  if (article.platform.includes('公众号')) score += 20
  return score
}

function sortReportEntries(entries) {
  return [...entries].sort((left, right) =>
    (right.priorityScore - left.priorityScore) ||
    (right.timestamp - left.timestamp) ||
    right.title.localeCompare(left.title, 'zh-CN')
  )
}

function getPinnedReport() {
  return sortReportEntries(reportArticles).find((article) => article.platform.includes('央视网')) || sortReportEntries(reportArticles)[0] || null
}

function selectHomeReportList(entries, pinned) {
  const pool = sortReportEntries(entries.filter((article) => article.id !== pinned?.id))
  const selected = []
  const selectedIds = new Set()

  const pickFirst = (matcher) => {
    const matched = pool.find((article) => !selectedIds.has(article.id) && matcher(article))
    if (!matched) return
    selected.push(matched)
    selectedIds.add(matched.id)
  }

  pickFirst((article) =>
    /国庆剪纸活动|剪纸活动|活动圆满落幕|活动落幕/u.test(article.title) ||
    /活动落幕|圆满完成推文/u.test(article.summary)
  )

  pickFirst((article) => /校史馆|社会科学普及宣传周/u.test(article.title))

  pickFirst((article) =>
    /报名推文/u.test(article.summary) ||
    /^“易”心共庆，剪绎同心$/u.test(article.title)
  )

  for (const article of pool) {
    if (selected.length >= 3) break
    if (selectedIds.has(article.id)) continue
    selected.push(article)
    selectedIds.add(article.id)
  }

  return selected
}

function buildReportEntry(record, index) {
  const publishedAt = parseReportDate(record['发布时间'])
  const category = getReportCategory(record)
  const title = String(record['标题'] || `资讯 ${index + 1}`).trim()
  const platform = String(record['平台'] || '相关平台').trim() || '相关平台'
  const mediaType = String(record['种类(图文/视频)'] || '图文').trim() || '图文'
  const author = String(record['作者'] || '').trim() || platform
  const externalUrl = /^https?:\/\//.test(String(record['链接'] || '').trim()) ? String(record['链接']).trim() : '#'
  const article = {
    id: `report_${index + 1}`,
    title,
    category,
    platform,
    author,
    mediaType,
    externalUrl,
    summary: buildReportSummary(record),
    rawDate: String(record['发布时间'] || '').trim(),
    publishedAt: publishedAt?.toISOString() || '',
    timestamp: publishedAt?.getTime() || 0
  }

  article.priorityScore = getReportPriority(article)
  article.imageUrl = resolveReportImage(article, index)
  article.imageCandidates = buildReportImageCandidates(article, index)
  article.isPinned = article.platform.includes('央视网')
  return article
}

function getReportDateLabel(article) {
  return article.publishedAt ? formatDate(article.publishedAt) : (article.rawDate || '暂无时间')
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

async function hydrateLocalPatternImages() {
  const patternsWithLocalImages = state.patterns.filter((pattern) => pattern.imageStorageKey)

  await Promise.all(patternsWithLocalImages.map(async (pattern) => {
    const localImageUrl = await readLocalImage(pattern.imageStorageKey).catch(() => '')
    if (localImageUrl) {
      pattern.imageUrl = localImageUrl
    }
  }))

  state.products = state.products.map((product) => {
    const linkedPattern = state.patterns.find((pattern) => pattern.id === product.patternId)
    if (linkedPattern?.imageUrl) {
      return {
        ...product,
        imageUrl: linkedPattern.imageUrl
      }
    }

    return product
  })

  if (state.aiDraft?.imageStorageKey) {
    const localDraftImage = await readLocalImage(state.aiDraft.imageStorageKey).catch(() => '')
    if (localDraftImage) {
      state.aiDraft.imageUrl = localDraftImage
    }
  }
}

async function fetchLocalJson(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`无法读取 ${path}`)
  }
  return response.json()
}

async function fetchLocalText(path) {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`无法读取 ${path}`)
  }
  return response.text()
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

async function bootstrapLocalReports() {
  try {
    const csvText = await fetchLocalText('/report/report.csv')
    const rows = parseCsvRows(csvText)
    reportArticles = rows
      .map(buildReportEntry)
      .filter((article) => article.title && article.externalUrl !== '#')
  } catch (error) {
    reportArticles = []
    console.warn('本地资讯数据读取失败，继续使用空资讯列表。', error)
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
      ${renderDeferredImageMarkup({
        src: pattern.imageUrl,
        alt: pattern.title,
        className: 'pattern-card-image',
        shellClass: 'pattern-card-media',
        loadingLabel: '热门纹样载入中'
      })}
      <div class="pattern-card-info">
        <p class="pattern-card-source">${pattern.sourceType === 'ai' ? 'AI 生成' : '自主上传'}</p>
        <h4 class="pattern-card-title">${escapeHtml(pattern.title)}</h4>
        <p class="pattern-card-desc">${escapeHtml(pattern.description || '待补充作品简介')}</p>
      </div>
    </article>
  `).join('')

  hydrateDeferredImages(container)
}

function renderHomeReportSpotlight(article) {
  return `
    <article class="report-feature-card report-feature-card-home ${article.isPinned ? 'is-cctv' : ''}">
      <div class="report-feature-visual">
        ${renderDeferredImageMarkup({
          src: article.imageUrl,
          srcCandidates: article.imageCandidates,
          alt: article.title,
          className: 'report-feature-image',
          shellClass: 'report-feature-image-shell',
          loadingLabel: '重点报道载入中'
        })}
      </div>
      <div class="report-feature-content">
        <p class="eyebrow">${article.isPinned ? '重点报道 · 央视网' : `重点报道 · ${escapeHtml(article.platform)}`}</p>
        <h3>${escapeHtml(article.title)}</h3>
        <div class="report-meta-row">
          <span>${escapeHtml(article.category)}</span>
          <span>${escapeHtml(article.mediaType)}</span>
          <span>${escapeHtml(getReportDateLabel(article))}</span>
        </div>
        <a class="report-detail-link" href="${escapeHtml(article.externalUrl)}" target="_blank" rel="noreferrer noopener">
          <span>详情</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  `
}

function renderHomeReportCard(article) {
  return `
    <article class="home-report-card">
      <div class="home-report-card-visual">
        ${renderDeferredImageMarkup({
          src: article.imageUrl,
          srcCandidates: article.imageCandidates,
          alt: article.title,
          className: 'home-report-card-image',
          shellClass: 'home-report-image-shell',
          loadingLabel: '资讯图片载入中'
        })}
      </div>
      <div class="home-report-card-content">
        <div class="report-card-top">
          <span class="pill">${escapeHtml(article.category)}</span>
          <span class="report-card-date">${escapeHtml(getReportDateLabel(article))}</span>
        </div>
        <h4>${escapeHtml(article.title)}</h4>
        <div class="report-card-meta">
          <span>${escapeHtml(article.platform)}</span>
          <span>${escapeHtml(article.mediaType)}</span>
        </div>
        <a class="report-detail-link" href="${escapeHtml(article.externalUrl)}" target="_blank" rel="noreferrer noopener">
          <span>详情</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  `
}

function renderHomeReports() {
  const spotlight = document.getElementById('homeReportSpotlight')
  const list = document.getElementById('homeReports')
  if (!spotlight || !list) return

  const pinned = getPinnedReport()
  const rest = selectHomeReportList(reportArticles, pinned)

  spotlight.innerHTML = pinned
    ? renderHomeReportSpotlight(pinned)
    : '<div class="empty-state"><p>资讯报道整理中，稍后会在这里展示最新传播动态。</p></div>'

  list.innerHTML = rest.length
    ? rest.map(renderHomeReportCard).join('')
    : '<div class="empty-state small"><p>暂时还没有更多资讯条目。</p></div>'

  hydrateDeferredImages(spotlight)
  hydrateDeferredImages(list)
}

function renderReportCard(article) {
  return `
    <article class="report-card ${article.platform.includes('央视网') ? 'is-cctv' : ''}">
      <div class="report-card-top">
        <span class="pill">${escapeHtml(article.platform)}</span>
        <span class="report-card-date">${escapeHtml(getReportDateLabel(article))}</span>
      </div>
      <div class="report-card-visual">
        ${renderDeferredImageMarkup({
          src: article.imageUrl,
          srcCandidates: article.imageCandidates,
          alt: article.title,
          className: 'report-card-image',
          shellClass: 'report-card-image-shell',
          loadingLabel: '资讯配图载入中'
        })}
      </div>
      <h3 class="report-card-title">${escapeHtml(article.title)}</h3>
      <div class="report-card-bottom">
        <div class="report-card-meta">
          <span>${escapeHtml(article.category)}</span>
          <span>${escapeHtml(article.mediaType)}</span>
          <span>${escapeHtml(article.author)}</span>
        </div>
        <a class="report-detail-link" href="${escapeHtml(article.externalUrl)}" target="_blank" rel="noreferrer noopener">
          <span>详情</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  `
}

function renderReportsPage() {
  const featureContainer = document.getElementById('reportFeature')
  const originalContainer = document.getElementById('originalReports')
  const syndicatedContainer = document.getElementById('syndicatedReports')
  const originalCount = document.getElementById('originalReportCount')
  const syndicatedCount = document.getElementById('syndicatedReportCount')
  if (!featureContainer || !originalContainer || !syndicatedContainer || !originalCount || !syndicatedCount) return

  const pinned = getPinnedReport()
  const originalReports = sortReportEntries(reportArticles.filter((article) => article.category === '原创'))
  const syndicatedReports = sortReportEntries(reportArticles.filter((article) => article.category === '转载' && article.id !== pinned?.id))
  const syndicatedTotal = syndicatedReports.length + (pinned?.category === '转载' ? 1 : 0)

  originalCount.textContent = `${originalReports.length} 篇`
  syndicatedCount.textContent = pinned?.category === '转载'
    ? `${syndicatedTotal} 篇（含重点报道）`
    : `${syndicatedReports.length} 篇`

  featureContainer.innerHTML = pinned
    ? renderHomeReportSpotlight(pinned)
    : '<div class="empty-state"><p>重点报道整理中，稍后会在这里展示。</p></div>'

  originalContainer.innerHTML = originalReports.length
    ? originalReports.map(renderReportCard).join('')
    : '<div class="empty-state small"><p>原创报道整理中。</p></div>'

  syndicatedContainer.innerHTML = syndicatedReports.length
    ? syndicatedReports.map(renderReportCard).join('')
    : '<div class="empty-state small"><p>转载报道整理中。</p></div>'

  hydrateDeferredImages(featureContainer)
  hydrateDeferredImages(originalContainer)
  hydrateDeferredImages(syndicatedContainer)
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
        ${renderDeferredImageMarkup({
          src: pattern.imageUrl,
          alt: pattern.title,
          className: 'pattern-card-image',
          shellClass: 'pattern-card-media',
          loadingLabel: '纹样载入中'
        })}
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

  hydrateDeferredImages(aiContainer)
  hydrateDeferredImages(uploadContainer)
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
      ${renderDeferredImageMarkup({
        src: product.imageUrl,
        alt: product.title,
        className: 'product-card-image',
        shellClass: 'product-card-media',
        loadingLabel: '商品图片载入中'
      })}
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

  hydrateDeferredImages(container)
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
        <button class="creator-card-link" id="viewCreatorDetailBtn" aria-label="查看创作者详情">
          <span>详情</span>
          <span class="creator-card-link-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>
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
          <button
            class="btn-tiny recent-work-action"
            data-action="detail"
            data-id="${pattern.id}"
            aria-label="查看详情"
            title="查看详情"
          >
            <span class="recent-work-action-icon" aria-hidden="true">${getActionIcon('detail')}</span>
            <span class="recent-work-action-label">详情</span>
          </button>
          <button
            class="btn-tiny recent-work-action"
            data-action="shelf"
            data-id="${pattern.id}"
            aria-label="${pattern.onShelf ? '修改价格' : '放入货架'}"
            title="${pattern.onShelf ? '修改价格' : '放入货架'}"
          >
            <span class="recent-work-action-icon" aria-hidden="true">${getActionIcon(pattern.onShelf ? 'price' : 'shelf')}</span>
            <span class="recent-work-action-label">${pattern.onShelf ? '价格' : '上架'}</span>
          </button>
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
  setDeferredImage(image, current.imageUrl, {
    alt: current.title,
    shellClass: 'carousel-image-shell',
    loadingLabel: '轮播纹样载入中',
    fallbackText: current.title
  }).catch(() => {})
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
  mobileNavItems.forEach((item) => item.classList.toggle('is-active', item.dataset.target === pageId))

  if (pageId === 'creator-detail') {
    navItems.forEach((item) => item.classList.toggle('active', item.dataset.target === 'creator'))
    mobileNavItems.forEach((item) => item.classList.toggle('is-active', item.dataset.target === 'creator'))
  }
}

function openMobileNav() {
  navDrawer?.classList.remove('hidden')
  navDrawerBackdrop?.classList.remove('hidden')
  navDrawer?.setAttribute('aria-hidden', 'false')
  navToggle?.setAttribute('aria-expanded', 'true')
}

function closeMobileNav() {
  navDrawer?.classList.add('hidden')
  navDrawerBackdrop?.classList.add('hidden')
  navDrawer?.setAttribute('aria-hidden', 'true')
  navToggle?.setAttribute('aria-expanded', 'false')
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

async function removePattern(patternId) {
  const pattern = getPatternById(patternId)
  if (!pattern) return false

  if (pattern.imageBlobKey) {
    await api.deletePatternBlob(pattern.imageBlobKey)
  }
  if (pattern.imageStorageKey) {
    await deleteLocalImage(pattern.imageStorageKey).catch(() => {})
  }

  state.patterns = state.patterns.filter((item) => item.id !== patternId)
  state.products = state.products.filter((product) => product.patternId !== patternId)
  if (activePatternId === patternId) {
    activePatternId = null
  }
  document.getElementById('patternModalOverlay')?.remove()
  saveAppState()
  rerender()
  showToast(`《${pattern.title}》已删除。`)
  return true
}

function rerender() {
  renderFeaturedPatterns()
  renderHomeReports()
  renderReportsPage()
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
          ${renderDeferredImageMarkup({
            src: pattern.imageUrl,
            alt: pattern.title,
            className: 'detail-image',
            shellClass: 'detail-image-shell',
            loadingLabel: '作品细节载入中'
          })}
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
  hydrateDeferredImages(overlay)

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
          removePattern(pattern.id).catch((error) => {
            showToast(error.message || '删除作品失败，请稍后重试。', { type: 'error', duration: 2800 })
          })
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

  const imageStorageKey = uploaded.fallback
    ? await saveLocalImage(uploaded.imageUrl || base64).catch(() => '')
    : ''

  const newPattern = createPatternRecord({
    title: file.name.replace(/\.[^.]+$/, ''),
    description: '自主上传的非遗剪纸纹样作品，等待补充更多讲解信息。',
    explanation: '上传作品已进入剪纸纹样库，可继续完善名称、简介和货架价格。',
    imageUrl: uploaded.imageUrl || base64,
    imageBlobKey: uploaded.imageBlobKey || '',
    imageStorageKey,
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
  const uploadMessage = uploaded.fallback
    ? `已导入作品《${escapeHtml(newPattern.title)}》，当前为本地导入模式，刷新页面前建议尽快完善或保存。`
    : `已导入作品《${escapeHtml(newPattern.title)}》，现在可以继续编辑或上架。`
  uploadResult.innerHTML = `<p class="inline-feedback success">${uploadMessage}</p>`
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
  renderAiLoadingState({
    visibleSteps: ['meta'],
    activeStep: 'meta',
    completedSteps: []
  })

  try {
    const meta = await api.generatePatternMeta(fields)
    renderAiLoadingState({
      visibleSteps: ['meta', 'image'],
      activeStep: 'image',
      completedSteps: ['meta']
    })

    const image = await api.generatePatternImage(meta.image_prompt)
    renderAiLoadingState({
      visibleSteps: ['meta', 'image', 'finalize'],
      activeStep: 'finalize',
      completedSteps: ['meta', 'image']
    })

    await wait(32)

    const previewUrl = image.imageUrl || `data:${image.mimeType};base64,${image.imageBase64}`
    const defaultAiPrice = 99

    state.aiDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: meta.title,
      description: meta.description,
      explanation: meta.explanation,
      prompt: meta.image_prompt,
      imageUrl: previewUrl,
      imageBlobKey: image.imageBlobKey || '',
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
          ${renderDeferredImageMarkup({
            src: previewUrl,
            alt: meta.title,
            className: 'ai-result-image',
            shellClass: 'ai-result-image-shell',
            loadingLabel: '生成结果载入中'
          })}
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
    hydrateDeferredImages(aiResult)

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
        imageBlobKey: state.aiDraft.imageBlobKey,
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
              imageBlobKey: savedPattern.imageBlobKey,
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

  mobileNavItems.forEach((item) => {
    item.addEventListener('click', () => {
      showPage(item.dataset.target)
      closeMobileNav()
    })
  })

  navToggle?.addEventListener('click', () => {
    if (navDrawer?.classList.contains('hidden')) {
      openMobileNav()
      return
    }
    closeMobileNav()
  })

  navDrawerClose?.addEventListener('click', closeMobileNav)
  navDrawerBackdrop?.addEventListener('click', closeMobileNav)

  document.getElementById('featuredGalleryMore')?.addEventListener('click', (event) => {
    event.preventDefault()
    showPage('gallery')
    closeMobileNav()
  })

  document.getElementById('reportMoreLink')?.addEventListener('click', (event) => {
    event.preventDefault()
    showPage('report')
    closeMobileNav()
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
        onConfirm: () => {
          removePattern(pattern.id).catch((error) => {
            showToast(error.message || '删除作品失败，请稍后重试。', { type: 'error', duration: 2800 })
          })
        }
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
  renderHeaderMeta()
  await hydrateLocalPatternImages()
  await bootstrapFromServer()
  await bootstrapLocalAssets()
  await bootstrapLocalReports()

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
