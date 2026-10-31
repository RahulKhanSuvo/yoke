import { eq } from 'drizzle-orm'
import { db } from '../database'
import { sessions } from '../database/schema'

export async function createSession(
  projectId: string,
  directory: string
): Promise<typeof sessions.$inferSelect> {
  const [session] = await db
    .insert(sessions)
    .values({
      projectId,
      directory
    })
    .returning()

  return session
}

export async function getProjectSessions(
  projectId: string
): Promise<Array<typeof sessions.$inferSelect>> {
  return db.query.sessions.findMany({
    where: eq(sessions.projectId, projectId),
    orderBy: (sessions, { desc }) => [desc(sessions.updatedAt)]
  })
}

export async function deleteSection(id: string) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid project ID')
  }
  await db.delete(sessions).where(eq(sessions.id, id))
}
