import api from './api.js'
import { state } from './state.js'

function initNavigation(){
  const nav = document.querySelectorAll('.nav li')
  const pages = document.querySelectorAll('.page')

  function showSection(id){
    pages.forEach(p=> {
      if(p.id === id){
        p.classList.remove('hidden')
      } else {
        p.classList.add('hidden')
      }
    })
    // 更新导航栏 active 状态
    nav.forEach(item=> {
      if(item.dataset.target === id){
        item.classList.add('active')
      } else {
        item.classList.remove('active')
      }
    })
  }

  nav.forEach(item=>{
    item.addEventListener('click', (e)=> {
      e.preventDefault()
      showSection(item.dataset.target)
    })
  })

  // 初始显示首页
  showSection('home')
  return showSection
}

// ===== 首页轮播图初始化 =====
const carouselImages = [
  'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1577720643272-265f434884f0?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1618183479302-1461ae109a25?w=600&h=800&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8e7b9b19?w=600&h=800&fit=crop'
]

let currentCarouselIndex = 0

function initCarousel(){
  const carouselImage = document.getElementById('carouselImage')
  const carouselPrev = document.querySelector('.carousel-prev')
  const carouselNext = document.querySelector('.carousel-next')
  const dots = document.querySelectorAll('.dot')

  if(!carouselImage) return

  function updateCarousel(index){
    currentCarouselIndex = (index + carouselImages.length) % carouselImages.length
    carouselImage.src = carouselImages[currentCarouselIndex]
    
    dots.forEach((dot, i)=> {
      if(i === currentCarouselIndex){
        dot.classList.add('active')
      } else {
        dot.classList.remove('active')
      }
    })
  }

  carouselPrev.addEventListener('click', ()=> updateCarousel(currentCarouselIndex - 1))
  carouselNext.addEventListener('click', ()=> updateCarousel(currentCarouselIndex + 1))

  dots.forEach((dot, i)=> {
    dot.addEventListener('click', ()=> updateCarousel(i))
  })

  // 自动轮播（可选）
  setInterval(()=> {
    updateCarousel(currentCarouselIndex + 1)
  }, 5000)
}

window.addEventListener('load', initCarousel)

// ===== 纹案库功能 =====
function initGallery(){
  const importBtn = document.getElementById('importBtn')
  const fileInput = document.getElementById('fileInput')
  const searchInput = document.getElementById('searchInput')
  const filterSelect = document.getElementById('filterSelect')

// 模拟纹案数据（实际应该从服务器获取）
let patternsData = [
  {
    id: 'p1',
    title: '苗族蝴蝶妈妈纹',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&h=500&fit=crop',
    source: 'ai'
  },
  {
    id: 'p2',
    title: '蓝白几何回纹',
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=400&h=500&fit=crop&blend=https://images.unsplash.com/photo-1618005182384-a83a8e7b9b19?w=400&h=500&fit=crop&blend_mode=color',
    source: 'ai'
  },
  {
    id: 'p3',
    title: '壮族龙凤纹锦',
    image: 'https://images.unsplash.com/photo-1577720643272-265f434884f0?w=400&h=500&fit=crop',
    source: 'upload'
  },
  {
    id: 'p4',
    title: '民族刺绣花纹',
    image: 'https://images.unsplash.com/photo-1618183479302-1461ae109a25?w=400&h=500&fit=crop',
    source: 'ai'
  },
  {
    id: 'p5',
    title: '傣族孔雀纹样',
    image: 'https://images.unsplash.com/photo-1609887217015-f742fe58538f?w=400&h=500&fit=crop',
    source: 'upload'
  },
  {
    id: 'p6',
    title: '藏族吉祥纹',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8e7b9b19?w=400&h=500&fit=crop',
    source: 'ai'
  }
]

function renderPatterns(){
  const aiPatterns = document.getElementById('aiPatterns')
  const uploadPatterns = document.getElementById('uploadPatterns')
  
  if (!aiPatterns || !uploadPatterns) return

  const aiList = patternsData.filter(p => p.source === 'ai')
  const uploadList = patternsData.filter(p => p.source === 'upload')

  aiPatterns.innerHTML = aiList.map(p => `
    <div class="pattern-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
      <div class="pattern-card-info">
        <div class="pattern-card-title">${p.title}</div>
        <p class="pattern-card-source">AI 生成</p>
      </div>
    </div>
  `).join('')

  uploadPatterns.innerHTML = uploadList.map(p => `
    <div class="pattern-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
      <div class="pattern-card-info">
        <div class="pattern-card-title">${p.title}</div>
        <p class="pattern-card-source">自主上传</p>
      </div>
    </div>
  `).join('')
}

// 导入图片按钮
if (importBtn) {
  importBtn.addEventListener('click', () => {
    fileInput.click()
  })
}

// 文件上传处理
if (fileInput) {
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const base64 = await toBase64(file)
      // 模拟上传到纹案库
      const newPattern = {
        id: 'p' + Date.now(),
        title: file.name.split('.')[0],
        image: 'data:' + file.type + ';base64,' + base64,
        source: 'upload'
      }
      patternsData.push(newPattern)
      renderPatterns()
      fileInput.value = ''
    } catch (err) {
      console.error('上传失败:', err)
    }
  })
}

