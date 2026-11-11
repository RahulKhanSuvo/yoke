import { getAppState, setAppState } from '@renderer/lib/app-state'
import {
  createContext,
  createEffect,
  createSignal,
  useContext,
  type ParentProps,
  type Setter
} from 'solid-js'

const STORAGE_KEY = 'yoke.sidebar.collapsed'

export interface SidebarState {
  /** Whether the sidebar is collapsed against the window's start edge. */
  collapsed: () => boolean
  setCollapsed: Setter<boolean>
  toggle: () => void
}

const SidebarContext = createContext<SidebarState>()

function readStored(): boolean {
  return getAppState(STORAGE_KEY) === 'true'
}

/** Holds the sidebar's open/collapsed state for the whole shell, like opencode's `appearance.sidebarOpen`. */
export function SidebarProvider(props: ParentProps) {
  const [collapsed, setCollapsed] = createSignal(readStored())

  const state: SidebarState = {
    collapsed,
    setCollapsed,
    toggle: () => setCollapsed((value) => !value)
  }

  // Persist the state across restarts, like opencode's settings store.
  createEffect(() => {
    setAppState(STORAGE_KEY, String(collapsed()))
  })

  return <SidebarContext.Provider value={state}>{props.children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarState {
  const state = useContext(SidebarContext)
  if (!state) throw new Error('useSidebar must be used within a SidebarProvider')
  return state
}
