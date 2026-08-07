/**
 * Database environment configuration.
 * 
 * Supports dynamic provider switching via DATABASE_PROVIDER env var:
 *   - sqlite  → default, file-based, zero-dependency
 *   - mysql   → requires @prisma/adapter-mysql + mysql2
 * 
 * Usage:
 *   import { dbConfig } from '@/lib/db-env'
 *   console.log(dbConfig.provider)       // 'sqlite' | 'mysql'
 *   console.log(dbConfig.connectionUrl)  // full connection URL
 */

export type DatabaseProvider = 'sqlite' | 'mysql' | 'postgresql'

import logger from '@/lib/logger'

export interface DatabaseConfig {
  /** Database provider: sqlite or mysql */
  provider: DatabaseProvider
  /** Full connection URL (from DATABASE_URL env) */
  connectionUrl: string
  /** Connection pool minimum (MySQL only) */
  poolMin: number
  /** Connection pool maximum (MySQL only) */
  poolMax: number
  /** Connection timeout in seconds (MySQL only) */
  connectionTimeout: number
  /** Whether this is a MySQL connection */
  get isMySQL(): boolean
  /** Whether this is a SQLite connection */
  get isSQLite(): boolean
  /** Whether this is a PostgreSQL connection */
  get isPostgreSQL(): boolean
}

function envStr(key: string, fallback: string): string {
  return process.env[key] || fallback
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key]
  if (!val) return fallback
  const n = parseInt(val, 10)
  return isNaN(n) ? fallback : n
}

/**
 * Parse DATABASE_PROVIDER and validate it.
 * Defaults to 'sqlite' if not set or invalid.
 */
function parseProvider(): DatabaseProvider {
  const raw = (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase().trim()
  if (raw === 'mysql') return 'mysql'
  if (raw === 'postgresql' || raw === 'postgres' || raw === 'pg') return 'postgresql'
  if (raw === 'sqlite') return 'sqlite'
  logger.warn(
    `DATABASE_PROVIDER="${raw}" không hợp lệ. Sử dụng mặc định: sqlite. ` +
    `Giá trị hợp lệ: sqlite, mysql, postgresql`,
    { context: 'db-env' }
  )
  return 'sqlite'
}

/**
 * Build the database configuration from environment variables.
 * Called once and cached.
 */
function buildDbConfig(): DatabaseConfig {
  const provider = parseProvider()
  const connectionUrl = envStr('DATABASE_URL',
    provider === 'sqlite' ? 'file:./db/custom.db' : 
    provider === 'postgresql' ? 'postgresql://postgres:password@localhost:5432/omnichat' : 
    'mysql://root:password@localhost:3306/omnichat'
  )

  const config: DatabaseConfig = {
    provider,
    connectionUrl,
    poolMin: envInt('DATABASE_POOL_MIN', 2),
    poolMax: envInt('DATABASE_POOL_MAX', 10),
    connectionTimeout: envInt('DATABASE_CONNECTION_TIMEOUT', 30),
    get isMySQL() { return this.provider === 'mysql' },
    get isSQLite() { return this.provider === 'sqlite' },
    get isPostgreSQL() { return this.provider === 'postgresql' },
  }

  return config
}

// Singleton — load once per process
let _dbConfig: DatabaseConfig | null = null

export function getDbConfig(): DatabaseConfig {
  if (!_dbConfig) {
    _dbConfig = buildDbConfig()
  }
  return _dbConfig
}

/**
 * Resolved database config (exported singleton for convenience) */
export const dbConfig = new Proxy({} as DatabaseConfig, {
  get(_target, prop) {
    return (getDbConfig() as any)[prop]
  },
})
