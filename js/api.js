// 简单的 API 封装（占位）
const BASE = '/.netlify/functions'

export async function getPatterns(){
  const res = await fetch(`${BASE}/pattern-list`)
  return res.json()
}

export default { getPatterns }
