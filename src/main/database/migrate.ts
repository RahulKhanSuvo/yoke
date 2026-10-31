/// <reference types="vite/client" />
import type Database from 'better-sqlite3'

/**
 * The drizzle migrations, bundled as raw strings so a packaged app needs no sidecar folder.
 * Filenames are zero-padded by drizzle-kit, so sorting by name keeps journal order.
 */
const migrations = Object.entries(
  import.meta.glob<string>('./migrations/*.sql', {
    eager: true,
    query: '?raw',
    import: 'default'
  })
)
  .map(([file, sql]) => ({
    tag: file
      .split('/')
      .pop()!
      .replace(/\.sql$/, ''),
    sql
  }))
  .sort((a, b) => a.tag.localeCompare(b.tag))

/**
 * Applies pending migrations once per database, mirroring drizzle's migrator:
 * each file runs in a transaction and its tag is recorded so it never runs twice.
 */
export function migrate(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at INTEGER
    )
  `)

  const applied = new Set(
    sqlite
      .prepare('SELECT hash FROM __drizzle_migrations')
      .all()
      .map((row) => (row as { hash: string }).hash)
  )

  for (const migration of migrations) {
    if (applied.has(migration.tag)) continue

    const statements = migration.sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)

    sqlite.transaction(() => {
      for (const statement of statements) sqlite.exec(statement)

      sqlite
        .prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
        .run(migration.tag, Date.now())
    })()
  }
}
