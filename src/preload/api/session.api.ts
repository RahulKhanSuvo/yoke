import { ipcRenderer } from 'electron'

export const sessionApi = {
  create: (projectId: string, directory: string) =>
    ipcRenderer.invoke('sessions:create', projectId, directory),

  list: (projectId: string) => ipcRenderer.invoke('sessions:list', projectId),

  delete: (id: string) => ipcRenderer.invoke('sessions:delete', id)
}
