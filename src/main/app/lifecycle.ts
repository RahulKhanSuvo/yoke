import { app, BrowserWindow } from 'electron'

type CreateWindow = () => BrowserWindow

export function registerAppLifecycle(createWindow: CreateWindow): void {
  // Re-create the main window when the application is activated.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Quit the application when all windows are closed.
  // macOS applications normally remain active.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
