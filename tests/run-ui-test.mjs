import fs from 'fs'
import path from 'path'
import { JSDOM } from 'jsdom'

const root = path.resolve('.')
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')

const dom = new JSDOM(html, {
  url: 'http://localhost:8080/',
  runScripts: 'outside-only'
})

const { window } = dom
global.window = window
global.document = window.document
global.Element = window.Element
global.localStorage = window.localStorage
global.FileReader = class {
  readAsDataURL() {
    this.result = 'data:image/png;base64,ZmFrZQ=='
    this.onload?.()
  }
}

global.prompt = (message, fallback) => fallback || '测试值'
global.confirm = () => true
global.alert = () => {}
window.prompt = global.prompt
window.confirm = global.confirm
window.alert = global.alert

global.fetch = async (url) => {
  const target = String(url)
  if (target.includes('/.netlify/functions/pattern-list')) {
    return { ok: true, json: async () => ({ success: true, patterns: [], products: [], creator: null }) }
  }
  if (target.includes('/.netlify/functions/ai-generate-meta')) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          title: '测试纹案',
          description: '测试简介',
          image_prompt: '测试提示词',
          explanation: '测试讲解词',
          tags: ['测试', '民族'],
          textModel: 'deepseek-chat'
        }
      })
    }
  }
  if (target.includes('/.netlify/functions/ai-generate-image')) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        imageBase64: 'PHN2Zy8+',
        mimeType: 'image/svg+xml',
        model: 'qwen-image-2.0'
      })
    }
  }
  if (target.includes('/.netlify/functions/ai-save-pattern')) {
    return {
      ok: true,
      json: async () => ({
        success: true,
        pattern: {
          id: 'pt_test_saved',
          title: '测试纹案',
          description: '测试简介',
          explanation: '测试讲解词',
          imageUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
          sourceType: 'ai',
          prompt: '测试提示词',
          tags: ['测试', '民族'],
          onShelf: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}

await import(`file://${path.join(root, 'js', 'app.js')}`)
await new Promise((resolve) => setTimeout(resolve, 80))

const initialCards = document.querySelectorAll('.pattern-card').length
console.log('initial pattern cards:', initialCards)

document.getElementById('themeInput').value = '蝴蝶'
document.getElementById('styleInput').value = '苗族'
document.getElementById('generateBtn').click()

await new Promise((resolve) => setTimeout(resolve, 120))
console.log('ai result exists:', document.querySelector('.ai-result-card') !== null)

document.getElementById('saveAiPatternBtn').click()
await new Promise((resolve) => setTimeout(resolve, 80))

const afterSaveCards = document.querySelectorAll('.pattern-card').length
console.log('pattern cards after save:', afterSaveCards)

const detailBtn = document.querySelector('[data-action="detail"]')
detailBtn?.click()
await new Promise((resolve) => setTimeout(resolve, 30))
console.log('detail modal exists:', document.getElementById('patternModalOverlay') !== null)

window.close()
process.exit(0)
