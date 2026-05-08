import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../..')
const DATA_DIR = path.join(ROOT_DIR, 'server-data')
const DATA_FILE = path.join(DATA_DIR, 'patterns.json')

const DEFAULT_DATA = {
  patterns: [],
  products: [],
  creator: {
    id: 'creator_001',
    name: '默认创作者',
    avatar: '',
    bio: '专注民族纹案与文创设计',
    joinedAt: '2026-03-28T12:00:00.000Z'
  }
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8')
  }
}

async function readData() {
  await ensureDataFile()
  const text = await fs.readFile(DATA_FILE, 'utf-8')
  return JSON.parse(text)
}

async function writeData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export async function getPatternList() {
  return readData()
}

export async function savePattern(pattern) {
  if (!pattern) {
    throw new Error('缺少 pattern 数据')
  }

  const data = await readData()
  const nextPattern = {
    ...pattern,
    updatedAt: new Date().toISOString()
  }

  const index = data.patterns.findIndex((item) => item.id === nextPattern.id)

  if (index >= 0) {
    data.patterns[index] = nextPattern
  } else {
    data.patterns.unshift(nextPattern)
  }

  if (nextPattern.onShelf && typeof nextPattern.price === 'number') {
    const product = {
      id: `prod_${nextPattern.id}`,
      patternId: nextPattern.id,
      title: nextPattern.title,
      description: nextPattern.description || '',
      price: nextPattern.price,
      imageUrl: nextPattern.imageUrl,
      status: 'on_shelf',
      createdAt: nextPattern.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const productIndex = data.products.findIndex((item) => item.patternId === nextPattern.id)

    if (productIndex >= 0) {
      data.products[productIndex] = product
    } else {
      data.products.unshift(product)
    }
  }

  await writeData(data)
  return nextPattern
}