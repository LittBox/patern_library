import { readStore } from './storage.js'

export async function getPatternList() {
  return readStore()
}
