import { createSignal } from 'solid-js'
import { getAppState, setAppState } from '@renderer/lib/app-state'

/** A session that is currently open in the sidebar as a tab. */
export interface SessionTab {
  id: string
  title: string
  projectId: string
  projectName: string
  directory: string
}

const STORAGE_KEY = 'yoke.session-tabs'

function readStoredTabs(): SessionTab[] {
  try {
    const raw = getAppState(STORAGE_KEY)

    if (!raw) return []

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (tab): tab is SessionTab =>
        !!tab &&
        typeof tab === 'object' &&
        typeof tab.id === 'string' &&
        typeof tab.title === 'string' &&
        typeof tab.projectId === 'string' &&
        typeof tab.projectName === 'string' &&
        typeof tab.directory === 'string'
    )
  } catch {
    return []
  }
}

function persist(tabs: SessionTab[]): void {
  setAppState(STORAGE_KEY, JSON.stringify(tabs))
}

const [tabs, setTabs] = createSignal<SessionTab[]>(readStoredTabs())

export const sessionTabs = tabs

/**
 * Adds a session to the tab list, or refreshes its metadata when it is already
 * open. Tabs keep their position so switching around does not reshuffle them.
 */
export function openSessionTab(tab: SessionTab): void {
  setTabs((previous) => {
    const index = previous.findIndex((item) => item.id === tab.id)
    const next =
      index >= 0
        ? previous.map((item, position) => (position === index ? { ...item, ...tab } : item))
        : [...previous, tab]

    persist(next)

    return next
  })
}

/** Updates an open tab without adding it (used when a session title changes). */
export function updateSessionTab(id: string, patch: Partial<Omit<SessionTab, 'id'>>): void {
  setTabs((previous) => {
    const index = previous.findIndex((item) => item.id === id)

    if (index < 0) return previous

    const next = previous.map((item, position) =>
      position === index ? { ...item, ...patch } : item
    )

    persist(next)

    return next
  })
}

export function closeSessionTab(id: string): void {
  setTabs((previous) => {
    const next = previous.filter((item) => item.id !== id)

    persist(next)

    return next
  })
}

/** Drops tabs whose sessions no longer exist (deleted or project removed). */
export function pruneSessionTabs(existingIds: Set<string>, keepIds: Set<string> = new Set()): void {
  setTabs((previous) => {
    const next = previous.filter((item) => existingIds.has(item.id) || keepIds.has(item.id))

    if (next.length === previous.length) return previous

    persist(next)

    return next
  })
}
