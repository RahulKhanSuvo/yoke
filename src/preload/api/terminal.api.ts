import { ipcRenderer } from 'electron'

import type { TerminalStartResult } from '../../shared/terminal'

export const terminalApi = {
  /** Starts (or reattaches to) the persistent shell for a project directory. */
  start: async (directory: string, cols: number, rows: number): Promise<TerminalStartResult> => ({
    id: await ipcRenderer.invoke('terminal:start', directory, cols, rows)
  }),

  /** Writes user keystrokes to the pty. */
  write: (id: string, data: string): Promise<void> =>
    ipcRenderer.invoke('terminal:write', id, data),

  /** Resizes the pty when the pane changes size. */
  resize: (id: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke('terminal:resize', id, cols, rows),

  /** Kills the pty when the terminal tab closes. */
  stop: (id: string): Promise<void> => ipcRenderer.invoke('terminal:stop', id),

  /** Subscribes to pty output; returns the unsubscribe function. */
  onData: (handler: (id: string, chunk: string) => void): (() => void) => {
    const listener = (_event: unknown, id: string, chunk: string): void => handler(id, chunk)

    ipcRenderer.on('terminal:data', listener)

    return () => {
      ipcRenderer.removeListener('terminal:data', listener)
    }
  }
}
