import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  type JSX
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { Portal } from 'solid-js/web'
import { getAppState, setAppState } from '@renderer/lib/app-state'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import FileDiffIcon from '@hugeicons/core-free-icons/FileDiffIcon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import GlobeIcon from '@hugeicons/core-free-icons/GlobeIcon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import TerminalIcon from '@hugeicons/core-free-icons/TerminalIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
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
/** Like opencode's `sessionTabs` layout record: per-session, keyed by session id. */
const SESSION_TABS_KEY = 'yoke.panel.session-tabs'
/** Like opencode's per-session `closed` list in the New tab view. */
const SESSION_CLOSED_KEY = 'yoke.panel.session-closed'
const CLOSED_LIMIT = 30

/** The panel kinds the side region can host, like opencode's built-ins. */
export type SideTabKind = 'review' | 'files' | 'terminal' | 'browser'

const TAB_META: Record<SideTabKind, { label: string }> = {
  review: { label: 'Review' },
  files: { label: 'Files' },
  terminal: { label: 'Terminal' },
  browser: { label: 'Browser' }
}

/** A side tab the user closed, as the New-tab view lists it. */
export type ClosedSideTab = {
  key: SideTabKind
  title: string
  /** When it closed, in milliseconds since the epoch. */
  closed: number
}

type SessionTabState = {
  tabs: SideTabKind[]
  active?: SideTabKind
  /** A New-tab pill exists in the strip, over the active tab. */
  newTab?: boolean
  /** The New-tab view is the selected one; the pane shows the launchers. */
  newTabSelected?: boolean
}

const EMPTY_STATE: SessionTabState = { tabs: [] }

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = getAppState(key)

    if (!stored) return fallback

    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function readWidth(): number {
  try {
    const stored = Number(getAppState(WIDTH_KEY))

    if (Number.isFinite(stored) && stored > 0) {
      return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, stored))
    }
  } catch {
    // Storage can be unavailable; the default still works.
  }

  return DEFAULT_WIDTH
}

/** Each session's open tabs and selected one, persisted by session id like opencode's layout. */
const [sessionTabState, setSessionTabState] = createStore<Record<string, SessionTabState>>(
  readStored(SESSION_TABS_KEY, {} as Record<string, SessionTabState>)
)

/** Each session's recently closed side tabs, newest first. */
const [sessionClosed, setSessionClosed] = createStore<Record<string, ClosedSideTab[]>>(
  readStored(SESSION_CLOSED_KEY, {} as Record<string, ClosedSideTab[]>)
)

// Keep both records in storage, like opencode's persisted layout schema.
createEffect(() => {
  setAppState(SESSION_TABS_KEY, JSON.stringify(sessionTabState))
  setAppState(SESSION_CLOSED_KEY, JSON.stringify(sessionClosed))
})

/** The tab state of one session; reading a missing key falls back to the empty state. */
export function sideStateOf(sessionId: string): SessionTabState {
  const stored = sessionTabState[sessionId]

  if (!stored) return EMPTY_STATE

  return { ...stored, tabs: stored.tabs ?? [] }
}

/** Adds a tab of `kind` (if needed) and selects it, for shortcuts and links. Selecting a real tab ends the New-tab view. */
export function ensureSideTab(sessionId: string, kind: SideTabKind): void {
  setSessionTabState(sessionId, (previous) => {
    const tabs = previous?.tabs ?? []

    return { tabs: tabs.includes(kind) ? tabs : [...tabs, kind], active: kind }
  })
  setSessionTabState(sessionId, { newTab: false, newTabSelected: false })
}

/** Opens a tab from a launcher row. Like opencode: the New-tab view gives way to the chosen panel. */
function addSideTab(sessionId: string, kind: SideTabKind): void {
  ensureSideTab(sessionId, kind)
}

/** Closes one tab; closing the last one returns to the launcher view. The entry lands in Recently closed. */
function closeSideTab(sessionId: string, kind: SideTabKind): void {
  const state = sideStateOf(sessionId)
  const index = state.tabs.indexOf(kind)
  const remaining = state.tabs.filter((tab) => tab !== kind)

  setSessionTabState(sessionId, {
    tabs: remaining,
    active: state.active === kind ? remaining[Math.min(index, remaining.length - 1)] : state.active
  })

  if (remaining.length === 0) setSessionTabState(sessionId, { tabs: [], active: undefined })

  setSessionClosed(sessionId, (previous) => {
    const entry: ClosedSideTab = { key: kind, title: TAB_META[kind].label, closed: Date.now() }

    return [entry, ...(previous ?? []).filter((item) => item.key !== kind)].slice(0, CLOSED_LIMIT)
  })
}

