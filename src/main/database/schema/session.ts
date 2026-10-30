import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

import { projects } from './project'

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade'
      }),

    title: text('title').notNull().default('New session'),

    status: text('status').notNull().default('idle'),

    createdAt: integer('created_at')
      .notNull()
      .$defaultFn(() => Date.now()),

    updatedAt: integer('updated_at')
      .notNull()
      .$defaultFn(() => Date.now())
  },
  (table) => [index('sessions_project_id_idx').on(table.projectId)]
)
