import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { migrate } from './migrate'

import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

const dbPath = path.join(app.getPath('userData'), 'yoke.db')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')

// Bring the database up to date before anything queries it.
migrate(sqlite)

export const db = drizzle(sqlite, { schema })
