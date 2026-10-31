// shared/types/electron.d.ts

import type { Project } from '../../main/database/schema/project'

declare global {
  interface Window {
    api: {
      projects: {
        list: () => Promise<Project[]>
        selectFolder: () => Promise<Project | null>
        delete: (id: string) => Promise<Project>
      }
    }
  }
}

export {}
