/** The terminal panel's IPC surface. */
export interface TerminalStartResult {
  /** The pty session id, or null when the directory is not a project root. */
  id: string | null
}
