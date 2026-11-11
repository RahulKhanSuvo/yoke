import './assets/main.css'

import { render } from 'solid-js/web'

import { PixelText } from './components/ui/PixelText'
import { loadAppState } from './lib/app-state'

const root = document.getElementById('root') as HTMLElement

// Launch splash: the wordmark shows while UI state hydrates, before the app tree loads.
const disposeSplash = render(
  () => (
    <div class="flex h-screen w-screen items-center justify-center bg-background">
      <PixelText text="yoke" pixel={10} class="animate-pulse text-foreground-muted/40" />
    </div>
  ),
  root
)

// UI state lives in the main process's SQLite `app_state` table. It loads once
// before the app tree is imported, so every store's module-level initializer
// reads hydrated values — the same gate as opencode's persistence `ready`.
const SPLASH_MIN_MS = 700
const splashShownAt = Date.now()

loadAppState()
  .catch(() => undefined)
  .then(() => import('./app/AppRouter'))
  .then(async (module) => {
    // Hydration is near-instant; keep the wordmark up long enough to be seen.
    const remaining = SPLASH_MIN_MS - (Date.now() - splashShownAt)
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining))

    disposeSplash()
    render(() => <module.default />, root)
  })
