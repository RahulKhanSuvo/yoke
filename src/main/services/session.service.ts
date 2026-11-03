import { asc, desc, eq } from 'drizzle-orm'
import { db } from '../database'
import { SessionMessageTable, sessions } from '../database/schema'
import type { SessionMessageData } from '../../shared/ai'

export type Session = typeof sessions.$inferSelect
export type SessionMessage = typeof SessionMessageTable.$inferSelect
export type SessionMessageType = 'user' | 'assistant'

export async function createSession(projectId: string, directory: string): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({
      projectId,
      directory
    })
    .returning()

  return session
}

export async function getProjectSessions(projectId: string): Promise<Session[]> {
  return db.query.sessions.findMany({
    where: eq(sessions.projectId, projectId),
    orderBy: (sessions, { desc }) => [desc(sessions.time_updated)]
  })
}

export async function getSession(id: string) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid session ID')
  }

  return db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    with: { project: true }
  })
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('Invalid session ID')
  }

  return db
    .select()
    .from(SessionMessageTable)
    .where(eq(SessionMessageTable.session_id, sessionId))
    .orderBy(asc(SessionMessageTable.seq))
}

/** Appends a message to the end of the session transcript. */
export async function appendSessionMessage(
  sessionId: string,
  type: SessionMessageType,
  data: SessionMessageData
): Promise<SessionMessage> {
  const [last] = await db
    .select({ seq: SessionMessageTable.seq })
    .from(SessionMessageTable)
    .where(eq(SessionMessageTable.session_id, sessionId))
    .orderBy(desc(SessionMessageTable.seq))
    .limit(1)

  const [message] = await db
    .insert(SessionMessageTable)
    .values({
      session_id: sessionId,
      type,
      seq: (last?.seq ?? -1) + 1,
      time_created: Date.now(),
      data
    })
    .returning()

  return message
}

export async function updateSession(
  id: string,
  values: Partial<Pick<Session, 'title' | 'status' | 'time_archived'>>
): Promise<void> {
  await db.update(sessions).set(values).where(eq(sessions.id, id))
}

/** Adds a finished turn's provider usage to the session's running totals. */
export async function addSessionUsage(
  id: string,
  usage: { inputTokens: number; outputTokens: number; reasoningTokens: number }
): Promise<void> {
  const [current] = await db
    .select({
      input: sessions.tokens_input,
      output: sessions.tokens_output,
      reasoning: sessions.tokens_reasoning
    })
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1)

  await db
    .update(sessions)
    .set({
      tokens_input: (current?.input ?? 0) + usage.inputTokens,
      tokens_output: (current?.output ?? 0) + usage.outputTokens,
      tokens_reasoning: (current?.reasoning ?? 0) + usage.reasoningTokens
    })
    .where(eq(sessions.id, id))
}

export async function deleteSession(id: string): Promise<void> {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid session ID')
  }

  // session_message has no cascade, so clear the transcript first.
  await db.delete(SessionMessageTable).where(eq(SessionMessageTable.session_id, id))
  await db.delete(sessions).where(eq(sessions.id, id))
}
