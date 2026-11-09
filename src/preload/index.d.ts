import { ElectronAPI } from '@electron-toolkit/preload'

import type { projects } from '../main/database/schema/project'
import type { SessionMessageTable, sessions } from '../main/database/schema/session'
import type {
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamPart,
  ProviderId,
  ProviderStatus
} from '../shared/ai'
import type { ReviewFileDiff, ReviewSummary } from '../shared/review'

export type Project = typeof projects.$inferSelect
export type Session = typeof sessions.$inferSelect
export type SessionMessage = typeof SessionMessageTable.$inferSelect

/** A project row as returned by `projects:list`, with its sessions preloaded. */
export type ProjectWithSessions = Project & { sessions: Session[] }

/** A session row returned by `sessions:get`, with its project attached. */
export type SessionWithProject = Session & { project: Project }

export interface PreloadApi {
  projects: {
    list: () => Promise<ProjectWithSessions[]>
    selectFolder: () => Promise<Project | null>
    delete: (id: string) => Promise<void>
  }
  sessions: {
    create: (projectId: string, directory: string) => Promise<Session>
    list: (projectId: string) => Promise<Session[]>
    get: (id: string) => Promise<SessionWithProject | null>
    messages: (id: string) => Promise<SessionMessage[]>
    delete: (id: string) => Promise<void>
  }
  ai: {
    providers: () => Promise<ProviderStatus[]>
    saveKey: (providerId: ProviderId, apiKey: string) => Promise<{ success: true }>
    removeKey: (providerId: ProviderId) => Promise<{ success: true }>
    send: (request: ChatSendRequest) => Promise<{ success: boolean; messageId?: string }>
    cancel: (requestId: string) => Promise<void>
    /** Subscribe to streamed text; returns an unsubscribe function. */
    onChunk: (listener: (payload: ChatStreamChunk) => void) => () => void
    /** Subscribe to tool call start/finish events. */
    onPart: (listener: (payload: ChatStreamPart) => void) => () => void
    onDone: (listener: (payload: ChatStreamDone) => void) => () => void
    onError: (listener: (payload: ChatStreamError) => void) => () => void
  }
  review: {
    /** Summarize the working tree changes in a session directory. */
    summary: (directory: string) => Promise<ReviewSummary>
    /** Read a single changed file's unified diff. */
    file: (directory: string, path: string) => Promise<ReviewFileDiff | null>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PreloadApi
  }
}
