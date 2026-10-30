import { ipcRenderer } from 'electron'
export const api = {
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),

    selectFolder: () => ipcRenderer.invoke('projects:select-folder'),

    delete: (id: string) => ipcRenderer.invoke('projects:delete', id)
  }
}
