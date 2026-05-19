import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as pgSchema from './schema'
import * as sqliteSchema from './sqlite-schema'

const driver = process.env.DB_DRIVER || 'postgres'

export const schema = driver === 'sqlite' ? sqliteSchema : pgSchema

async function createDb() {
  if (driver === 'sqlite') {
    const { default: BetterSqlite3 } = await import('better-sqlite3')
    const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../../flowcraft.db')

    const _sqlite = new BetterSqlite3(dbPath) as import('better-sqlite3').Database
    _sqlite.pragma('journal_mode = WAL')
    _sqlite.pragma('foreign_keys = ON')

    console.log(`[DB] SQLite: ${dbPath}`)
    return { db: drizzleSqlite(_sqlite, { schema: sqliteSchema }) as any, sqlite: _sqlite }
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set.\n' +
      '  → PostgreSQL: set DATABASE_URL=postgres://user:pass@host:5432/db\n' +
      '  → SQLite (zero-config): set DB_DRIVER=sqlite'
    )
  }

  const client = postgres(connectionString, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  })

  console.log('[DB] PostgreSQL')
  return { db: drizzle(client, { schema: pgSchema }), sqlite: null }
}

const { db, sqlite } = await createDb()

export { db, sqlite }
