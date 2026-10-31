import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId, Timestamps } from '../../utility/databaseUtility'

export const projects = sqliteTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId.project()),

  name: text('name').notNull(),
  vcs: text(),
  rootPath: text('root_path').notNull().unique(),
  icon_url: text(),
  icon_url_override: text(),
  icon_color: text(),
  ...Timestamps,
  time_initialized: integer(),
  time_active: integer()
    .notNull()
    .default(0)
    .$defaultFn(() => Date.now())
})