/** Selects a tab of the session from the strip; the New-tab view stops being live. */
function selectSideTab(sessionId: string, kind: SideTabKind): void {
  ensureSideTab(sessionId, kind)
}

/** Opens a New-tab pill over the active tab and shows the launcher view, as opencode's "+" does. */
export function openNewTabView(sessionId: string): void {
  setSessionTabState(sessionId, { ...sideStateOf(sessionId), newTab: true, newTabSelected: true })
}

/** Selects the New-tab pill again without reopening it. */
function selectNewTabView(sessionId: string): void {
  setSessionTabState(sessionId, { ...sideStateOf(sessionId), newTab: true, newTabSelected: true })
}

/** Dismisses the New-tab view. Returns true when no real tab remains (the region closes, like opencode's). */
function dismissNewTabView(sessionId: string): boolean {
  setSessionTabState(sessionId, { ...sideStateOf(sessionId), newTab: false, newTabSelected: false })

  return sideStateOf(sessionId).tabs.length === 0
}

/** Reopens a closed tab (or the newest one) and removes it from the list. */
export function reopenClosedTab(sessionId: string, key?: SideTabKind): void {
  const list = sessionClosed[sessionId] ?? []
  const entry = key ? list.find((item) => item.key === key) : list[0]

  if (!entry) return

  setSessionClosed(
    sessionId,
    list.filter((item) => item !== entry)
  )
  ensureSideTab(sessionId, entry.key)
}

