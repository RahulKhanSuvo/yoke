import { ElectronAPI } from '@electron-toolkit/preload'

export interface Project {
  id: string
  name: string
  rootPath: string
  createdAt: number
  updatedAt: number
}

export interface PreloadApi {
  projects: {
    list: () => Promise<Project[]>
    selectFolder: () => Promise<Project | null>
    delete: (id: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
