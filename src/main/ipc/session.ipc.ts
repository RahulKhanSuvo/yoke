import { ipcMain } from 'electron'
import { createSession, getProjectSessions, deleteSection } from '../services/session.service'

export function registerSessionIpc(): void {
  // Create a new session
  ipcMain.handle('sessions:create', async (_, projectId: string, directory: string) => {
    return createSession(projectId, directory)
  })

  // Get sessions belonging to a project
  ipcMain.handle('sessions:list', async (_, projectId: string) => {
    return getProjectSessions(projectId)
  })

  // Delete a session
  ipcMain.handle('sessions:delete', async (_, id: string) => {
    return deleteSection(id)
  })
}
