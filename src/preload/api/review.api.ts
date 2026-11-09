import { ipcRenderer } from 'electron'

export const reviewApi = {
  summary: (directory: string) => ipcRenderer.invoke('review:summary', directory),

  file: (directory: string, path: string) => ipcRenderer.invoke('review:file', directory, path)
}
