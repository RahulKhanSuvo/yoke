import { BrowserWindow, session, shell } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

import icon from '../../../resources/icon.png?asset'

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,

    ...(process.platform === 'linux' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // The Browser panel embeds dev-server previews in an isolated guest process.
      webviewTag: true
    }
  })

  // Show the window when the renderer is ready.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  const openExternally = (url: string): void => {
    // Only real web URLs may reach the OS; other schemes could launch apps.
    if (/^https?:/i.test(url)) void shell.openExternal(url)
  }

  // Open external links in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternally(url)
    return { action: 'deny' }
  })

  // In-window navigation stays on the local app; anything else opens outside.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL']

    if (is.dev && devUrl && url.startsWith(devUrl)) return

    event.preventDefault()
    openExternally(url)
  })

  // The app loads no web content, so every permission request is denied.
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })

  // The Browser panel's guest runs in its own partition; deny there too.
  session
    .fromPartition('yoke-browser')
    .setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false)
    })

  // Load the renderer application.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