function TabPill(props: {
  icon?: JSX.Element
  label: string
  active: boolean
  onSelect: () => void
  onClose: () => void
  onMenu: (x: number, y: number) => void
}): JSX.Element {
  return (
    <div
      class="flex h-7 shrink-0 items-center gap-0.5 rounded-[6px] ps-2 pe-1 text-[12.5px] font-medium tracking-[-0.02px] transition-colors"
      classList={{
        'border-[0.5px] border-line bg-surface-mute text-foreground': props.active,
        'text-foreground-muted hover:bg-surface-mute/50': !props.active
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        props.onMenu(event.clientX, event.clientY)
      }}
    >
      <button
        type="button"
        class="flex min-w-0 items-center gap-1.5"
        aria-current={props.active ? 'page' : undefined}
        onClick={props.onSelect}
        // Middle-click closes the tab, like opencode's strip.
        onMouseDown={(event) => {
          if (event.button === 1) event.preventDefault()
        }}
        onAuxClick={(event) => {
          if (event.button === 1) {
            event.preventDefault()
            props.onClose()
          }
        }}
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
  /** The session id, which scopes the tabs like opencode's per-session region state. */
  sessionId: string
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

  // Keep the chat readable when the window shrinks under the stored width.
  createEffect(() => {
    const max = maxWidth()

    if (width() > max) setWidth(max)
  })

  // Persist the pane's width across restarts.
  createEffect(() => {
    setAppState(WIDTH_KEY, String(width()))
  })

  const state = () => sideStateOf(props.sessionId)

  // Opening the region on a session with no tabs shows a New-tab view, once
  // per opening and session, like opencode's `starting` memo.
  createEffect(
    on(
      () => props.sessionId,
      (id) => {
        if (!id) return

        const current = sideStateOf(id)

        if (current.tabs.length === 0 && !current.newTab) openNewTabView(id)
      }
    )
  )

  // The right-clicked pill, for the strip's Close / Close others menu.
  const [tabMenu, setTabMenu] = createSignal<{ key: SideTabKind; x: number; y: number }>()

  // Any outside press, scroll, resize or Escape dismisses it.
  createEffect(() => {
    if (!tabMenu()) return

    const dismiss = () => setTabMenu(undefined)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-tab-menu]')) dismiss()
    }
    const onScroll = () => dismiss()

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)

    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    })
  })

  const closeTab = (kind: SideTabKind) => {
    closeSideTab(props.sessionId, kind)

    // Closing the last tab of a session with no New-tab view closes the region, like opencode's `emptied`.
    if (sideStateOf(props.sessionId).tabs.length === 0 && !sideStateOf(props.sessionId).newTab)
      props.onClose()
  }

  // The launcher rows show the change count, so it needs its own summary query.
  const [summary] = createResource(
    () => (state().newTabSelected ? props.directory : undefined),
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
          <For each={state().tabs}>
            {(kind) => (
              <TabPill
                icon={tabIcon(kind)}
                label={TAB_META[kind].label}
                active={!state().newTabSelected && state().active === kind}
                onSelect={() => selectSideTab(props.sessionId, kind)}
                onClose={() => closeTab(kind)}
                onMenu={(x, y) => setTabMenu({ key: kind, x, y })}
              />
            )}
          </For>

          <Show when={state().newTab}>
            <TabPill
              label="New tab"
              active={Boolean(state().newTabSelected)}
              onSelect={() => selectNewTabView(props.sessionId)}
              onClose={() => {
                if (dismissNewTabView(props.sessionId)) props.onClose()
              }}
              onMenu={(x, y) => setTabMenu({ key: 'review', x, y })}
            />
          </Show>

          {/* opencode's "+": it opens a New-tab view listing the launchers, not a menu. */}
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded-[6px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground focus-visible:outline-none"
            aria-label="Add panel tab"
            onClick={() => openNewTabView(props.sessionId)}
          >
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
          </button>
        </div>

        {/* Open panels stay mounted (hidden) so terminals and previews keep their state, like opencode's side region. */}
        <div class="relative min-h-0 min-w-0 flex-1">
          <For each={state().tabs}>
            {(kind) => (
              <div
                class="absolute inset-0 flex min-h-0 flex-col"
                classList={{
                  hidden: state().newTabSelected || state().active !== kind
                }}
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
                  <TerminalPanel
                    directory={props.directory}
                    active={state().active === 'terminal'}
                  />
                )}
                {kind === 'browser' && <BrowserPanel />}
              </div>
            )}
          </For>

          {/* The New-tab view sits over the panels, like opencode's New tab entry. */}
          <Show when={state().newTabSelected}>
            <div
              class="absolute inset-0 flex min-h-0 flex-col bg-surface"
              data-panel-kind="new-tab"
            >
              <ReviewLaunchers
                filesChanged={summary()?.files.length}
                closed={sessionClosed[props.sessionId] ?? []}
                onReopen={(key) => reopenClosedTab(props.sessionId, key)}
                onOpenReview={() => addSideTab(props.sessionId, 'review')}
                onOpenFiles={() => addSideTab(props.sessionId, 'files')}
                onOpenTerminal={() => addSideTab(props.sessionId, 'terminal')}
                onOpenBrowser={() => addSideTab(props.sessionId, 'browser')}
              />
            </div>
          </Show>
        </div>
      </div>

      {/* The strip's tab menu, at the right-clicked position. */}
      <Show when={tabMenu()}>
        {(menu) => (
          <Portal>
            <div
              data-tab-menu
              class="fixed z-50 min-w-40 rounded-[10px] border border-line bg-surface p-1 shadow-lg"
              style={{
                left: `${Math.min(menu().x, window.innerWidth - 170)}px`,
                top: `${Math.min(menu().y, window.innerHeight - 100)}px`
              }}
            >
              <button
                type="button"
                class="flex h-8 w-full items-center rounded-[6px] px-2.5 text-start text-[12.5px] text-foreground hover:bg-surface-mute"
                onClick={() => {
                  // Read the key before clearing: the narrowed Show accessor throws once the menu unmounts.
                  const key = menu().key

                  setTabMenu(undefined)
                  closeTab(key)
                }}
              >
                Close tab
              </button>
              <button
                type="button"
                class="flex h-8 w-full items-center rounded-[6px] px-2.5 text-start text-[12.5px] text-foreground hover:bg-surface-mute disabled:text-foreground-muted disabled:hover:bg-transparent"
                disabled={state().tabs.length <= 1}
                onClick={() => {
                  // Read the key before clearing: the narrowed Show accessor throws once the menu unmounts.
                  const key = menu().key

                  setTabMenu(undefined)

                  for (const kind of [...state().tabs])
                    if (kind !== key) closeSideTab(props.sessionId, kind)
                }}
              >
                Close others
              </button>
            </div>
          </Portal>
        )}
      </Show>
    </aside>
  )
}
