import type { WebContents } from 'electron'
import { randomUUID } from 'node:crypto'

import type { ApprovalDecision, ApprovalResponse } from '../../shared/ai'

/** A privileged tool asks the user through this gate before it runs. */
export interface ApprovalRequester {
  request(command: string): Promise<boolean>
}

/** How long an unanswered approval dialog waits before denying. */
const APPROVAL_TIMEOUT = 10 * 60_000

interface PendingApproval {
  requestId: string
  resolve: (decision: ApprovalDecision | null) => void
  timer: NodeJS.Timeout
}

/**
 * Gates bash commands behind explicit user approval, mirroring opencode's
 * permission prompts. Commands the user allowed "for this session" are
 * remembered, so an agent run is not interrupted by the same command twice.
 */
export class ApprovalGate {
  private pending = new Map<string, PendingApproval>()
  private sessionAllowed = new Set<string>()

  async request(webContents: WebContents, requestId: string, command: string): Promise<boolean> {
    if (this.sessionAllowed.has(command)) return true

    if (webContents.isDestroyed()) return false

    const approvalId = randomUUID()

    const decision = await new Promise<ApprovalDecision | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(approvalId)
        resolve(null)
      }, APPROVAL_TIMEOUT)

      this.pending.set(approvalId, { requestId, resolve, timer })

      webContents.send('ai:approval:request', { requestId, approvalId, command })
    })

    if (decision === 'allow-session') this.sessionAllowed.add(command)

    return decision === 'allow' || decision === 'allow-session'
  }

  /** Resolves a pending approval from the renderer; unknown ids are ignored. */
  respond(response: ApprovalResponse): void {
    const pending = this.pending.get(response.approvalId)

    if (!pending || pending.requestId !== response.requestId) return

    clearTimeout(pending.timer)
    this.pending.delete(response.approvalId)
    pending.resolve(response.decision)
  }

  /** Rejects every pending approval, used when a turn is cancelled or ends. */
  cancelAll(): void {
    for (const [approvalId, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.resolve(null)
      this.pending.delete(approvalId)
    }
  }
}

/** One gate per session, so "allow for this session" outlives a single turn. */
const gates = new Map<string, ApprovalGate>()

export function getApprovalGate(sessionId: string): ApprovalGate {
  let gate = gates.get(sessionId)

  if (!gate) {
    gate = new ApprovalGate()
    gates.set(sessionId, gate)
  }

  return gate
}
