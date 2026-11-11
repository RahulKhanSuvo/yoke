import { BrowserWindow, ipcMain } from 'electron'

import {
  resizeTerminal,
  startTerminal,
  stopAllTerminals,
  stopTerminal,
  writeTerminal
} from '../services/terminal.service'

/** Streams a pty's output to every window; ids let the panel filter its session. */
function sendData(id: string, chunk: string): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('terminal:data', id, chunk)
  }
}

export function registerTerminalIpc(): void {
  ipcMain.handle('terminal:start', (_, directory: string, cols: number, rows: number) => {
    return startTerminal(directory, cols, rows, sendData)
  })

  ipcMain.handle('terminal:write', (_, id: string, data: string) => {
    writeTerminal(id, data)
  })

  ipcMain.handle('terminal:resize', (_, id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows)
  })

  ipcMain.handle('terminal:stop', (_, id: string) => {
    stopTerminal(id)
  })
}

/** The main process owns the ptys, so they die with the app. */
export function stopTerminalsOnQuit(): void {
  stopAllTerminals()
}
