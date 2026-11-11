import { sqliteTable, text, integer, index, real } from 'drizzle-orm/sqlite-core'

import type { SessionMessageData } from '../../../shared/ai'
import { projects } from './project'
import { createId, Timestamps } from '../../utility/commonUit'

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId.session()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade'
      }),

    title: text('title').notNull().default('New session'),
    directory: text().notNull(),

    status: text('status').notNull().default('idle'),
    // Cost & Usage Tracking
    cost: real().default(0),
    tokens_input: integer().default(0),
    tokens_output: integer().default(0),
    tokens_reasoning: integer().default(0),
    // Execution Lifecycle State
    time_busy: integer(), // Timestamp when agent started working
    time_idle: integer(), // Timestamp when agent finished
    idle_outcome: text(), // "complete", "error", etc.
    time_archived: integer(),
    ...Timestamps
  },
  (table) => [index('sessions_project_id_idx').on(table.projectId)]
)

export const SessionMessageTable = sqliteTable('session_message', {
  id: text()
    .primaryKey()
    .$defaultFn(() => createId.message()),
  session_id: text().references(() => sessions.id, {
    onDelete: 'cascade'
  }),
  type: text().notNull(), // "user" | "assistant"
  seq: integer().notNull(), // Order sequence (0, 1, 2...)
  time_created: integer(),
  data: text({ mode: 'json' }).$type<SessionMessageData>() // Message body or instructions
})

export const SessionPartTable = sqliteTable('session_part', {
  message_id: text().references(() => SessionMessageTable.id, {
    onDelete: 'cascade'
  }),
  session_id: text().references(() => sessions.id, {
    onDelete: 'cascade'
  }),
  ordinal: integer().notNull(), // Order within the message
  type: text().notNull(), // "text" | "reasoning" | "tool_call" | "tool_result"
  call_id: text(), // Matches tool call with its output
  data: text({ mode: 'json' }) // Content or { name, args, result }
})
