import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// ─── File-based storage for security config & blacklist (Node.js only, used in API routes) ───
const DATA_DIR = join(process.cwd(), 'data')
const BLACKLIST_FILE = join(DATA_DIR, 'blacklist.json')
const CONFIG_FILE = join(DATA_DIR, 'security-config.json')

export interface BlacklistEntry {
  type: 'ip' | 'email'
  value: string
  reason: string
  addedAt: string
  addedBy: string
}

export interface SecurityConfig {
  rateLimitPerMinute: number
  rateLimitEnabled: boolean
  blacklistEnabled: boolean
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimitPerMinute: 60,
  rateLimitEnabled: true,
  blacklistEnabled: true,
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function loadBlacklist(): BlacklistEntry[] {
  try {
    ensureDataDir()
    if (existsSync(BLACKLIST_FILE)) {
      return JSON.parse(readFileSync(BLACKLIST_FILE, 'utf-8'))
    }
  } catch {}
  return []
}

export function saveBlacklist(list: BlacklistEntry[]) {
  try {
    ensureDataDir()
    writeFileSync(BLACKLIST_FILE, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}

export function loadSecurityConfig(): SecurityConfig {
  try {
    ensureDataDir()
    if (existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) }
    }
  } catch {}
  return DEFAULT_SECURITY_CONFIG
}

export function saveSecurityConfig(config: SecurityConfig) {
  try {
    ensureDataDir()
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch {}
}

// In-memory cache for blacklist checking (shared across API route invocations)
let _blacklistCache: BlacklistEntry[] | null = null
let _blacklistCacheTime = 0
const CACHE_TTL = 30_000 // 30 seconds

export function getCachedBlacklist(): BlacklistEntry[] {
  const now = Date.now()
  if (!_blacklistCache || now - _blacklistCacheTime > CACHE_TTL) {
    _blacklistCache = loadBlacklist()
    _blacklistCacheTime = now
  }
  return _blacklistCache
}

export function invalidateBlacklistCache() {
  _blacklistCache = null
  _blacklistCacheTime = 0
}

export function isBlacklisted(ip: string, email?: string): boolean {
  // Never block loopback/localhost IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost') {
    return false
  }
  const list = getCachedBlacklist()
  return list.some(entry => {
    if (entry.type === 'ip' && (entry.value === ip || entry.value === '*')) return true
    if (entry.type === 'email' && email && entry.value.toLowerCase() === email.toLowerCase()) return true
    return false
  })
}

/**
 * Add an entry to the blacklist (used by auto-blacklist & manual admin actions).
 */
export function addToBlacklist(entry: BlacklistEntry): void {
  const list = loadBlacklist()
  // Prevent duplicates
  if (!list.some(e => e.type === entry.type && e.value === entry.value)) {
    list.push(entry)
    saveBlacklist(list)
    invalidateBlacklistCache()
  }
}
