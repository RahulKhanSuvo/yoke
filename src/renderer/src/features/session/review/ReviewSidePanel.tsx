import {
  createEffect,
  createResource,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX
} from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import GlobeIcon from '@hugeicons/core-free-icons/GlobeIcon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import TerminalIcon from '@hugeicons/core-free-icons/TerminalIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { ResizeHandle } from '@renderer/components/ui/ResizeHandle'
import { BrowserPanel } from './BrowserPanel'
import { FilesPanel } from './FilesPanel'
import { ReviewContent } from './ReviewContent'
import { ReviewLaunchers } from './ReviewLaunchers'
import { TerminalPanel } from './TerminalPanel'

const DEFAULT_WIDTH = 520
const MIN_WIDTH = 340
const MAX_WIDTH = 760
/** The chat keeps at least this much room while the pane is dragged. */
const MIN_CHAT_WIDTH = 400
const WIDTH_KEY = 'yoke.review-width'
const TABS_KEY = 'yoke.side-tabs'
const ACTIVE_KEY = 'yoke.side-active'

/** The panel kinds the side region can host, like opencode's built-ins. */
export type SideTabKind = 'review' | 'files' | 'terminal' | 'browser'

const SIDE_TAB_KINDS: SideTabKind[] = ['review', 'files', 'terminal', 'browser']

const TAB_META: Record<SideTabKind, { label: string }> = {
  review: { label: 'Review' },
  files: { label: 'Files' },
  terminal: { label: 'Terminal' },
  browser: { label: 'Browser' }
}

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

function readTabs(): SideTabKind[] {
  try {
    const stored = localStorage.getItem(TABS_KEY)

    if (stored) {
      const parsed = JSON.parse(stored) as unknown

      if (
        Array.isArray(parsed) &&
        parsed.every((kind) => SIDE_TAB_KINDS.includes(kind as SideTabKind))
      ) {
        return [...new Set(parsed as SideTabKind[])]
      }
    }
  } catch {
    // Storage can be unavailable; the default still works.
  }

  return []
}

/** The launcher view shows when no tab is open. */
function readActive(): SideTabKind | undefined {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY) as SideTabKind | null

    return stored && SIDE_TAB_KINDS.includes(stored) ? stored : undefined
  } catch {
    return undefined
  }
}

/** The open side tabs and the selected one, shared so shortcuts reach the mounted panel. */
const [tabs, setTabs] = createSignal<SideTabKind[]>(readTabs())
const [active, setActive] = createSignal<SideTabKind | undefined>(readActive())

/** Adds a tab of `kind` (if needed) and selects it, for shortcuts and links. */
export function ensureSideTab(kind: SideTabKind): void {
  setTabs((previous) => (previous.includes(kind) ? previous : [...previous, kind]))
  setActive(kind)
}

/** Opens a tab from the strip's "+" menu or a launcher row. */
function addSideTab(kind: SideTabKind): void {
  ensureSideTab(kind)
}

/** Closes one tab; closing the last one returns to the launcher view. */
function closeSideTab(kind: SideTabKind): void {
  const index = tabs().indexOf(kind)
  const remaining = tabs().filter((tab) => tab !== kind)

  setTabs(remaining)

  if (active() === kind) {
    setActive(remaining[Math.min(index, remaining.length - 1)])
  }
}

