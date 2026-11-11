import { createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon'
import ArrowReloadHorizontalIcon from '@hugeicons/core-free-icons/ArrowReloadHorizontalIcon'
import GlobeIcon from '@hugeicons/core-free-icons/GlobeIcon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'

export interface BrowserPanelProps {
  /** The URL the panel opens with; empty starts on the placeholder. */
  initialUrl?: string
}

/** Only real web URLs may load in the guest; other schemes could reach APIs. */
function safeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim().includes('://') ? input.trim() : `https://${input.trim()}`)

    return /^https?:$/.test(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

/** A webview element, created imperatively since Solid has no intrinsic for it. */
function createWebview(): HTMLElement {
  const element = document.createElement('webview')

  element.setAttribute('partition', 'yoke-browser')
  element.style.width = '100%'
  element.style.height = '100%'
  element.style.display = 'flex'
  element.style.background = 'var(--color-surface, #fff)'

  return element
}

/**
 * The side panel's Browser tab, like opencode's: an isolated guest process
 * rendering a web page under an address bar. Popups and non-web schemes are
 * disabled.
 */
export function BrowserPanel(props: BrowserPanelProps): JSX.Element {
  let host: HTMLDivElement | undefined
  let input: HTMLInputElement | undefined

  const [url, setUrl] = createSignal(props.initialUrl ?? '')
  const [current, setCurrent] = createSignal<string>()
  const [loading, setLoading] = createSignal(false)
  const [failure, setFailure] = createSignal<string>()

  let webview: HTMLElement | undefined

  const navigate = (target: string) => {
    const next = safeUrl(target)

    if (!next) {
      setFailure('Enter a valid http(s) URL.')
      return
    }

    setFailure(undefined)
    setUrl(next)

    if (webview) {
      webview.setAttribute('src', next)
    } else {
      // First navigation creates the guest.
      attach(next)
    }
  }

  const attach = (start: string) => {
    if (!host) return

    const element = createWebview()

    element.setAttribute('src', start)
    element.addEventListener('did-start-loading', () => setLoading(true))
    element.addEventListener('did-stop-loading', () => setLoading(false))
    element.addEventListener('did-navigate', (event) => {
      const target = (event as unknown as { url?: unknown }).url

      if (typeof target === 'string') {
        setCurrent(target)
        setUrl(target)
      }
    })
    element.addEventListener('did-fail-load', (event) => {
      const detail = event as unknown as { errorDescription?: unknown; isMainFrame?: unknown }

      if (detail.isMainFrame && typeof detail.errorDescription === 'string')
        setFailure(detail.errorDescription)
      setLoading(false)
    })

    host.replaceChildren(element)
    webview = element
  }

  onMount(() => {
    const start = props.initialUrl ? safeUrl(props.initialUrl) : null

    if (start) {
      setUrl(start)
      setCurrent(start)
      attach(start)
    }

    onCleanup(() => {
      // Dropping the element destroys the guest webContents.
      webview = undefined
      if (host) host.replaceChildren()
    })
  })

  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Address bar with navigation, like opencode's browser panel. */}
      <div class="flex h-9 shrink-0 items-center gap-1 border-b border-line px-2">
        <button
          type="button"
          aria-label="Go back"
          class="flex size-6 items-center justify-center rounded-[5px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          onClick={() => (webview as unknown as { goBack?: () => void })?.goBack?.()}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={13} />
        </button>
        <button
          type="button"
          aria-label="Go forward"
          class="flex size-6 items-center justify-center rounded-[5px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          onClick={() => (webview as unknown as { goForward?: () => void })?.goForward?.()}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
        </button>
        <button
          type="button"
          aria-label="Reload"
          class="flex size-6 items-center justify-center rounded-[5px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground"
          onClick={() => (webview as unknown as { reload?: () => void })?.reload?.()}
        >
          <HugeiconsIcon icon={loading() ? ArrowReloadHorizontalIcon : GlobeIcon} size={13} />
        </button>

        <label class="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-[5px] bg-surface-mute/70 px-2 text-foreground-muted focus-within:bg-surface-mute">
          <HugeiconsIcon icon={Search01Icon} size={12} class="shrink-0" />
          <input
            ref={input}
            value={url()}
            placeholder="https://localhost:3000"
            aria-label="Address"
            spellcheck={false}
            class="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-foreground outline-0 placeholder:text-foreground-muted/60"
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate(input?.value ?? '')
            }}
          />
        </label>

        <button
          type="button"
          class="shrink-0 rounded-[5px] px-2 py-0.5 text-[12px] font-medium text-foreground-secondary transition hover:bg-surface-mute"
          onClick={() => navigate(input?.value ?? '')}
        >
          Go
        </button>
      </div>

      <div class="relative min-h-0 min-w-0 flex-1">
        <div ref={host} class="absolute inset-0" />
        <Show when={!current()}>
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <HugeiconsIcon icon={GlobeIcon} size={20} class="text-foreground-muted/50" />
            <p class="text-[12px] text-foreground-muted">Type an address to open it here</p>
          </div>
        </Show>
        <Show when={failure()}>
          {(message) => (
            <div class="absolute inset-x-0 bottom-0 bg-danger/5 px-3 py-2 text-[11.5px] text-danger">
              {message()}
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}
