import { createEffect, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { projectColor } from '@renderer/features/projects/project-color'
import { pruneSessionTabs, sessionTabs, type SessionTab } from './session-tabs'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type Session = ProjectWithSessions['sessions'][number]

export interface SessionTabsProps {
  projects?: ProjectWithSessions[]
  activeSessionId?: string
  onOpen: (tab: SessionTab) => void
  onClose: (sessionId: string) => void
  onNew: () => void
}

/**
 * Open sessions shown as vertical tabs, mirroring opencode's sidebar tabs.
 * Tabs are navigation state: closing one leaves the session in the project tree.
 */
export function SessionTabs(props: SessionTabsProps): JSX.Element {
  const sessionById = (id: string): Session | undefined => {
    for (const project of props.projects ?? []) {
      const session = project.sessions.find((item) => item.id === id)

      if (session) return session
    }

    return undefined
  }

  // Drop tabs for sessions that were deleted or whose project was removed.
  createEffect(() => {
    const projects = props.projects

    if (!projects) return

    const keep = props.activeSessionId ? new Set([props.activeSessionId]) : new Set<string>()

    pruneSessionTabs(
      new Set(projects.flatMap((project) => project.sessions.map((s) => s.id))),
      keep
    )
  })

  return (
    <section class="flex flex-col">
      <div class="flex items-center justify-between px-1 pb-1 pt-1">
        <span class="text-[13px] font-medium tracking-wide text-foreground-muted">Sessions</span>
        <IconButton label="New session" class="p-1" onClick={props.onNew}>
          <HugeiconsIcon icon={PlusSignIcon} size={15} class="text-foreground-muted" />
        </IconButton>
      </div>

      {/* opencode's vertical tab list: 4px gaps, one 45px two-line row per session. */}
      <div class="flex flex-col gap-1">
        <Show when={sessionTabs().length === 0}>
          <p class="px-2 py-1.5 text-[12px] text-foreground-muted/70">No open sessions</p>
        </Show>

        <For each={sessionTabs()}>
          {(tab) => {
            const session = () => sessionById(tab.id)
            const active = () => props.activeSessionId === tab.id
            const busy = () => session()?.status === 'busy'

            return (
              <div
                class="group/tab relative flex h-[45px] w-full min-w-0 select-none rounded-md transition-colors dark:text-foreground"
                classList={{
                  'bg-surface-mute text-foreground': active(),
                  'text-foreground-secondary hover:bg-foreground/[0.03]': !active()
                }}
              >
                <button
                  type="button"
                  class="grid h-full min-w-0 flex-1 cursor-default grid-cols-[16px_minmax(0,1fr)] content-center gap-x-1.5 rounded-md px-1.5 text-left text-[13px] font-medium focus-visible:outline-none"
                  aria-current={active() ? 'page' : undefined}
                  title={`${tab.title} — ${tab.projectName}`}
                  onClick={() => props.onOpen(tab)}
                >
                  <span
                    class={`col-start-1 row-start-1 mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-semibold ${projectColor(tab.projectId)}`}
                  >
                    {tab.projectName.slice(0, 1).toUpperCase()}
                  </span>

                  <span class="col-start-2 row-start-1 min-w-0 truncate pr-7 leading-4">
                    {tab.title}
                  </span>

                  <span class="col-start-2 row-start-2 min-w-0 truncate text-[12px] font-normal leading-4 text-foreground-muted">
                    {tab.projectName}
                  </span>
                </button>

                {/* Status sits where the close button appears; the hover swap changes instantly. */}
                <span class="pointer-events-none absolute inset-y-0 right-1 grid size-5 place-items-center group-hover/tab:opacity-0">
                  <Show when={busy()}>
                    <span
                      class="size-3 animate-spin rounded-full border-[1.5px] border-line border-t-foreground"
                      aria-label="Session is busy"
                    />
                  </Show>
                </span>

                <IconButton
                  label={`Close ${tab.title}`}
                  class="absolute inset-y-0 right-1 z-10 grid size-5 place-items-center p-0 opacity-0 transition-none focus-visible:opacity-100 group-hover/tab:opacity-100"
                  onClick={() => props.onClose(tab.id)}
                >
                  <HugeiconsIcon icon={XIcon} size={12} class="text-foreground-muted" />
                </IconButton>
              </div>
            )
          }}
        </For>
      </div>
    </section>
  )
}
