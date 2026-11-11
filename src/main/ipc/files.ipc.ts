import { ipcMain } from 'electron'

import { getFileTree, readFilePreview } from '../services/files.service'

export function registerFilesIpc(): void {
  // One level of the project tree; the renderer walks folders lazily.
  ipcMain.handle('files:tree', (_, directory: string, subPath: string) => {
    return getFileTree(directory, subPath)
  })

  // A capped text preview of one file.
  ipcMain.handle('files:read', (_, directory: string, filePath: string) => {
    return readFilePreview(directory, filePath)
  })
}