// 搜索和筛选
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase()
    const filtered = patternsData.filter(p => p.title.toLowerCase().includes(keyword))
    
    const aiPatterns = document.getElementById('aiPatterns')
    const uploadPatterns = document.getElementById('uploadPatterns')
    
    if (aiPatterns && uploadPatterns) {
      const aiList = filtered.filter(p => p.source === 'ai')
      const uploadList = filtered.filter(p => p.source === 'upload')

      aiPatterns.innerHTML = aiList.map(p => `
        <div class="pattern-card" data-id="${p.id}">
          <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
          <div class="pattern-card-info">
            <div class="pattern-card-title">${p.title}</div>
            <p class="pattern-card-source">AI 生成</p>
          </div>
        </div>
      `).join('')

      uploadPatterns.innerHTML = uploadList.map(p => `
        <div class="pattern-card" data-id="${p.id}">
          <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
          <div class="pattern-card-info">
            <div class="pattern-card-title">${p.title}</div>
            <p class="pattern-card-source">自主上传</p>
          </div>
        </div>
      `).join('')
    }
  })
}

if (filterSelect) {
  filterSelect.addEventListener('change', (e) => {
    const filter = e.target.value
    let filtered = patternsData

    if (filter === 'ai') {
      filtered = patternsData.filter(p => p.source === 'ai')
    } else if (filter === 'upload') {
      filtered = patternsData.filter(p => p.source === 'upload')
    }

    const aiPatterns = document.getElementById('aiPatterns')
    const uploadPatterns = document.getElementById('uploadPatterns')
    
    if (aiPatterns && uploadPatterns) {
      const aiList = filtered.filter(p => p.source === 'ai')
      const uploadList = filtered.filter(p => p.source === 'upload')

      aiPatterns.innerHTML = aiList.map(p => `
        <div class="pattern-card" data-id="${p.id}">
          <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
          <div class="pattern-card-info">
            <div class="pattern-card-title">${p.title}</div>
            <p class="pattern-card-source">AI 生成</p>
          </div>
        </div>
      `).join('')

      uploadPatterns.innerHTML = uploadList.map(p => `
        <div class="pattern-card" data-id="${p.id}">
          <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
          <div class="pattern-card-info">
            <div class="pattern-card-title">${p.title}</div>
            <p class="pattern-card-source">自主上传</p>
          </d蝴蝶妈妈纹商品',
    price: 99,
    image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&h=500&fit=crop',
    date: '2026-03-28'
  },
  {
    id: 'prod2',
    name: '蓝白几何回纹商品',
    price: 129,
    image: 'https://images.unsplash.com/photo-1577720643272-265f434884f0?w=500&h=500&fit=crop',
    date: '2026-03-27'
  },
  {
    id: 'prod3',
    name: '壮族龙凤纹锦商品',
    price: 149,
    image: 'https://images.unsplash.com/photo-1618183479302-1461ae109a25?w=500&h=500&fit=crop',
    date: '2026-03-26'
  },
  {
    id: 'prod4',
    name: '民族刺绣花纹商品',
    price: 119,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8e7b9b19?w=500&h=500&fit=crop
  {
    id: 'prod3',
    name: '红金对称商品',
    price: 149,
    image: 'https://via.placeholder.com/240x240/c44536/ffffff?text=Product+3',
    date: '2026-03-26'
  },
  {
    id: 'prod4',
    name: '民族花纹商品',
    price: 119,
    image: 'https://via.placeholder.com/240x240/d4a574/ffffff?text=Product+4',
    date: '2026-03-25'
  }
]

function renderProducts(){
  const productsGrid = document.getElementById('productsGrid')
  if (!productsGrid) return

  productsGrid.innerHTML = productsData.map(p => `
    <div class="product-card">
      <img src="${p.image}" alt="${p.name}" class="product-card-image">
      <div class="product-card-content">
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-meta">
          <span class="product-price">¥${p.price}</span>
          <span class="product-date">${p.date}</span>
        </div>
        <div class="product-actions">
          <button class="btn-secondary" onclick="alert('修改价格')">修改价格</button>
          <button class="btn-secondary" onclick="alert('撤回商品')">撤回</button>
        </div>
      </div>
    </div>
  `).join('')
}

const sortSelect = document.getElementById('sortSelect')
if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    const sort = e.target.value
    if (sort === 'price') {
      productsData.sort((a, b) => a.price - b.price)
    } else {
      productsData.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
    renderProducts()
  })
}

// ===== 创作者中心功能 =====
// 创作者数据
const creatorData = {
  name: '民族纹案设计师',
  bio: '热爱传承与创新，专注民族纹案与文创设计，致力于让传统纹样焕发新生',
  joinDate: '2026-03-28'
}

function initCreatorCenter(){
  // 更新创作者信息
  const creatorName = document.getElementById('creatorName')
  const creatorBio = document.getElementById('creatorBio')
  
  if (creatorName) {
    creatorName.textContent = creatorData.name
    creatorBio.textContent = creatorData.bio
  }

  // 更新统计数据
  const totalPatterns = document.getElementById('totalPatterns')
  const aiPatternCount = document.getElementById('aiPatternCount')
  const uploadPatternCount = document.getElementById('uploadPatternCount')
  const publishedProducts = document.getElementById('publishedProducts')
  const unpublishedPatterns = document.getElementById('unpublishedPatterns')
  const monthlyNew = document.getElementById('monthlyNew')

  if (totalPatterns) {
    totalPatterns.textContent = patternsData.length
    aiPatternCount.textContent = patternsData.filter(p => p.source === 'ai').length
    uploadPatternCount.textContent = patternsData.filter(p => p.source === 'upload').length
    publishedProducts.textContent = productsData.length
    unpublishedPatterns.textContent = Math.max(0, patternsData.length - productsData.length)
    monthlyNew.textContent = patternsData.length
  }

  // 更新最近作品
  const recentWorks = document.getElementById('recentWorks')
  if (recentWorks && patternsData.length > 0) {
    const recent = patternsData.slice(-3).reverse()
    recentWorks.innerHTML = recent.map(p => `
      <div class="work-item">
        <span class="work-item-name">${p.title}</span>
        <div class="work-item-actions">
          <button class="btn-tiny" onclick="alert('查看详情: ${p.title}')">详情</button>
          <button class="btn-tiny" onclick="alert('修改信息: ${p.title}')">修改</button>
        </div>
      </div>
    `).join('')
  }

  // 更新运营建议
  const operationTips = document.getElementById('operationTips')
  if (operationTips) {
    const tips = []
    const noDescPatterns = patternsData.filter(p => p.title.length < 10)
    if (noDescPatterns.length > 0) {
      tips.push(`有 ${noDescPatterns.length} 个作品可优化简介`)
    }
    const noSalesProducts = patternsData.filter(p => !productsData.find(prod => prod.id.includes(p.id)))
    if (noSalesProducts.length > 0) {
      tips.push(`有 ${noSalesProducts.length} 个作品未上架，可提高销售曝光`)
    }
    if (tips.length === 0) {
      tips.push('继续保持高质量创作！', '可尝试开发新的纹案风格')
    }
    
    operationTips.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('')
  }
}

async function toBase64(file){
  return new Promise((res,rej)=>{
    const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(file)
  })
}

// AI generate handler
const aiPrompt = document.getElementById('aiPrompt')
const generateBtn = document.getElementById('generateBtn')
const aiResult = document.getElementById('aiResult')

if(generateBtn){
  generateBtn.addEventListener('click', async ()=>{
    aiResult.textContent = '正在生成...'
    const prompt = (aiPrompt.value || '').trim()
    try{
      const resp = await fetch('/.netlify/functions/ai-generate-image', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ prompt })
      })
      const body = await resp.json()
      // if blob info returned by Netlify, show JSON; if base64 returned, show image preview
      if(body.blob){ aiResult.innerText = JSON.stringify(body.blob); return }
      if(body.base64){
        const img = document.createElement('img')
        img.src = 'data:image/png;base64,' + body.base64
        img.style.maxWidth = '320px'
        aiResult.innerHTML = ''
        aiResult.appendChild(img)
        return
      }
      aiResult.textContent = JSON.stringify(body)
    }catch(err){ aiResult.textContent = err.message }
  })
}

// ===== 首页热门推荐 =====
function renderFeaturedPatterns(){
  const featuredGrid = document.getElementById('featuredPatterns')
  if (!featuredGrid) return

  // 取前4个作品作为热门推荐
  const featured = patternsData.slice(0, 4)
  featuredGrid.innerHTML = featured.map(p => `
    <div class="pattern-card" data-id="${p.id}">
      <img src="${p.image}" alt="${p.title}" class="pattern-card-image">
      <div class="pattern-card-info">
        <div class="pattern-card-title">${p.title}</div>
        <p class="pattern-card-source">${p.source === 'ai' ? 'AI 生成' : '自主上传'}</p>
      </div>
    </div>
  `).join('')
}

// ===== 初始化所有模块 =====
function initAll(){
  renderFeaturedPatterns()
  renderPatterns()
  renderProducts()
  initCreatorCenter()
}

// DOM 加载完成后初始化
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation()
    initAll()
  })
} else {
  // 如果脚本在 DOM 加载后执行
  initNavigation()
  initAll()
}
