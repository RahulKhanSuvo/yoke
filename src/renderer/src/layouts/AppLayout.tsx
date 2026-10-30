import type { ParentProps } from 'solid-js'
import { createSignal } from 'solid-js'
import { AppSidebar } from './AppSidebar'

export default function AppLayout(props: ParentProps) {
  const [sidebarWidth, setSidebarWidth] = createSignal(250)

  let startX = 0
  let startWidth = 0

  const handlePointerDown = (event: PointerEvent) => {
    startX = event.clientX
    startWidth = sidebarWidth()

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = startWidth + event.clientX - startX
      setSidebarWidth(Math.min(600, Math.max(200, nextWidth)))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div
      class="grid h-screen overflow-hidden"
      style={{
        'grid-template-columns': `${sidebarWidth()}px 4px minmax(0, 1fr)`
      }}
    >
      <AppSidebar />

      <div class="cursor-col-resize" onPointerDown={handlePointerDown} />

      <main class="min-w-0 overflow-auto bg-amber-200">{props.children}</main>
    </div>
  )
}
