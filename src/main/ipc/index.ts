import { registerAIHandlers } from './ai.ipc'
import { registerFilesIpc } from './files.ipc'
import { registerProjectIpc } from './project.ipc'
import { registerReviewIpc } from './review.ipc'
import { registerSessionIpc } from './session.ipc'
import { registerTerminalIpc, stopTerminalsOnQuit } from './terminal.ipc'

// Central registration point for all IPC handlers.
// Add new feature registrations here as Yoke grows.
export function registerIpcHandlers(): void {
  registerProjectIpc()
  registerAIHandlers()
  registerSessionIpc()
  registerReviewIpc()
  registerFilesIpc()
  registerTerminalIpc()
}

export { stopTerminalsOnQuit }
