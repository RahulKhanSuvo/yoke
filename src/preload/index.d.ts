import { ElectronAPI } from '@electron-toolkit/preload'

import type { projects } from '../main/database/schema/project'
import type { sessions } from '../main/database/schema/session'

export type Project = typeof projects.$inferSelect
export type Session = typeof sessions.$inferSelect

/** A project row as returned by `projects:list`, with its sessions preloaded. */
export type ProjectWithSessions = Project & { sessions: Session[] }

export interface PreloadApi {
  projects: {
    list: () => Promise<ProjectWithSessions[]>
    selectFolder: () => Promise<Project | null>
    delete: (id: string) => Promise<void>
  }
  sessions: {
    create: (projectId: string, directory: string) => Promise<Session>
    list: (projectId: string) => Promise<Session[]>
    delete: (id: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
