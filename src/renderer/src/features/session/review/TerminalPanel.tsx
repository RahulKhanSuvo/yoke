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

/** ANSI palette that stays readable on both the light and dark app themes. */
const ANSI: Record<string, string> = {
  black: '#27272a',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#c026d3',
  cyan: '#0891b2',
  white: '#e4e4e7',
  brightBlack: '#52525b',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#e879f9',
  brightCyan: '#22d3ee',
  brightWhite: '#fafafa'
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
  /** Output that arrives while the start IPC is still resolving; flushed once the id is known. */
  let buffered: Array<[string, string]> = []

  onMount(() => {
    if (!container) return

    // The terminal follows the app theme instead of forcing black, like
    // opencode's terminal panel.
    const styles = getComputedStyle(container)
    const surface = styles.getPropertyValue('--color-surface').trim() || '#ffffff'
    const foreground = styles.getPropertyValue('--color-foreground').trim() || '#27272a'

    const terminal = new Terminal({
      fontSize: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink: true,
      theme: {
        background: surface,
        foreground,
        cursor: foreground,
        cursorAccent: surface,
        selectionBackground: `${foreground}22`,
        ...ANSI
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
      const current = ptyId()

      if (!current) {
        // The start IPC is still resolving; keep the shell's first output.
        buffered.push([id, chunk])
        return
      }

      if (id !== current) return

      terminal.write(chunk)
    })

    void window.api.terminal.start(props.directory, terminal.cols || 80, terminal.rows || 24).then(
      (result) => {
        if (disposed) return

        if (!result.id) {
          setError('No shell available for this project.')
          return
        }

        setPtyId(result.id)

        // Replay whatever the shell printed while the id was in flight.
        for (const [id, chunk] of buffered) if (id === result.id) terminal.write(chunk)
        buffered = []

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
      buffered = []
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
