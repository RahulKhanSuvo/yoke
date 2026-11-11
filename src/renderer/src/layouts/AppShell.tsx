import { createEffect, createSignal, ParentProps, Show } from 'solid-js'
import { makeEventListener } from '@solid-primitives/event-listener'
import { IconButton } from '@renderer/components/ui/IconButton'
import { ResizeHandle } from '@renderer/components/ui/ResizeHandle'
import { SidebarClosedIcon } from '@renderer/components/ui/SidebarIcons'
import { AppSidebar } from './AppSidebar'
import { SessionSearchDialog } from '@renderer/features/search/SessionSearchDialog'
import { toggleSearch } from '@renderer/features/search/search-store'
import { useSidebar } from '@renderer/context/sidebar-state'

const DEFAULT_WIDTH = 276
const MIN_WIDTH = 80
const MAX_WIDTH = 600
/** Dragging the handle below this width collapses the sidebar on release. */
const COLLAPSE_THRESHOLD = 80

export function AppShell(props: ParentProps) {
  const sidebar = useSidebar()
  const collapsed = sidebar.collapsed

  const [sidebarWidth, setSidebarWidth] = createSignal(DEFAULT_WIDTH)
  const [resizing, setResizing] = createSignal(false)
  const [nearCollapse, setNearCollapse] = createSignal(false)

  // The width to restore when re-expanding, kept while the sidebar is collapsed or dragged thin.
  let lastWidth = DEFAULT_WIDTH

  const width = () => (collapsed() ? 0 : sidebarWidth())

  const toggleSidebar = () => sidebar.toggle()

  createEffect(() => {
    makeEventListener(document, 'keydown', (event) => {
      // Toggle the sidebar, like opencode's `sidebar.toggle` command.
      if (
        event.key.toLowerCase() === 'b' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        toggleSidebar()
      }

      // The session-search palette, like opencode's search command.
      if (
        event.key.toLowerCase() === 'k' &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        toggleSearch()
      }
    })
  })

  // --- Resize / collapse ---

  const handleResize = (size: number) => {
    setSidebarWidth(size)

    if (collapsed()) {
      // Dragging the collapsed handle to the right re-expands past the minimum.
      if (size > MIN_WIDTH) sidebar.setCollapsed(false)

      return
    }

    if (size >= COLLAPSE_THRESHOLD) lastWidth = size
  }

  const handleCollapse = () => {
    setSidebarWidth(lastWidth)
    sidebar.setCollapsed(true)
    setNearCollapse(false)
  }

  return (
    <div
      class="relative grid h-screen overflow-hidden"
      style={{
        'grid-template-columns': `${width()}px 4px minmax(0, 1fr)`,
        transition: resizing() ? 'none' : 'grid-template-columns 200ms ease'
      }}
    >
      <AppSidebar />

      <ResizeHandle
        direction="horizontal"
        edge="end"
        size={width()}
        min={MIN_WIDTH}
        max={MAX_WIDTH}
        collapseThreshold={COLLAPSE_THRESHOLD}
        onResize={handleResize}
        onCollapse={handleCollapse}
        onCollapseChange={setNearCollapse}
        onDraggingChange={setResizing}
        class="cursor-col-resize"
        classList={{ 'bg-danger/60': nearCollapse() }}
      />

      <main class="relative min-w-0 overflow-auto rounded-xl border border-line">
        {/* The collapsed sidebar's expand toggle floats over the content's start edge; headers keep its room,
            so it never covers the session's icon or title. */}
        <Show when={collapsed()}>
          <div class="absolute top-2.5 left-2.5 z-40">
            <IconButton
              label="Expand sidebar"
              aria-expanded={false}
              class="p-1"
              onClick={toggleSidebar}
            >
              <SidebarClosedIcon size={16} class="text-foreground-muted" />
            </IconButton>
          </div>
        </Show>

        {props.children}
      </main>

      {/* The session-search palette, opened from the sidebar or Ctrl K. */}
      <SessionSearchDialog />
    </div>
  )
}
