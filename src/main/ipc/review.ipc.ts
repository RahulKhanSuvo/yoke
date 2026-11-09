import { ipcMain } from 'electron'

import { getReviewFile, getReviewSummary } from '../services/review.service'

export function registerReviewIpc(): void {
  // Summarize the working tree changes for a session directory
  ipcMain.handle('review:summary', async (_, directory: string) => {
    return getReviewSummary(directory)
  })

  // Read one changed file's unified diff
  ipcMain.handle('review:file', async (_, directory: string, filePath: string) => {
    return getReviewFile(directory, filePath)
  })
}
