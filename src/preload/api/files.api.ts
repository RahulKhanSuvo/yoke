import { ipcRenderer } from 'electron'

import type { FilePreview, FileTreeNode } from '../../shared/files'

export const filesApi = {
  /** One level of the project tree; subPath is relative to the project root. */
  tree: (directory: string, subPath: string): Promise<FileTreeNode[]> =>
    ipcRenderer.invoke('files:tree', directory, subPath),

  /** A capped text preview of one project file. */
  read: (directory: string, filePath: string): Promise<FilePreview | null> =>
    ipcRenderer.invoke('files:read', directory, filePath)
}
