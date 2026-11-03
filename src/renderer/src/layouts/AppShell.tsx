import { createEffect, createSignal, ParentProps, Show } from 'solid-js'
import { makeEventListener } from '@solid-primitives/event-listener'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import { PanelLeftIcon } from '@hugeicons/core-free-icons'
import { IconButton } from '@renderer/components/ui/IconButton'
import { ResizeHandle } from '@renderer/components/ui/ResizeHandle'
import { AppSidebar } from './AppSidebar'
import { useSidebar } from '@renderer/context/sidebar-state'

const DEFAULT_WIDTH = 276
const MIN_WIDTH = 80
const MAX_WIDTH = 600
/** Dragging the handle below this width collapses the sidebar on release. */
const COLLAPSE_THRESHOLD = 80
/** How close to the window's start edge the pointer may rest to peek the collapsed sidebar. */
const EDGE_ZONE = 24
/** The top corner (traffic lights / window controls) is exempt from the edge peek. */
const HEADER_ZONE = 56
/** Dwell before the edge peek opens, in ms. */
const EDGE_DWELL = 40
/** Dwell before hovering the collapsed toggle peeks, in ms. */
const TOGGLE_DWELL = 500
/** Extra slack around the peeked sidebar the pointer may wander into. */
const PEEK_MARGIN = 15
/** Grace before a pointer outside the peek closes it, in ms. */
const PEEK_GRACE = 100
export function AppShell(props: ParentProps) {
  const sidebar = useSidebar()
  const collapsed = sidebar.collapsed

  const [sidebarWidth, setSidebarWidth] = createSignal(DEFAULT_WIDTH)
  const [peeking, setPeeking] = createSignal(false)
  const [resizing, setResizing] = createSignal(false)
  const [nearCollapse, setNearCollapse] = createSignal(false)

  // The width to restore when re-expanding, kept while the sidebar is collapsed or dragged thin.
  let lastWidth = DEFAULT_WIDTH
  let peekPanel: HTMLDivElement | undefined
  let edgeDwell: ReturnType<typeof setTimeout> | undefined
  let toggleDwell: ReturnType<typeof setTimeout> | undefined
  let peekClose: ReturnType<typeof setTimeout> | undefined
  let pointer: { x: number; y: number } | undefined
  let pressed = false

  const width = () => (collapsed() ? 0 : sidebarWidth())

  // --- Hover peek: while collapsed, the sidebar slides in over the content without moving the layout. ---

  const cancelEdgeDwell = () => {
    clearTimeout(edgeDwell)
    edgeDwell = undefined
  }
  const cancelToggleDwell = () => {
    clearTimeout(toggleDwell)
    toggleDwell = undefined
  }
  const cancelPeekClose = () => {
    clearTimeout(peekClose)
    peekClose = undefined
  }

  const hidePeek = () => {
    cancelEdgeDwell()
    cancelToggleDwell()
    cancelPeekClose()
    setPeeking(false)
  }

  const toggleSidebar = () => {
    hidePeek()
    sidebar.toggle()
  }

  const atEdge = () => !!pointer && pointer.x <= EDGE_ZONE && pointer.y >= HEADER_ZONE

  const inPeek = () => {
    if (!pointer || !peekPanel) return false
    const box = peekPanel.getBoundingClientRect()
    return (
      pointer.x >= box.left - PEEK_MARGIN &&
      pointer.x <= box.right + PEEK_MARGIN &&
      pointer.y >= box.top - PEEK_MARGIN &&
      pointer.y <= box.bottom + PEEK_MARGIN
    )
  }

  const schedulePeekClose = () => {
    peekClose ??= setTimeout(() => {
      peekClose = undefined
      if (!inPeek() && !pressed && collapsed()) setPeeking(false)
    }, PEEK_GRACE)
  }

  // The state of the sidebar is shared, so closing it from anywhere drops a pending peek.
  createEffect(() => {
    if (!collapsed()) hidePeek()
  })

  createEffect(() => {
    makeEventListener(
      document,
      'pointermove',
      (event) => {
        if (event.pointerType === 'touch') return
        pointer = { x: event.clientX, y: event.clientY }

        if (!collapsed() || resizing()) {
          cancelEdgeDwell()
          cancelPeekClose()
          return
        }

        if (peeking()) {
          if (inPeek() || pressed) cancelPeekClose()
          else schedulePeekClose()

          return
        }

        if (atEdge() && !pressed) {
          edgeDwell ??= setTimeout(() => {
            edgeDwell = undefined
            if (atEdge() && !pressed && collapsed()) setPeeking(true)
          }, EDGE_DWELL)
        } else {
          cancelEdgeDwell()
        }
      },
      { passive: true, capture: true }
    )
    makeEventListener(
      document,
      'pointerdown',
      (event) => {
        if (event.pointerType !== 'touch') pressed = true
        cancelEdgeDwell()
        cancelToggleDwell()
      },
      { passive: true, capture: true }
    )
    makeEventListener(window, 'pointerup', () => (pressed = false), { passive: true })
    makeEventListener(window, 'pointercancel', () => (pressed = false), { passive: true })
    makeEventListener(document, 'pointerleave', () => {
      pointer = undefined
      if (peeking()) schedulePeekClose()
    })
    makeEventListener(document, 'keydown', (event) => {
      if (event.key === 'Escape' && peeking()) {
        hidePeek()

        return
      }

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
    })
    makeEventListener(window, 'blur', hidePeek)
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
        <Show when={collapsed()}>
          <div class="absolute top-2.5 left-2.5 z-40">
            <IconButton
              label="Expand sidebar"
              aria-expanded={false}
              class="p-1"
              onClick={toggleSidebar}
              onMouseEnter={() => {
                toggleDwell ??= setTimeout(() => {
                  toggleDwell = undefined
                  if (collapsed()) setPeeking(true)
                }, TOGGLE_DWELL)
              }}
              onMouseLeave={cancelToggleDwell}
            >
              <HugeiconsIcon icon={PanelLeftIcon} size={16} class="text-foreground-muted" />
            </IconButton>
          </div>
        </Show>

        {props.children}
      </main>

      {/* The collapsed sidebar, peeking in over the content on hover. */}
      <Show when={collapsed()}>
        <div
          ref={peekPanel}
          aria-hidden={!peeking()}
          class="absolute inset-y-0 left-0 z-30 overflow-hidden border-r border-line bg-surface-soft shadow-xl transition-transform duration-200 ease-out"
          style={{
            width: `${sidebarWidth()}px`,
            transform: peeking() ? 'translateX(0)' : 'translateX(-100%)',
            'pointer-events': peeking() ? 'auto' : 'none'
          }}
        >
          <AppSidebar />
        </div>
      </Show>
    </div>
  )
}
