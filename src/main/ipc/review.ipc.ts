import { ipcMain } from 'electron'

import { isProjectDirectory } from '../services/project.service'
import { getReviewFile, getReviewSummary } from '../services/review.service'

export function registerReviewIpc(): void {
  // Summarize the working tree changes for a session directory. Only
  // registered project directories are readable, so a compromised renderer
  // cannot diff arbitrary folders.
  ipcMain.handle('review:summary', async (_, directory: string) => {
    if (!(await isProjectDirectory(directory))) return { isRepo: false, files: [], additions: 0, deletions: 0 }

    return getReviewSummary(directory)
  })

  // Read one changed file's unified diff
  ipcMain.handle('review:file', async (_, directory: string, filePath: string) => {
    if (!(await isProjectDirectory(directory))) return null

    return getReviewFile(directory, filePath)
  })
}
