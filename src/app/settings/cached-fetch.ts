// ─── Cached fetch — prevents duplicate API calls within CACHE_TTL ms ───

const fetchCache = new Map<string, { promise: Promise<any>; ts: number }>()
const CACHE_TTL = 5000

export function cachedFetch(url: string, opts?: { forceFresh?: boolean }): Promise<any> {
  const now = Date.now()
  if (!opts?.forceFresh) {
    const cached = fetchCache.get(url)
    if (cached && now - cached.ts < CACHE_TTL) return cached.promise
  }
  const promise = fetch(url).then(r => r.ok ? r.json() : null)
  fetchCache.set(url, { promise, ts: now })
  return promise
}
