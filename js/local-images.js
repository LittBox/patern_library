const DB_NAME = 'pattern-library-assets'
const STORE_NAME = 'images'
const DB_VERSION = 1

function withStore(mode, executor) {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error || new Error('打开本地图片仓库失败'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)

      let settled = false
      const finalize = (callback) => (value) => {
        if (settled) return
        settled = true
        callback(value)
      }

      const safeResolve = finalize(resolve)
      const safeReject = finalize(reject)

      transaction.oncomplete = () => {
        db.close()
      }
      transaction.onerror = () => {
        db.close()
        safeReject(transaction.error || new Error('本地图片仓库读写失败'))
      }
      transaction.onabort = () => {
        db.close()
        safeReject(transaction.error || new Error('本地图片仓库操作已中止'))
      }

      try {
        executor(store, safeResolve, safeReject)
      } catch (error) {
        db.close()
        safeReject(error)
      }
    }
  })
}

function createLocalImageKey() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function saveLocalImage(dataUrl, key = createLocalImageKey()) {
  if (!dataUrl) return ''

  await withStore('readwrite', (store, resolve, reject) => {
    const request = store.put(dataUrl, key)
    request.onsuccess = () => resolve(key)
    request.onerror = () => reject(request.error || new Error('保存本地图片失败'))
  })

  return key
}

export async function readLocalImage(key) {
  if (!key) return ''

  return withStore('readonly', (store, resolve, reject) => {
    const request = store.get(key)
    request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : '')
    request.onerror = () => reject(request.error || new Error('读取本地图片失败'))
  })
}

export async function deleteLocalImage(key) {
  if (!key) return

  await withStore('readwrite', (store, resolve, reject) => {
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error || new Error('删除本地图片失败'))
  })
}
