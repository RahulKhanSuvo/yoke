import { db } from '../database'
import { appState } from '../database/schema'
import { eq } from 'drizzle-orm'

/** Reads every persisted key-value pair in one shot, for the renderer's startup hydrate. */
export function getAllAppState(): Record<string, string> {
  const rows = db.select().from(appState).all()

  return Object.fromEntries(rows.map((row) => [row.key, row.value]))
}

/** Reads one persisted value, or undefined when the key has never been set. */
export function getAppState(key: string): string | undefined {
  const row = db.select().from(appState).where(eq(appState.key, key)).get()

  return row?.value
}

/** Upserts one key. better-sqlite3 is synchronous, so writes land immediately. */
export function setAppState(key: string, value: string): void {
  db.insert(appState)
    .values({ key, value })
    .onConflictDoUpdate({ target: appState.key, set: { value } })
    .run()
}

export function deleteAppState(key: string): void {
  db.delete(appState).where(eq(appState.key, key)).run()
}
