import { projectApi } from './api/project.api'
import { sessionApi } from './api/session.api'

export const api = {
  projects: projectApi,
  sessions: sessionApi
}
