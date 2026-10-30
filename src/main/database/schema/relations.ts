import { relations } from 'drizzle-orm'

import { projects } from './project'
import { sessions } from './session'

// One project has many sessions
export const projectsRelations = relations(projects, ({ many }) => ({
  sessions: many(sessions)
}))

// One session belongs to one project
export const sessionsRelations = relations(sessions, ({ one }) => ({
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id]
  })
}))
