import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { projectApi } from './api/project.api'
import { sessionApi } from './api/session.api'
import { aiApi } from './api/ai.api'
import { reviewApi } from './api/review.api'
import { filesApi } from './api/files.api'
import { terminalApi } from './api/terminal.api'
import { stateApi } from './api/state.api'

/**
 * A minimal, sandbox-safe stand-in for `@electron-toolkit/preload`'s
 * electronAPI: a sandboxed preload can only require Electron builtins, so
 * external packages must not appear in this bundle at runtime. `process`
 * here is the limited sandbox global.
 */
const electronAPI = { ipcRenderer, webFrame, process }

export const api = {
  projects: projectApi,
  sessions: sessionApi,
  ai: aiApi,
  review: reviewApi,
  files: filesApi,
  terminal: terminalApi,
  state: stateApi
}
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose preload APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
