import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Generic key-value store for renderer UI state — tab strips, panel layout,
 * model picks. Yoke's equivalent of opencode's desktop storage: state survives
 * restarts through the main process rather than localStorage.
 */
export const appState = sqliteTable('app_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})
