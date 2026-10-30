import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  name: text('name').notNull(),

  rootPath: text('root_path').notNull().unique(),

  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),

  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now())
})
