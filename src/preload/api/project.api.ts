import { ipcRenderer } from 'electron'

export const projectApi = {
  list: () => ipcRenderer.invoke('projects:list'),

  selectFolder: () => ipcRenderer.invoke('projects:select-folder'),

  delete: (id: string) => ipcRenderer.invoke('projects:delete', id)
}
