import { updateStore } from './storage.js'

export async function savePattern(pattern) {
  if (!pattern) {
    throw new Error('缺少 pattern 数据')
  }

  const now = new Date().toISOString()

  const updated = await updateStore((store) => {
    const patterns = Array.isArray(store.patterns) ? store.patterns : []
    const existingIndex = patterns.findIndex((item) => item.id === pattern.id)

    if (existingIndex >= 0) {
      patterns[existingIndex] = {
        ...patterns[existingIndex],
        ...pattern,
        updatedAt: now
      }
    } else {
      patterns.unshift({
        ...pattern,
        updatedAt: now,
        createdAt: pattern.createdAt || now
      })
    }

    return {
      ...store,
      patterns
    }
  })

  const saved = updated.patterns.find((item) => item.id === pattern.id) || pattern
  return {
    ...saved,
    updatedAt: now
  }
}
