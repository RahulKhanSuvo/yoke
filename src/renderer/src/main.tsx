import './assets/main.css'

import { render } from 'solid-js/web'

import { loadAppState } from './lib/app-state'

// UI state lives in the main process's SQLite `app_state` table. It loads once
// before the app tree is imported, so every store's module-level initializer
// reads hydrated values — the same gate as opencode's persistence `ready`.
loadAppState()
  .catch(() => undefined)
  .then(() => import('./app/AppRouter'))
  .then((module) => {
    render(() => <module.default />, document.getElementById('root') as HTMLElement)
  })
