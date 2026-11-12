import type { projects } from '../main/database/schema/project'
import type { SessionMessageTable, sessions } from '../main/database/schema/session'
import type {
  ApprovalRequest,
  ApprovalResponse,
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  ChatStreamPart,
  ProviderId,
  ProviderStatus
} from '../shared/ai'
import type { FilePreview, FileTreeNode } from '../shared/files'
import type { ProjectKind } from '../shared/project-kind'
import type { ReviewFileDiff, ReviewSummary } from '../shared/review'
import type { TerminalStartResult } from '../shared/terminal'

export type Project = typeof projects.$inferSelect
export type Session = typeof sessions.$inferSelect
export type SessionMessage = typeof SessionMessageTable.$inferSelect

/** A project row as returned by `projects:list`, with its sessions preloaded and stack detected. */
export type ProjectWithSessions = Project & { sessions: Session[]; kind: ProjectKind }

/** A session row returned by `sessions:get`, with its project attached. */
export type SessionWithProject = Session & { project: Project }

export interface PreloadApi {
  projects: {
    list: () => Promise<ProjectWithSessions[]>
    selectFolder: () => Promise<Project | null>
    delete: (id: string) => Promise<void>
    rename: (id: string, name: string) => Promise<Project>
    /** Asks for a destination and writes the project's JSON export; returns the path or null. */
    export: (id: string) => Promise<string | null>
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
    /** Opens the composer's "Images and files" picker. */
    pickAttachments: () => Promise<string[]>
    cancel: (requestId: string) => Promise<void>
    /** Answer a bash approval dialog. */
    respondApproval: (response: ApprovalResponse) => Promise<void>
    /** Subscribe to pending tool approval requests. */
    onApprovalRequest: (listener: (payload: ApprovalRequest) => void) => () => void
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
  files: {
    /** One level of the project tree; subPath is relative to the project root. */
    tree: (directory: string, subPath: string) => Promise<FileTreeNode[]>
    /** A capped text preview of one project file. */
    read: (directory: string, filePath: string) => Promise<FilePreview | null>
  }
  terminal: {
    /** Starts (or reattaches to) the persistent shell for a project directory. */
    start: (directory: string, cols: number, rows: number) => Promise<TerminalStartResult>
    /** Writes user keystrokes to the pty. */
    write: (id: string, data: string) => Promise<void>
    /** Resizes the pty when the pane changes size. */
    resize: (id: string, cols: number, rows: number) => Promise<void>
    /** Kills the pty when the terminal tab closes. */
    stop: (id: string) => Promise<void>
    /** Subscribes to pty output; returns the unsubscribe function. */
    onData: (handler: (id: string, chunk: string) => void) => () => void
  }
  state: {
    /** All persisted UI state at once, for the startup hydrate. */
    getAll: () => Promise<Record<string, string>>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
}

declare global {
  interface Window {
    /** Mirror of @electron-toolkit/preload's electronAPI, kept sandbox-safe. */
    electron: {
      ipcRenderer: import('electron').IpcRenderer
      webFrame: import('electron').WebFrame
      process: NodeJS.Process
    }
    api: PreloadApi
  }
}
