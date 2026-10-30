import { BrowserWindow, dialog, ipcMain } from 'electron'
import { createProject } from '../services/project.service'

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
}
