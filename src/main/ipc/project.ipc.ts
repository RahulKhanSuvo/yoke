import { BrowserWindow, dialog, ipcMain } from 'electron'
import {
  createProject,
  deleteProject,
  exportProject,
  getProjects,
  renameProject
} from '../services/project.service'

export function registerProjectIpc(): void {
  ipcMain.handle('projects:select-folder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)

    if (!window) {
      throw new Error('Application window not found')
    }

    const result = await dialog.showOpenDialog(window, {
      title: 'Select Project Folder',
      properties: ['openDirectory']
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    return createProject(result.filePaths[0])
  })
  ipcMain.handle('projects:list', () => {
    return getProjects()
  })
  ipcMain.handle('projects:delete', async (_, id: string) => {
    return deleteProject(id)
  })
  ipcMain.handle('projects:rename', async (_, id: string, name: string) => {
    return renameProject(id, name)
  })
  ipcMain.handle('projects:export', async (event, id: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)

    if (!window) {
      throw new Error('Application window not found')
    }

    return exportProject(id, window)
  })
}
