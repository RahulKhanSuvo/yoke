import {
  createEffect,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  Show,
  type JSX
} from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { ResizeHandle } from '@renderer/components/ui/ResizeHandle'
import { ReviewContent } from './ReviewContent'
import { ReviewLaunchers } from './ReviewLaunchers'

const DEFAULT_WIDTH = 520
const MIN_WIDTH = 340
const MAX_WIDTH = 760
/** The chat keeps at least this much room while the pane is dragged. */
const MIN_CHAT_WIDTH = 400
const WIDTH_KEY = 'yoke.review-width'
const TAB_KEY = 'yoke.review-tab'

/** Which tab the side panel shows; 'new' is opencode's launcher view. */
export type ReviewTab = 'new' | 'review'

function readWidth(): number {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY))

    if (Number.isFinite(stored) && stored > 0) {
      return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored))
    }
  } catch {
    // Storage can be unavailable; the default still works.
  }

  return DEFAULT_WIDTH
}

function readTab(): ReviewTab {
  try {
    return localStorage.getItem(TAB_KEY) === 'review' ? 'review' : 'new'
  } catch {
    return 'new'
  }
}

/** Marks the Review tab as open so the next mounted panel selects it. */
export function markReviewTabOpen(): void {
  try {
    localStorage.setItem(TAB_KEY, 'review')
  } catch {
    // Storage can be unavailable.
  }
}

function TabPill(props: {
  icon: JSX.Element
  label: string
  active: boolean
  onClose: () => void
  onSelect?: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      class="flex h-6 shrink-0 items-center gap-2 rounded-[6px] border px-2 text-[12.5px] font-medium transition-colors"
      classList={{
        'border-line/60 bg-surface-mute text-foreground': props.active,
        'border-transparent text-foreground-muted hover:text-foreground': !props.active
      }}
      aria-current={props.active ? 'page' : undefined}
      onClick={props.onSelect}
    >
      {props.icon}
      <span class="max-w-40 truncate">{props.label}</span>
      <IconButton
        label={`Close ${props.label}`}
        class="p-0.5 text-foreground-muted hover:bg-foreground/[0.06] hover:text-foreground"
        onClick={props.onClose}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} />
      </IconButton>
    </button>
  )
}

export interface ReviewSidePanelProps {
  /** The session's project root, which is also the git working tree. */
  directory: string
  /** Bump after a turn so the pane picks up the files the agent touched. */
  refreshKey: number
  /** Closes the whole region, from the session header toggle or the strip. */
  onClose: () => void
}

/**
 * The session's right-side panel, like opencode's side region: a floating
 * bordered card with a compact pill tab strip. With no tab open it shows the
 * New tab launcher view; the Review tab lists working tree changes.
 */
export function ReviewSidePanel(props: ReviewSidePanelProps): JSX.Element {
  const [width, setWidth] = createSignal(readWidth())
  const [tab, setTab] = createSignal<ReviewTab>(readTab())
  const [availableWidth, setAvailableWidth] = createSignal(0)

  let panelRef: HTMLElement | undefined

  // The pane and the chat share one row; measure the row rather than the window
  // so the sidebar's width is accounted for.
  onMount(() => {
    const parent = panelRef?.parentElement

    if (!parent) return

    const observer = new ResizeObserver(() => setAvailableWidth(parent.clientWidth))
    observer.observe(parent)
    setAvailableWidth(parent.clientWidth)

    onCleanup(() => observer.disconnect())
  })

  const maxWidth = () => {
    const available = availableWidth()

    if (!available) return MAX_WIDTH

    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, available - MIN_CHAT_WIDTH))
  }

  createEffect(() => {
    try {
      localStorage.setItem(WIDTH_KEY, String(width()))
      localStorage.setItem(TAB_KEY, tab())
    } catch {
      // Persisting is best-effort.
    }
  })

  // Keep the chat readable when the window shrinks under the stored width.
  createEffect(() => {
    const max = maxWidth()

    if (width() > max) setWidth(max)
  })

  // The launcher row shows the change count, so it needs its own summary query.
  const [summary] = createResource(
    () => (tab() === 'new' ? props.directory : undefined),
    (directory) => window.api.review.summary(directory)
  )

  return (
    <aside ref={panelRef} class="flex min-h-0 shrink-0" style={{ width: `${width()}px` }}>
      <ResizeHandle
        direction="horizontal"
        edge="start"
        size={width()}
        min={MIN_WIDTH}
        max={maxWidth()}
        onResize={setWidth}
        class="w-1 shrink-0 cursor-col-resize bg-transparent"
      />

      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-line bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Compact pill tab strip, like opencode's side region tabs. */}
        <div class="flex h-12 shrink-0 items-center gap-1.5 pb-0 pe-2 ps-3">
          <Show
            when={tab() === 'review'}
            fallback={
              <TabPill icon={undefined} label="New tab" active={true} onClose={props.onClose} />
            }
          >
            <TabPill
              icon={<HugeiconsIcon icon={FileDiffIcon} size={13} class="text-foreground-muted" />}
              label="Review"
              active={true}
              onClose={() => setTab('new')}
            />
          </Show>

          <IconButton
            label="Open new tab view"
            class="p-1 text-foreground-muted hover:bg-surface-mute hover:text-foreground"
            onClick={() => setTab('new')}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
          </IconButton>
        </div>

        <Show
          when={tab() === 'review'}
          fallback={
            <ReviewLaunchers
              filesChanged={summary()?.files.length}
              onOpenReview={() => setTab('review')}
            />
          }
        >
          <ReviewContent
            directory={props.directory}
            refreshKey={props.refreshKey}
            width={width()}
          />
        </Show>
      </div>
    </aside>
  )
}