function TabPill(props: {
  icon?: JSX.Element
  label: string
  active: boolean
  onSelect: () => void
  onClose: () => void
}): JSX.Element {
  return (
    <div
      class="flex h-7 shrink-0 items-center gap-0.5 rounded-[6px] ps-2 pe-1 text-[12.5px] font-medium tracking-[-0.02px] transition-colors"
      classList={{
        'border-[0.5px] border-line bg-surface-mute text-foreground': props.active,
        'text-foreground-muted hover:bg-surface-mute/50': !props.active
      }}
    >
      <button
        type="button"
        class="flex min-w-0 items-center gap-1.5"
        aria-current={props.active ? 'page' : undefined}
        onClick={props.onSelect}
      >
        {props.icon}
        <span class="max-w-40 truncate">{props.label}</span>
      </button>
      <IconButton
        label={`Close ${props.label}`}
        class="p-0.5 text-foreground-muted hover:bg-foreground/[0.06] hover:text-foreground"
        onClick={props.onClose}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={12} />
      </IconButton>
    </div>
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
 * The session's right-side region, like opencode's side panel: a flush column
 * divided from the chat by a border, with a 48px tab strip over the open
 * panels. With no tab open it shows the New-tab launcher view.
 */
export function ReviewSidePanel(props: ReviewSidePanelProps): JSX.Element {
  const [width, setWidth] = createSignal(readWidth())
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
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs()))
      localStorage.setItem(ACTIVE_KEY, active() ?? '')
    } catch {
      // Persisting is best-effort.
    }
  })

  // Keep the chat readable when the window shrinks under the stored width.
  createEffect(() => {
    const max = maxWidth()

    if (width() > max) setWidth(max)
  })

  // The launcher rows show the change count, so it needs its own summary query.
  const [summary] = createResource(
    () => (tabs().length === 0 ? props.directory : undefined),
    (directory) => window.api.review.summary(directory)
  )

  const tabIcon = (kind: SideTabKind): JSX.Element => {
    const icon =
      kind === 'review'
        ? FileDiffIcon
        : kind === 'files'
          ? Folder01Icon
          : kind === 'terminal'
            ? TerminalIcon
            : GlobeIcon

    return <HugeiconsIcon icon={icon} size={13} class="text-foreground-muted" />
  }

  return (
    <aside
      ref={panelRef}
      class="flex h-full shrink-0 border-l border-line bg-surface"
      style={{ width: `${width()}px` }}
    >
      <ResizeHandle
        direction="horizontal"
        edge="start"
        size={width()}
        min={MIN_WIDTH}
        max={maxWidth()}
        onResize={setWidth}
        class="w-1 shrink-0 cursor-col-resize bg-transparent"
      />

      <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* The tab strip lines up with the session header, like opencode's. */}
        <div class="flex h-12 shrink-0 items-center gap-1 border-b border-line ps-2 pe-1.5">
          <Show
            when={tabs().length > 0}
            fallback={
              // opencode's New tab: a lone selected tab whose view lists the launchers.
              <TabPill label="New tab" active onSelect={() => undefined} onClose={props.onClose} />
            }
          >
            <For each={tabs()}>
              {(kind) => (
                <TabPill
                  icon={tabIcon(kind)}
                  label={TAB_META[kind].label}
                  active={active() === kind}
                  onSelect={() => setActive(kind)}
                  onClose={() => closeSideTab(kind)}
                />
              )}
            </For>
          </Show>

          <DropdownMenu>
            <DropdownMenuTrigger
              class="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground focus-visible:outline-none"
              aria-label="Add panel tab"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} />
            </DropdownMenuTrigger>

            <DropdownMenuContent class="min-w-40">
              <For each={SIDE_TAB_KINDS.filter((kind) => !tabs().includes(kind))}>
                {(kind) => (
                  <DropdownMenuItem class="text-[12.5px]" onSelect={() => addSideTab(kind)}>
                    <HugeiconsIcon
                      icon={
                        kind === 'review'
                          ? FileDiffIcon
                          : kind === 'files'
                            ? Folder01Icon
                            : kind === 'terminal'
                              ? TerminalIcon
                              : GlobeIcon
                      }
                      size={14}
                      class="text-foreground-muted"
                    />
                    {TAB_META[kind].label}
                  </DropdownMenuItem>
                )}
              </For>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Open panels stay mounted (hidden) so terminals and previews keep their state, like opencode's side region. */}
        <Show
          when={tabs().length > 0 && active()}
          fallback={
            <ReviewLaunchers
              filesChanged={summary()?.files.length}
              onOpenReview={() => addSideTab('review')}
              onOpenFiles={() => addSideTab('files')}
              onOpenTerminal={() => addSideTab('terminal')}
              onOpenBrowser={() => addSideTab('browser')}
            />
          }
        >
          <div class="relative min-h-0 min-w-0 flex-1">
            <For each={tabs()}>
              {(kind) => (
                <div
                  class="absolute inset-0 flex min-h-0 flex-col"
                  classList={{ hidden: active() !== kind }}
                  data-panel-kind={kind}
                >
                  {kind === 'review' && (
                    <ReviewContent
                      directory={props.directory}
                      refreshKey={props.refreshKey}
                      width={width()}
                    />
                  )}
                  {kind === 'files' && <FilesPanel directory={props.directory} />}
                  {kind === 'terminal' && (
                    <TerminalPanel directory={props.directory} active={active() === 'terminal'} />
                  )}
                  {kind === 'browser' && <BrowserPanel />}
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </aside>
  )
}
