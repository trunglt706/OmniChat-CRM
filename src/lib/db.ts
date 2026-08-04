/**
 * Prisma Client singleton with multi-database support.
 *
 * SQLite (default): Standard PrismaClient, zero extra dependencies.
 * MySQL: Uses @prisma/adapter-mysql + mysql2 (lazy-loaded at runtime).
 *
 * Setup for MySQL:
 *   1. bun add @prisma/adapter-mysql mysql2
 *   2. Set DATABASE_PROVIDER=mysql in .env
 *   3. Set DATABASE_URL=mysql://user:pass@host:3306/dbname
 */

import { PrismaClient } from '@prisma/client'
import { getDbConfig } from './db-env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Create the default PrismaClient.
 */
function createPrismaClient(): PrismaClient {
  const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '1000', 10)
  return new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
    ],
  }).$on('query', (e: any) => {
    const duration = e.duration
    if (duration > SLOW_QUERY_MS) {
      console.warn(`[SLOW QUERY] ${duration}ms > ${SLOW_QUERY_MS}ms\n${e.query}`)
    }
  })
}

/**
 * Synchronous db instance — always available.
 */
export const db = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient())

/**
 * Async db accessor.
 * - SQLite: returns the standard client immediately.
 * - MySQL: lazy-loads mysql2 adapter on first call via dynamic require().
 */
let _mysqlPromise: Promise<PrismaClient> | null = null

export async function getDb(): Promise<PrismaClient> {
  const config = getDbConfig()

  // SQLite: return standard client
  if (config.isSQLite) {
    return db
  }

  // MySQL: lazy-init adapter (only triggered when DATABASE_PROVIDER=mysql)
  if (!_mysqlPromise) {
    _mysqlPromise = (async () => {
      try {
        // Use Function constructor to avoid Turbopack/webpack static analysis.
        // This file is only reached when DATABASE_PROVIDER=mysql.
        const mysql = await new Function('return import("mysql2/promise")')()
        const { PrismaMySQL } = await new Function('return import("@prisma/adapter-mysql")')()

        const pool = mysql.createPool({
          uri: config.connectionUrl,
          connectionLimit: config.poolMax,
          waitForConnections: true,
          queueLimit: 0,
          connectTimeout: config.connectionTimeout * 1000,
        })

        const adapter = new PrismaMySQL(pool)

        console.log(
          `[db] MySQL connected: ${config.connectionUrl.replace(/:([^@]+)@/, ':***@')}`
        )

        const client = new PrismaClient({
          adapter,
          log: process.env.NODE_ENV === 'development' ? ['query'] : [],
        }) as unknown as PrismaClient

        globalForPrisma.prisma = client
        return client
      } catch (err) {
        console.error(
          `[db] MySQL init failed. Install: bun add @prisma/adapter-mysql mysql2\n`,
          err
        )
        console.warn('[db] Falling back to SQLite...')
        return db
      }
    })()
  }

  return _mysqlPromise
}

// Log database provider on startup (server-side only)
if (typeof window === 'undefined') {
  const cfg = getDbConfig()
  console.log(
    `[db] Provider: ${cfg.provider}, URL: ${cfg.connectionUrl.replace(/:([^@]+)@/, ':***@')}`
  )
}
