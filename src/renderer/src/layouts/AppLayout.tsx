import type { ParentProps } from 'solid-js'
import { SidebarProvider } from '../context/sidebar-state'
import { AppShell } from './AppShell'
export default function AppLayout(props: ParentProps) {
  return (
    <SidebarProvider>
      <AppShell>{props.children}</AppShell>
    </SidebarProvider>
  )
}
