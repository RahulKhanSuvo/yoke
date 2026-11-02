import { projectApi } from './api/project.api'
import { sessionApi } from './api/session.api'
import { aiApi } from './api/ai.api'

export const api = {
  projects: projectApi,
  sessions: sessionApi,
  ai: aiApi
}
