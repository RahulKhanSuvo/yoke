import { ipcRenderer } from 'electron'

export const stateApi = {
  /** All persisted UI state at once, so the renderer hydrates with one IPC round-trip. */
  getAll: () => ipcRenderer.invoke('state:get-all'),

  set: (key: string, value: string) => ipcRenderer.invoke('state:set', key, value),

  delete: (key: string) => ipcRenderer.invoke('state:delete', key)
}
