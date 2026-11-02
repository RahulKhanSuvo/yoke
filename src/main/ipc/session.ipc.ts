import { ipcMain } from 'electron'
import {
  createSession,
  deleteSession,
  getProjectSessions,
  getSession,
  getSessionMessages
} from '../services/session.service'

export function registerSessionIpc(): void {
  // Create a new session
  ipcMain.handle('sessions:create', async (_, projectId: string, directory: string) => {
    return createSession(projectId, directory)
  })

  // Get sessions belonging to a project
  ipcMain.handle('sessions:list', async (_, projectId: string) => {
    return getProjectSessions(projectId)
  })

  // Get one session with its project
  ipcMain.handle('sessions:get', async (_, id: string) => {
    return getSession(id)
  })

  // Get the ordered transcript of a session
  ipcMain.handle('sessions:messages', async (_, id: string) => {
    return getSessionMessages(id)
  })

  // Delete a session and its transcript
  ipcMain.handle('sessions:delete', async (_, id: string) => {
    return deleteSession(id)
  })
}
