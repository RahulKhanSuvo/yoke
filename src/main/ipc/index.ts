import { registerAIHandlers } from './ai.ipc'
import { registerProjectIpc } from './project.ipc'
import { registerReviewIpc } from './review.ipc'
import { registerSessionIpc } from './session.ipc'

// Central registration point for all IPC handlers.
// Add new feature registrations here as Yoke grows.
export function registerIpcHandlers(): void {
  registerProjectIpc()
  registerAIHandlers()
  registerSessionIpc()
  registerReviewIpc()
}
