import { registerAIHandlers } from './ai.ipc'
import { registerProjectIpc } from './project.ipc'

// Central registration point for all IPC handlers.
// Add new feature registrations here as Yoke grows.
export function registerIpcHandlers(): void {
  registerProjectIpc()
  registerAIHandlers()
}
