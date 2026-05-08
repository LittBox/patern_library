import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'

import { generateMeta } from './ai-generate-meta.js'
import { generateImage } from './ai-generate-image.js'
import { uploadPatternImage } from './pattern-upload.js'
import { getPatternList } from './pattern-list.js'
import { savePattern } from './ai-save-pattern.js'
import { deleteImageFile, getUploadDir } from './storage.js'

dotenv.config()

const app = express()
const ROOT = path.resolve(process.cwd())
const PORT = Number(process.env.PORT || 8888)

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/uploads', express.static(getUploadDir()))
app.use(express.static(ROOT))

app.post('/api/generate-meta', async (req, res) => {
  try {
    const result = await generateMeta(req.body || {})
    res.json({ success: true, data: result.data, fallback: result.fallback, message: result.message })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/ai-generate-image', async (req, res) => {
  try {
    const result = await generateImage(req.body || {})
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/pattern-upload', async (req, res) => {
  try {
    const result = await uploadPatternImage(req.body || {})
    res.json({ success: true, ...result })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

app.post('/api/pattern', async (req, res) => {
  try {
    const pattern = await savePattern(req.body?.pattern)
    res.json({ success: true, pattern })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
})

app.get('/api/pattern-list', async (_req, res) => {
  try {
    const store = await getPatternList()
    res.json({ success: true, ...store })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.post('/api/delete-blob', async (req, res) => {
  try {
    const key = req.body?.key || ''
    if (!key) {
      res.status(400).json({ success: false, message: '缺少 Blob key' })
      return
    }

    const deleted = await deleteImageFile(key)
    res.json({ success: true, deleted, key })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok' })
})

app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`[server] running at http://localhost:${PORT}`)
})