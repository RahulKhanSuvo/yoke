import type { WebContents } from 'electron'
import { randomUUID } from 'node:crypto'

import type { QuestionOption, QuestionResponse } from '../../shared/ai'

/** How long an unanswered question dialog waits before expiring. */
const QUESTION_TIMEOUT = 10 * 60_000

interface PendingQuestion {
  requestId: string
  resolve: (answers: string[] | null) => void
  timer: NodeJS.Timeout
}

/**
 * Pauses the agent loop while the user answers a question, mirroring the
 * approval gate. Expiring or cancelled questions resolve `null` so the turn
 * can unwind instead of hanging forever.
 */
export class QuestionGate {
  private pending = new Map<string, PendingQuestion>()

  async ask(
    webContents: WebContents,
    requestId: string,
    header: string | undefined,
    question: string,
    options: QuestionOption[],
    multiple: boolean
  ): Promise<string[] | null> {
    if (webContents.isDestroyed()) return null

    const questionId = randomUUID()

    return new Promise<string[] | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(questionId)
        resolve(null)
      }, QUESTION_TIMEOUT)

      this.pending.set(questionId, { requestId, resolve, timer })

      webContents.send('ai:question:request', {
        requestId,
        questionId,
        header,
        question,
        options,
        multiple
      })
    })
  }

  /** Resolves a pending question from the renderer; unknown ids are ignored. */
  respond(response: QuestionResponse): void {
    const pending = this.pending.get(response.questionId)

    if (!pending || pending.requestId !== response.requestId) return

    clearTimeout(pending.timer)
    this.pending.delete(response.questionId)
    pending.resolve(Array.isArray(response.answers) ? response.answers : [])
  }

  /** Expires every pending question, used when a turn is cancelled or ends. */
  cancelAll(): void {
    for (const [questionId, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.resolve(null)
      this.pending.delete(questionId)
    }
  }
}

/** One gate per session, so questions outlive a single renderer reload. */
const gates = new Map<string, QuestionGate>()

export function getQuestionGate(sessionId: string): QuestionGate {
  let gate = gates.get(sessionId)

  if (!gate) {
    gate = new QuestionGate()
    gates.set(sessionId, gate)
  }

  return gate
}
