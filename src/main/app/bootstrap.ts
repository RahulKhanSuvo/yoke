import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { registerIpcHandlers, stopTerminalsOnQuit } from '../ipc'
import { registerAppLifecycle } from './lifecycle'
import { createMainWindow } from '../windows/main.window'

export async function bootstrap(): Promise<void> {
  await app.whenReady()

  // Set the application identifier.
  electronApp.setAppUserModelId('com.yoke')

  // Configure Electron Toolkit shortcuts.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register application IPC handlers.
  registerIpcHandlers()

  // Register application lifecycle events.
  registerAppLifecycle(createMainWindow)

  // The main process owns the ptys; make sure none outlive the app.
  app.on('before-quit', stopTerminalsOnQuit)

  // Create the initial application window.
  createMainWindow()
}
