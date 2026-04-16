/**
 * In-memory cache for Nhanh location data.
 * TTL 24h — location data is nearly static.
 */

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

/** Exposed for testing / admin cache invalidation */
export function cacheClear(key?: string): void {
  if (key) {
    store.delete(key)
  } else {
    store.clear()
  }
}
