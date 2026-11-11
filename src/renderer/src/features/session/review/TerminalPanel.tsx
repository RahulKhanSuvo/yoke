import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

export interface TerminalPanelProps {
  /** The session's project root; the shell starts there. */
  directory: string
  /** Whether this tab is the visible one; xterm can only measure a visible pane. */
  active: boolean
}

/**
 * The side panel's Terminal tab: a real shell (node-pty) rendered by xterm.js,
 * like opencode's terminal panel. The shell persists per project, so closing
 * the tab and reopening it resumes where the user left off.
 */
export function TerminalPanel(props: TerminalPanelProps): JSX.Element {
  let container: HTMLDivElement | undefined

  const [error, setError] = createSignal<string>()
  const [ptyId, setPtyId] = createSignal<string>()

  onMount(() => {
    if (!container) return

    const terminal = new Terminal({
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink: true,
      theme: {
        background: '#00000000',
        foreground: '#3b3b3b'
      }
    })
    const fit = new FitAddon()

    terminal.loadAddon(fit)
    terminal.open(container)
    terminal.onData((data) => {
      const id = ptyId()

      if (id) void window.api.terminal.write(id, data)
    })

    let unsubscribe: (() => void) | undefined
    let disposed = false

    const refit = () => {
      if (!props.active) return

      const id = ptyId()

      if (!id) return

      try {
        fit.fit()
        void window.api.terminal.resize(id, terminal.cols, terminal.rows)
      } catch {
        // The pane can be mid-layout; the next resize retries.
      }
    }

    const observer = new ResizeObserver(() => refit())

    observer.observe(container)
    unsubscribe = window.api.terminal.onData((id, chunk) => {
      if (id !== ptyId()) return

      terminal.write(chunk)
    })

    void window.api.terminal.start(props.directory, terminal.cols || 80, terminal.rows || 24).then(
      (result) => {
        if (disposed) return

        if (!result.id) {
          setError(`No shell available for this project (${props.directory}).`)
          return
        }

        setPtyId(result.id)
        refit()
        terminal.focus()
      },
      () => setError('Could not start the terminal.')
    )

    // Refit when the tab becomes visible again after being hidden.
    createEffect(() => {
      if (props.active) requestAnimationFrame(refit)
    })

    onCleanup(() => {
      disposed = true
      observer.disconnect()
      unsubscribe?.()
      terminal.dispose()
      // The pty itself stays alive in the main process, keyed by the project.
    })
  })

  return (
    <div class="relative min-h-0 min-w-0 flex-1 bg-surface">
      <Show
        when={!error()}
        fallback={
          <div class="flex h-full items-center justify-center px-6 text-center text-[12px] text-foreground-muted">
            {error()}
          </div>
        }
      >
        <div ref={container} class="absolute inset-0 p-2" />
      </Show>
    </div>
  )
}
