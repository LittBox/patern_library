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

global.fetch = async (url) => {
  const target = String(url)
  if (target.includes('/.netlify/functions/pattern-list')) {
    return { ok: true, json: async () => ({ success: true, patterns: [], products: [], creator: null }) }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}

await import(`file://${path.join(root, 'js', 'app.js')}`)
await new Promise((resolve) => setTimeout(resolve, 80))

const initialProducts = document.querySelectorAll('.product-card').length
console.log('initial products:', initialProducts)

const shelfBtn = document.querySelector('[data-action="shelf"]')
shelfBtn?.click()
await new Promise((resolve) => setTimeout(resolve, 50))
document.querySelector('#miniPatternPrice').value = '188'
document.querySelector('[data-mini-action="save"]')?.click()
await new Promise((resolve) => setTimeout(resolve, 50))

const afterShelfProducts = document.querySelectorAll('.product-card').length
console.log('products after shelf:', afterShelfProducts)

const priceBtn = document.querySelector('[data-product-action="price"]')
priceBtn?.click()
await new Promise((resolve) => setTimeout(resolve, 50))
document.querySelector('#miniProductPrice').value = '88'
document.querySelector('[data-mini-action="save"]')?.click()
await new Promise((resolve) => setTimeout(resolve, 50))
console.log('first product price:', document.querySelector('.product-price')?.textContent || '')

const revokeBtn = document.querySelector('[data-product-action="revoke"]')
revokeBtn?.click()
await new Promise((resolve) => setTimeout(resolve, 50))
document.querySelector('[data-mini-action="confirm"]')?.click()
await new Promise((resolve) => setTimeout(resolve, 50))
console.log('products after revoke:', document.querySelectorAll('.product-card').length)

window.close()
process.exit(0)
