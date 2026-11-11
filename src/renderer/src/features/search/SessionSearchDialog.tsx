import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
  type JSX
} from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import SearchIcon from '@hugeicons/core-free-icons/Search01Icon'
import { Dialog, DialogContent } from '@renderer/components/ui/dialog'
import { closeSearch, searchOpen } from './search-store'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type SessionRow = ProjectWithSessions['sessions'][number]

interface SearchEntry {
  project: ProjectWithSessions
  session: SessionRow
}

/** Recent sessions shown with an empty query, like opencode's palette. */
const RECENT_LIMIT = 10

/** Every session across projects, newest first. */
const flattenSessions = (projects: ProjectWithSessions[]): SearchEntry[] =>
  projects
    .flatMap((project) =>
      (project.sessions as SessionRow[]).map((session) => ({ project, session }))
    )
    .sort((a, b) => (b.session.time_updated ?? 0) - (a.session.time_updated ?? 0))

/**
 * The sidebar's Search palette, like opencode's: an empty query lists recent
 * sessions, typing filters across all projects' session titles and project
 * names, and Enter opens the highlighted one. Arrow keys move the highlight.
 */
export function SessionSearchDialog(): JSX.Element {
  const navigate = useNavigate()

  const [query, setQuery] = createSignal('')
  const [selected, setSelected] = createSignal(0)
  let input: HTMLInputElement | undefined
  let list: HTMLDivElement | undefined

  const [projects] = createResource(() => (window.api ? window.api.projects.list() : []))

  const entries = createMemo(() => {
    const all = flattenSessions(projects() ?? [])
    const q = query().trim().toLowerCase()

    if (!q) return all.slice(0, RECENT_LIMIT)

    return all.filter(({ project, session }) => {
      const haystack = `${session.title} ${project.name}`.toLowerCase()

      return q.split(/\s+/).every((part) => haystack.includes(part))
    })
  })

  // Reset the highlight when the query changes (from the input handler below).

  const pick = (entry: SearchEntry | undefined) => {
    if (!entry) return
    closeSearch()
    navigate(`/sessions/${entry.session.id}`)
  }

  const onInputKeyDown = (event: KeyboardEvent) => {
    const items = entries()
    const count = items.length

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((i) => (count ? (i + 1) % count : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((i) => (count ? (i - 1 + count) % count : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pick(items[selected()])
    }
  }

  // Keep the highlighted row visible while arrowing through the list.
  createEffect(() => {
    const row = list?.children[selected()] as HTMLElement | undefined
    row?.scrollIntoView({ block: 'nearest' })
  })

  // Focus the input when the palette opens.
  createEffect(() => {
    if (searchOpen()) queueMicrotask(() => input?.focus())
  })

  return (
    <Dialog open={searchOpen()} onOpenChange={(open) => !open && closeSearch()}>
      <DialogContent
        disableAnimation
        class="top-[24%] max-w-xl translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-xl p-0 sm:top-[24%]"
      >
        {/*
          Kobalte focuses the first focusable element on open; the input is it.
        */}
        <div class="flex items-center gap-2 border-b border-line px-3">
          <HugeiconsIcon icon={SearchIcon} size={15} class="shrink-0 text-foreground-muted" />
          <input
            ref={input}
            type="text"
            value={query()}
            placeholder="Search sessions…"
            spellcheck={false}
            class="h-11 w-full bg-transparent text-[13.5px] text-foreground placeholder:text-foreground-muted/70 focus:outline-none"
            onInput={(e) => {
              setQuery(e.currentTarget.value)
              setSelected(0)
            }}
            onKeyDown={onInputKeyDown}
          />
        </div>

        <div ref={list} class="max-h-80 overflow-y-auto p-1.5">
          <Show
            when={entries().length > 0}
            fallback={
              <p class="px-3 py-6 text-center text-[12.5px] text-foreground-muted/70">
                No sessions found
              </p>
            }
          >
            <p class="px-2 pb-1 pt-1 text-[11px] font-medium tracking-wide text-foreground-muted/60">
              {query().trim() ? 'Sessions' : 'Recent sessions'}
            </p>
            <For each={entries()}>
              {(entry, index) => (
                <button
                  type="button"
                  class="flex h-9 min-w-0 w-full items-center gap-2 rounded-md px-2 text-left transition-colors"
                  classList={{
                    'bg-surface-mute text-foreground': selected() === index(),
                    'text-foreground-muted hover:bg-foreground/[0.03]': selected() !== index()
                  }}
                  onMouseEnter={() => setSelected(index())}
                  onClick={() => pick(entry)}
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={14}
                    class="shrink-0 text-foreground-muted/70"
                  />
                  <span class="truncate text-[13px]">{entry.session.title || 'New session'}</span>
                  <span class="ml-auto shrink-0 pl-2 text-[11.5px] text-foreground-muted/60">
                    {entry.project.name}
                  </span>
                </button>
              )}
            </For>
          </Show>
        </div>

        {/* The palette footer hint, like opencode's. */}
        <div class="flex items-center gap-3 border-t border-line px-3 py-2 text-[11px] text-foreground-muted/70">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
