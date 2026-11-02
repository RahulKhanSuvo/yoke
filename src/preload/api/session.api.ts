import { ipcRenderer } from 'electron'

export const sessionApi = {
  create: (projectId: string, directory: string) =>
    ipcRenderer.invoke('sessions:create', projectId, directory),

  list: (projectId: string) => ipcRenderer.invoke('sessions:list', projectId),

  get: (id: string) => ipcRenderer.invoke('sessions:get', id),

  messages: (id: string) => ipcRenderer.invoke('sessions:messages', id),

  delete: (id: string) => ipcRenderer.invoke('sessions:delete', id)
}
