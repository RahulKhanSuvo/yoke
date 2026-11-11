import { ipcMain } from 'electron'
import { deleteAppState, getAllAppState, setAppState } from '../services/app-state.service'

export function registerStateIpc(): void {
  ipcMain.handle('state:get-all', () => {
    return getAllAppState()
  })
  ipcMain.handle('state:set', (_, key: string, value: string) => {
    setAppState(key, value)
  })
  ipcMain.handle('state:delete', (_, key: string) => {
    deleteAppState(key)
  })
}
