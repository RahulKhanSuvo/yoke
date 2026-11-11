/**
 * Renderer access to the main process's `app_state` SQLite table — Yoke's
 * equivalent of opencode's desktop storage. State hydrates once at startup
 * (before the app tree is imported, see `main.tsx`), then reads are
 * synchronous from the in-memory copy and writes fire-and-forget to the
 * database, like opencode's `persisted()` stores.
 */
import { createSignal } from 'solid-js'

let state: Record<string, string> = {}

const [ready, setReady] = createSignal(false)

/**
 * Keys the renderer has never persisted in the database, seeded once from old
 * localStorage values. The side-panel tab record is deliberately not seeded:
 * its old `yoke.session-tabs` key was shared with the session strip and both
 * writers clobbered each other.
 */
const LEGACY_SEEDS: Array<{
  key: string
  /** Optional guard on the legacy shape. */ accept?: (value: string) => boolean
}> = [
  { key: 'yoke.sidebar.collapsed' },
  { key: 'yoke.ai.selected-model' },
  { key: 'yoke.ai.agent' },
  { key: 'yoke.review-open' },
  { key: 'yoke.review-diff-style' },
  { key: 'yoke.review-expand-mode' },
  { key: 'yoke.review-width' },
  // The session strip's tab list; the side panel's record was an object under the same key.
  { key: 'yoke.session-tabs', accept: (value) => value.trimStart().startsWith('[') }
]

/** Loads every persisted value once, seeding legacy localStorage state the database has never seen. */
export async function loadAppState(): Promise<void> {
  try {
    state = (await window.api.state.getAll()) ?? {}
  } catch {
    state = {}
  }

  for (const seed of LEGACY_SEEDS) {
    if (seed.key in state) continue

    try {
      const legacy = localStorage.getItem(seed.key)

      if (legacy === null || (seed.accept && !seed.accept(legacy))) continue

      state[seed.key] = legacy
      void window.api.state.set(seed.key, legacy).catch(() => undefined)
    } catch {
      // localStorage may be unavailable; the default value still works.
    }
  }

  setReady(true)
}

/** Whether startup hydration finished; the app tree only renders once it has. */
export function appStateReady(): boolean {
  return ready()
}

/** Reads one persisted value synchronously from the hydrated copy. */
export function getAppState(key: string): string | null {
  return key in state ? state[key] : null
}

/** Updates one value in memory and in the database. */
export function setAppState(key: string, value: string): void {
  state[key] = value
  void window.api.state.set(key, value).catch(() => undefined)
}

/** Removes one value from memory and from the database. */
export function deleteAppState(key: string): void {
  delete state[key]
  void window.api.state.delete(key).catch(() => undefined)
}
