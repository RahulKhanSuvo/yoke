import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { projectApi } from './api/project.api'
import { sessionApi } from './api/session.api'
import { aiApi } from './api/ai.api'

export const api = {
  projects: projectApi,
  sessions: sessionApi,
  ai: aiApi
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
