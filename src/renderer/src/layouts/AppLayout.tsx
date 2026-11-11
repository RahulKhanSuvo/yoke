import type { ParentProps } from 'solid-js'
import { createEffect } from 'solid-js'
import { useLocation } from '@solidjs/router'
import { getAppState, setAppState } from '@renderer/lib/app-state'
import { SidebarProvider } from '../context/sidebar-state'
import { AppShell } from './AppShell'

export default function AppLayout(props: ParentProps) {
  const location = useLocation()

  // Remember the last route, so the app reopens where it was left — like opencode's tabs.
  createEffect(() => {
    const pathname = location.pathname

    if (getAppState('yoke.route') !== pathname) setAppState('yoke.route', pathname)
  })

  return (
    <SidebarProvider>
      <AppShell>{props.children}</AppShell>
    </SidebarProvider>
  )
}
